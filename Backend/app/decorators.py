"""Role-based access control and audit-log helpers."""
import json
from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app import db
from app.models import AuditLog, User

SUPER_ADMIN = "super_admin"
ROLES = ("super_admin", "chama_admin", "treasurer", "secretary", "member")


def role_required(*allowed_roles):
    """Allow the request only if the JWT user is active and has an allowed role.

    super_admin always passes. Use it under @bp.route and do not add
    @jwt_required: this decorator verifies the JWT itself. On success the
    user is available as flask.g.current_user.

    It checks the role only. Routes that also need membership in a specific
    chama should check that too (see _access in routes/operations.py).
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = db.session.get(User, int(get_jwt_identity()))
            if user is None:
                return jsonify({"error": "User not found"}), 401
            if not user.is_active:
                return jsonify({"error": "Account is inactive"}), 403
            if user.role != SUPER_ADMIN and user.role not in allowed_roles:
                return jsonify({"error": "You do not have permission to do this"}), 403
            g.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _jsonable(values):
    """Make dicts safe for a JSON column (dates, Decimals and so on become strings)."""
    if values is None:
        return None
    return json.loads(json.dumps(values, default=str))


def log_audit(chama_id, user_id, action, table_name, record_id,
              old_values=None, new_values=None):
    """Queue an audit_logs row. It does NOT commit.

    Call it right before the commit that saves the action, so both succeed
    or fail together. For a new record, db.session.flush() first so
    record_id exists. action is one of "create", "update", "delete".
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
