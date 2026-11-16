from datetime import datetime, timezone

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.decorators import SUPER_ADMIN, log_audit, role_required
from app.models import (
    AuditLog,
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

ALL_CHAMA_ROLES = ("member", "secretary", "treasurer", "chama_admin")
CHAMA_ADMIN_ROLES = ("chama_admin",)
VALID_MEMBER_ROLES = ("chama_admin", "treasurer", "secretary", "member")
VALID_MEMBERSHIP_STATUSES = ("pending", "active", "suspended", "exited")
MAX_PER_PAGE = 100


@chamas_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    """Return clear field-level validation feedback whenever Marshmallow rejects a payload."""
    return jsonify({
        "error": "Please check the highlighted form fields and try again.",
        "errors": err.messages,
    }), 400


# ==============================================================================
# HELPER UTILITIES
# ==============================================================================

def _utc_now():
    """Return the current UTC timestamp as a naive datetime for consistent SQLite3 storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _paginate(query):
    """Paginate a SQLAlchemy query cleanly using ?page= and ?per_page= query parameters."""
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


def _verify_chama_membership(chama_id):
    """
    Confirm that g.current_user is either a super_admin or an active member of the Chama.
    """
    user = g.current_user
    if user.role == SUPER_ADMIN:
        return None

    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or membership.status != "active":
        return jsonify({
            "error": "Access denied. You must be an active member of this Chama to perform this action."
        }), 403

    return None


# ==============================================================================
# 1. PUBLIC CHAMA DISCOVERY & PROFILE (Unauthenticated)
# ==============================================================================

@chamas_bp.route("/chamas", methods=["GET"])
def list_chamas():
    """Return a searchable, paginated list of all registered Chamas for public visitors."""
    try:
        search = request.args.get("search", "", type=str).strip()
        query = Chama.query

        if search:
            query = query.filter(Chama.name.ilike(f"%{search}%"))

        query = query.order_by(Chama.created_at.desc())
        return _paginate(query)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the directory of Chamas right now due to a server error.",
            "details": str(exc),
        }), 500


@chamas_bp.route("/chamas/<string:slug>/public", methods=["GET"])
def get_public_chama_profile(slug):
    """Return a Chama's public profile, active officials, and public projects by slug."""
    try:
        chama = Chama.query.filter_by(slug=slug).first()
        if chama is None:
            return jsonify({
                "error": f"No Chama was found matching '{slug}'. Please verify the link and try again."
            }), 404

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
                "member_number": mem.member_number,
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
    except Exception as exc:
        return jsonify({
            "error": "We encountered a server error while loading this Chama's public profile.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 2. CHAMA PROJECTS (Create & List)
# ==============================================================================

@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["POST"])
@role_required(*CHAMA_ADMIN_ROLES)
def create_project(chama_id):
    """Allow the Chama Admin to create a new investment project for the Chama."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data = project_schema.load(request.get_json(silent=True) or {})
    user = g.current_user

    try:
        project = Project(
            chama_id=chama_id,
            title=data["title"].strip(),
            description=data.get("description"),
            amount_invested=data.get("amount_invested", 0.0),
            status=data.get("status", "planned"),
            is_public=data.get("is_public", True),
            image_url=data.get("image_url"),
            created_by=user.id,
        )
        db.session.add(project)
        db.session.flush()

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="projects",
            record_id=project.id,
            new_values=project.to_dict(),
        )
        db.session.commit()

        return jsonify({
            "message": "Investment project created successfully.",
            "project": project.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not create the investment project due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["GET"])
def list_projects(chama_id):
    """Return a paginated list of projects for a Chama (filterable via ?public_only=true)."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    try:
        public_only = request.args.get("public_only", "false").lower() == "true"
        query = Project.query.filter_by(chama_id=chama_id)
        if public_only:
            query = query.filter_by(is_public=True)

        query = query.order_by(Project.created_at.desc())
        return _paginate(query)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the projects for this Chama due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 3. VISITOR JOIN REQUESTS (Submit, List & Review)
# ==============================================================================

@chamas_bp.route("/chamas/<int:chama_id>/join-requests", methods=["POST"])
def submit_join_request(chama_id):
    """Allow an unauthenticated visitor to submit a membership application to a Chama."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    data = join_request_schema.load(request.get_json(silent=True) or {})
    clean_email = data["email"].strip().lower()

    existing_pending = JoinRequest.query.filter_by(
        chama_id=chama_id,
        email=clean_email,
        status="pending",
    ).first()
    if existing_pending:
        return jsonify({
            "error": "You already have a pending join request for this Chama. Please await Admin review."
        }), 409

    try:
        join_req = JoinRequest(
            chama_id=chama_id,
            full_name=data["full_name"].strip(),
            email=clean_email,
            phone_number=data["phone_number"].strip(),
            message=data.get("message"),
            status="pending",
            reviewed_by=None,
            reviewed_at=None,
        )
        db.session.add(join_req)
        db.session.commit()
        return jsonify({
            "message": "Your join request has been submitted! The Chama Admin will review your application.",
            "join_request": join_req.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not submit your join request due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@chamas_bp.route("/chamas/<int:chama_id>/join-requests", methods=["GET"])
@role_required(*CHAMA_ADMIN_ROLES)
def list_join_requests(chama_id):
    """Allow the Chama Admin to view join applications for their Chama."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        status_filter = request.args.get("status", type=str)
        query = JoinRequest.query.filter_by(chama_id=chama_id)

        if status_filter in ("pending", "approved", "rejected"):
            query = query.filter_by(status=status_filter)

        query = query.order_by(JoinRequest.created_at.desc())
        return _paginate(query)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the join requests due to a server error.",
            "details": str(exc),
        }), 500


