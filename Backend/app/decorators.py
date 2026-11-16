from functools import wraps
import json

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app import db
from app.models import AuditLog, User

SUPER_ADMIN = "super_admin"
ROLES = ("super_admin", "chama_admin", "treasurer", "secretary", "member")


def role_required(*allowed_roles):
    """
    Decorator that restricts a route to active users whose 'User.role' is in 'allowed_roles'.

    Usage:
        @finance_bp.route("/api/chamas/<int:chama_id>/contributions", methods=["POST"])
        @role_required("treasurer", "chama_admin")
        def create_contribution(chama_id):
            ...

    Notes:
      - Do NOT stack '@jwt_required()' alongside '@role_required(...)'; this decorator
        calls 'verify_jwt_in_request()' internally.
      - Users with role 'super_admin' automatically pass all role checks.
      - Routes scoped to a specific Chama should also verify active membership in that Chama.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # 1. Verify the stateless JWT Bearer token in the Authorization header
            verify_jwt_in_request()

            # 2. Parse the JWT identity ('sub') and fetch the corresponding User record
            try:
                raw_identity = get_jwt_identity()
                user_id = int(raw_identity)
            except (TypeError, ValueError):
                return jsonify({
                    "error": "Your authentication token contains an invalid user identifier. Please log in again."
                }), 401

            try:
                user = db.session.get(User, user_id)
            except Exception as exc:
                return jsonify({
                    "error": "We encountered a server error while verifying your account permissions. Please try again.",
                    "details": str(exc),
                }), 500

            # 3. Ensure the account exists and has not been suspended/deactivated
            if user is None:
                return jsonify({
                    "error": "Your user account could not be found. Please log in again."
                }), 401

            if not user.is_active:
                return jsonify({
                    "error": "Your account has been deactivated. Please contact your Chama Admin or platform support."
                }), 403

            # 4. Enforce role-based authorization (with global bypass for 'super_admin')
            if user.role != SUPER_ADMIN and user.role not in allowed_roles:
                allowed_list = ", ".join(allowed_roles)
                return jsonify({
                    "error": f"Access denied. This action requires one of the following roles: {allowed_list}."
                }), 403

            # 5. Expose the authenticated User object on Flask's request-scoped 'g' context
            g.current_user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def _jsonable(values):
    """
    Safely convert Python dictionaries containing Decimal, date, or datetime objects
    into JSON-serializable primitives before storing them in 'AuditLog.old_values' or
    'AuditLog.new_values'.
    """
    if values is None:
        return None
    return json.loads(json.dumps(values, default=str))


def log_audit(
    chama_id,
    user_id,
    action,
    table_name,
    record_id,
    old_values=None,
    new_values=None,
):
    """
    Queue a new row in the 'audit_logs' table matching all schema attributes:
      - chama_id   : ForeignKey('chamas.id') — nullable for platform-level super_admin actions
      - user_id    : ForeignKey('users.id') — ID of the user performing the action
      - action     : String(100) — e.g. 'create', 'update', or 'delete'
      - table_name : String(100) — target database table name (e.g. 'contributions', 'loans')
      - record_id  : Integer — primary key of the affected record (call db.session.flush() first on inserts)
      - old_values : JSON — dictionary of field values prior to an update/delete (optional)
      - new_values : JSON — dictionary of field values after a create/update (optional)

    Important: This helper adds the AuditLog entry to the session without calling commit(),
    so the calling route commits both the primary database change and the audit log atomically.
    """
    entry = AuditLog(
        chama_id=chama_id,
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_values=_jsonable(old_values),
        new_values=_jsonable(new_values),
    )
    db.session.add(entry)
    return entry
