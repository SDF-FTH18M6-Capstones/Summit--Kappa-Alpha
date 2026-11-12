from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app.models import (
    Chama,
    JoinRequest,
    Membership,
    Project,
    User,
    db,
)
from app.schemas import JoinRequestSchema, ProjectSchema

chamas_bp = Blueprint("chamas", __name__, url_prefix="/api")

join_request_schema = JoinRequestSchema()
project_schema = ProjectSchema()

ADMIN_ROLES = ("chama_admin", "super_admin")
VALID_MEMBER_ROLES = ("chama_admin", "treasurer", "secretary", "member")
VALID_MEMBERSHIP_STATUSES = ("pending", "active", "suspended", "exited")
MAX_PER_PAGE = 100


@chamas_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({"errors": err.messages}), 400


def _paginate(query):
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 10, type=int), 1), MAX_PER_PAGE)
    result = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [item.to_dict() for item in result.items],
        "total": result.total,
        "pages": result.pages,
        "current_page": result.page,
        "per_page": result.per_page,
    }), 200


def _access(chama_id, admin_only=False):
    """Verify caller is an active member of the Chama (or super_admin).
    When admin_only=True, caller must be chama_admin or super_admin.
    """
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return None, (jsonify({"error": "User not found or inactive."}), 401)

    if user.role == "super_admin":
        return user, None

    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or membership.status != "active":
        return None, (jsonify({"error": "You are not an active member of this Chama."}), 403)

    if admin_only and user.role not in ADMIN_ROLES:
        return None, (jsonify({"error": "Only the Chama Admin can perform this action."}), 403)

    return user, None


# ==========================================
# 1. PUBLIC CHAMA DISCOVERY & PROFILE (Unauthenticated)
# ==========================================

@chamas_bp.route("/chamas", methods=["GET"])
def list_chamas():
    """Public list of all registered Chamas for landing page & join selector."""
    search = request.args.get("search", "", type=str).strip()
    query = Chama.query

    if search:
        query = query.filter(Chama.name.ilike(f"%{search}%"))

    query = query.order_by(Chama.created_at.desc())
    return _paginate(query)


@chamas_bp.route("/chamas/<string:slug>/public", methods=["GET"])
def get_public_chama_profile(slug):
    """Public Chama profile, officials list, and public projects by slug."""
    chama = Chama.query.filter_by(slug=slug).first()
    if chama is None:
        return jsonify({"error": "Chama not found."}), 404

    officials_rows = (
        db.session.query(Membership, User)
        .join(User, Membership.user_id == User.id)
        .filter(
            Membership.chama_id == chama.id,
            Membership.status == "active",
            User.role.in_(("chama_admin", "treasurer", "secretary")),
        )
        .all()
    )

    officials = [
        {
            "membership_id": mem.id,
            "full_name": usr.full_name,
            "role": usr.role,
            "profile_image_url": usr.profile_image_url,
        }
        for mem, usr in officials_rows
    ]

    public_projects = (
        Project.query.filter_by(chama_id=chama.id, is_public=True)
        .order_by(Project.created_at.desc())
        .all()
    )

    return jsonify({
        "chama": chama.to_dict(),
        "officials": officials,
        "projects": [p.to_dict() for p in public_projects],
    }), 200


# ==========================================
# 2. CHAMA PROJECTS (Create & List)
# ==========================================