@chamas_bp.route("/join-requests/<int:req_id>", methods=["PATCH"])
@role_required(*CHAMA_ADMIN_ROLES)
def review_join_request(req_id):
    """Allow the Chama Admin to approve or reject a visitor join request."""
    join_req = db.session.get(JoinRequest, req_id)
    if join_req is None:
        return jsonify({"error": f"Join request with ID {req_id} was not found."}), 404

    membership_error = _verify_chama_membership(join_req.chama_id)
    if membership_error:
        return membership_error

    payload = request.get_json(silent=True) or {}
    decision = payload.get("status")
    if decision not in ("approved", "rejected"):
        return jsonify({
            "error": "Invalid decision. Status must be either 'approved' or 'rejected'."
        }), 400

    user = g.current_user

    try:
        old_status = join_req.status
        join_req.status = decision
        join_req.reviewed_by = user.id
        join_req.reviewed_at = _utc_now()

        log_audit(
            chama_id=join_req.chama_id,
            user_id=user.id,
            action="update",
            table_name="join_requests",
            record_id=join_req.id,
            old_values={"status": old_status},
            new_values={"status": decision, "reviewed_by": user.id},
        )
        db.session.commit()
        return jsonify({
            "message": f"Join request has been {decision}.",
            "join_request": join_req.to_dict(),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not update the join request due to a server error. Please try again.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 4. MEMBERSHIPS & ROLE ASSIGNMENT
# ==============================================================================

@chamas_bp.route("/chamas/<int:chama_id>/memberships", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_memberships(chama_id):
    """Return all active or filtered memberships within a Chama."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        status_filter = request.args.get("status", type=str)
        query = Membership.query.filter_by(chama_id=chama_id)

        if status_filter in VALID_MEMBERSHIP_STATUSES:
            query = query.filter_by(status=status_filter)

        query = query.order_by(Membership.member_number.asc())
        return _paginate(query)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the membership list due to a server error.",
            "details": str(exc),
        }), 500


@chamas_bp.route("/memberships/<int:membership_id>", methods=["PATCH"])
@role_required(*CHAMA_ADMIN_ROLES)
def update_membership_and_role(membership_id):
    """Allows the Chama Admin to update membership status or assign a user role."""
    membership = db.session.get(Membership, membership_id)
    if membership is None:
        return jsonify({"error": f"Membership with ID {membership_id} was not found."}), 404

    membership_error = _verify_chama_membership(membership.chama_id)
    if membership_error:
        return membership_error

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status")
    new_role = payload.get("role")

    if not new_status and not new_role:
        return jsonify({"error": "Provide 'status' or 'role' to update."}), 400

    old_values = {
        "status": membership.status,
        "role": membership.user.role if membership.user else None,
    }

    try:
        if new_status:
            if new_status not in VALID_MEMBERSHIP_STATUSES:
                return jsonify({
                    "error": f"Status must be one of: {', '.join(VALID_MEMBERSHIP_STATUSES)}"
                }), 400
            membership.status = new_status
            if new_status == "active" and membership.joined_at is None:
                membership.joined_at = _utc_now()

        if new_role:
            if new_role not in VALID_MEMBER_ROLES:
                return jsonify({
                    "error": f"Role must be one of: {', '.join(VALID_MEMBER_ROLES)}"
                }), 400
            if membership.user:
                membership.user.role = new_role

        new_values = {
            "status": membership.status,
            "role": membership.user.role if membership.user else None,
        }

        log_audit(
            chama_id=membership.chama_id,
            user_id=g.current_user.id,
            action="update",
            table_name="memberships",
            record_id=membership.id,
            old_values=old_values,
            new_values=new_values,
        )
        db.session.commit()
        return jsonify({
            "message": "Membership updated successfully.",
            "membership": membership.to_dict(),
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not update the membership due to a server error. Please try again.",
            "details": str(exc),
        }), 500