@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["POST"])
@jwt_required()
def create_project(chama_id):
    db.get_or_404(Chama, chama_id)
    user, error = _access(chama_id, admin_only=True)
    if error:
        return error

    data = project_schema.load(request.get_json(silent=True) or {})

    try:
        project = Project(
            chama_id=chama_id,
            created_by=user.id,
            **data
        )
        db.session.add(project)
        db.session.commit()
        return jsonify({
            "message": "Project created successfully.",
            "project": project.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["GET"])
def list_projects(chama_id):
    db.get_or_404(Chama, chama_id)
    public_only = request.args.get("public_only", "false").lower() == "true"

    query = Project.query.filter_by(chama_id=chama_id)
    if public_only:
        query = query.filter_by(is_public=True)

    query = query.order_by(Project.created_at.desc())
    return _paginate(query)


# ==========================================
# 3. JOIN REQUESTS (Submit, List & Review)
# ==========================================

@chamas_bp.route("/chamas/<int:chama_id>/join-requests", methods=["POST"])
def submit_join_request(chama_id):
    """Unauthenticated visitor submits an application to join a Chama."""
    db.get_or_404(Chama, chama_id)
    data = join_request_schema.load(request.get_json(silent=True) or {})

    existing_pending = JoinRequest.query.filter_by(
        chama_id=chama_id,
        email=data["email"].strip().lower(),
        status="pending",
    ).first()
    if existing_pending:
        return jsonify({"error": "You already have a pending join request for this Chama."}), 409

    try:
        join_req = JoinRequest(
            chama_id=chama_id,
            full_name=data["full_name"].strip(),
            email=data["email"].strip().lower(),
            phone_number=data["phone_number"].strip(),
            message=data.get("message"),
            status="pending",
        )
        db.session.add(join_req)
        db.session.commit()
        return jsonify({
            "message": "Join request submitted successfully. Awaiting Chama Admin approval.",
            "join_request": join_req.to_dict(),
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@chamas_bp.route("/chamas/<int:chama_id>/join-requests", methods=["GET"])
@jwt_required()
def list_join_requests(chama_id):
    db.get_or_404(Chama, chama_id)
    _, error = _access(chama_id, admin_only=True)
    if error:
        return error

    status_filter = request.args.get("status", type=str)
    query = JoinRequest.query.filter_by(chama_id=chama_id)

    if status_filter in ("pending", "approved", "rejected"):
        query = query.filter_by(status=status_filter)

    query = query.order_by(JoinRequest.created_at.desc())
    return _paginate(query)


@chamas_bp.route("/join-requests/<int:req_id>", methods=["PATCH"])
@jwt_required()
def review_join_request(req_id):
    join_req = db.get_or_404(JoinRequest, req_id)
    user, error = _access(join_req.chama_id, admin_only=True)
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    decision = payload.get("status")
    if decision not in ("approved", "rejected"):
        return jsonify({"error": "Status must be 'approved' or 'rejected'."}), 400

    join_req.status = decision
    join_req.reviewed_by = user.id
    join_req.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.session.commit()
    return jsonify({
        "message": f"Join request {decision}.",
        "join_request": join_req.to_dict(),
    }), 200


# ==========================================
# 4. MEMBERSHIPS & ROLE ASSIGNMENT
# ==========================================

@chamas_bp.route("/chamas/<int:chama_id>/memberships", methods=["GET"])
@jwt_required()
def list_memberships(chama_id):
    db.get_or_404(Chama, chama_id)
    _, error = _access(chama_id, admin_only=False)
    if error:
        return error

    status_filter = request.args.get("status", type=str)
    query = Membership.query.filter_by(chama_id=chama_id)

    if status_filter in VALID_MEMBERSHIP_STATUSES:
        query = query.filter_by(status=status_filter)

    query = query.order_by(Membership.member_number.asc())
    return _paginate(query)


@chamas_bp.route("/memberships/<int:membership_id>", methods=["PATCH"])
@jwt_required()
def update_membership_and_role(membership_id):
    """Allows Chama Admin to update membership status or assign user role."""
    membership = db.get_or_404(Membership, membership_id)
    _, error = _access(membership.chama_id, admin_only=True)
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")
    new_role = payload.get("role")

    if not new_status and not new_role:
        return jsonify({"error": "Provide 'status' or 'role' to update."}), 400

    if new_status:
        if new_status not in VALID_MEMBERSHIP_STATUSES:
            return jsonify({"error": f"Status must be one of: {', '.join(VALID_MEMBERSHIP_STATUSES)}"}), 400
        membership.status = new_status
        if new_status == "active" and membership.joined_at is None:
            membership.joined_at = datetime.now(timezone.utc).date()

    if new_role:
        if new_role not in VALID_MEMBER_ROLES:
            return jsonify({"error": f"Role must be one of: {', '.join(VALID_MEMBER_ROLES)}"}), 400
        if membership.user:
            membership.user.role = new_role

    db.session.commit()
    return jsonify({
        "message": "Membership updated successfully.",
        "membership": membership.to_dict(),
    }), 200
