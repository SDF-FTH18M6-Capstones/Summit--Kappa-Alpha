"""
Chama Discovery, Public Profiles, Projects, Join Requests, Memberships & Super-Admin Services.
Contains all database transactions, membership isolation checks, and audit logging.
"""

from datetime import datetime, timezone
import os

from app.auth.services import _send_email
from app.models.models import (
    AuditLog,
    Chama,
    JoinRequest,
    Membership,
    Project,
    User,
    db,
)
from app.utils.decorators import SUPER_ADMIN, log_audit
from app.utils.exceptions import (
    AppError,
    escape_like,
    handle_db_exception,
    require_str,
    validate_email,
)

VALID_MEMBER_ROLES = ("chama_admin", "treasurer", "secretary", "member")
VALID_MEMBERSHIP_STATUSES = ("pending", "active", "suspended", "exited")
MAX_PER_PAGE = 100


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _paginate_query(query, page=1, per_page=10):
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 10), 1), MAX_PER_PAGE)
    result = query.paginate(page=safe_page, per_page=safe_per_page, error_out=False)
    return {
        "items": [item.to_dict() for item in result.items],
        "total": result.total,
        "pages": result.pages,
        "current_page": result.page,
        "per_page": result.per_page,
    }


def _assert_chama_exists(chama_id):
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        raise AppError(f"Chama with ID {chama_id} was not found.", 404)
    return chama


def _assert_active_member(user, chama_id):
    if user.role == SUPER_ADMIN:
        return
    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or membership.status != "active":
        raise AppError(
            "Access denied. You must be an active member of this Chama to perform this action.",
            403,
        )


def list_chamas_service(search="", page=1, per_page=10):
    query = Chama.query
    if isinstance(search, str) and search.strip():
        safe_term = escape_like(search.strip())
        query = query.filter(Chama.name.ilike(f"%{safe_term}%", escape="\\"))
    query = query.order_by(Chama.created_at.desc())
    return _paginate_query(query, page, per_page)


def get_public_chama_profile_service(slug):
    if not isinstance(slug, str) or not slug.strip():
        raise AppError("Invalid Chama identifier.", 400)

    chama = Chama.query.filter_by(slug=slug.strip().lower()).first()
    if chama is None:
        raise AppError(f"No Chama was found matching '{slug}'. Please verify the link and try again.", 404)

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

    return {
        "chama": chama.to_dict(),
        "officials": officials,
        "projects": [p.to_dict() for p in public_projects],
    }


def update_chama_settings_service(chama_id, user, data):
    chama = _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    if not data:
        raise AppError("Please provide at least one field to update (description, location, constitution, or logo_url).", 400)

    try:
        old_values = {
            "description": chama.description,
            "location": chama.location,
            "constitution": chama.constitution,
            "logo_url": chama.logo_url,
        }
        for field in ("description", "location", "constitution", "logo_url"):
            if field in data:
                setattr(chama, field, data[field])

        new_values = {
            "description": chama.description,
            "location": chama.location,
            "constitution": chama.constitution,
            "logo_url": chama.logo_url,
        }
        log_audit(chama.id, user.id, "update", "chamas", chama.id, old_values=old_values, new_values=new_values)
        db.session.commit()
        return {"message": "Chama profile updated successfully.", "chama": chama.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not update the Chama profile. Please try again.")


def create_project_service(chama_id, user, data):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

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
        log_audit(chama_id, user.id, "create", "projects", project.id, new_values=project.to_dict())
        db.session.commit()
        return {"message": "Investment project created successfully.", "project": project.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not create the investment project. Please try again.")


def list_projects_service(chama_id, public_only=False, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    query = Project.query.filter_by(chama_id=chama_id)
    if public_only:
        query = query.filter_by(is_public=True)
    query = query.order_by(Project.created_at.desc())
    return _paginate_query(query, page, per_page)


def submit_join_request_service(chama_id, data):
    _assert_chama_exists(chama_id)
    clean_email = validate_email(data.get("email"))

    existing_pending = JoinRequest.query.filter_by(
        chama_id=chama_id, email=clean_email, status="pending"
    ).first()
    if existing_pending:
        raise AppError("You already have a pending join request for this Chama. Please await Admin review.", 409)

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
        return {
            "message": "Your join request has been submitted! The Chama Admin will review your application.",
            "join_request": join_req.to_dict(),
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not submit your join request. Please try again.")


def list_join_requests_service(chama_id, user, status_filter=None, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)

    query = JoinRequest.query.filter_by(chama_id=chama_id)
    if status_filter in ("pending", "approved", "rejected"):
        query = query.filter_by(status=status_filter)
    query = query.order_by(JoinRequest.created_at.desc())
    return _paginate_query(query, page, per_page)


def review_join_request_service(req_id, user, payload):
    join_req = db.session.get(JoinRequest, req_id)
    if join_req is None:
        raise AppError(f"Join request with ID {req_id} was not found.", 404)

    _assert_active_member(user, join_req.chama_id)
    decision = require_str(payload, "status", "Status", required=True)
    if decision not in ("approved", "rejected"):
        raise AppError("Invalid decision. Status must be either 'approved' or 'rejected'.", 400)

    chama = db.session.get(Chama, join_req.chama_id)
    chama_name = chama.name if chama else "Summit Chama"

    try:
        old_status = join_req.status
        now = _utc_now()
        join_req.status = decision
        join_req.reviewed_by = user.id
        join_req.reviewed_at = now

        existing_user = User.query.filter_by(email=join_req.email).first()
        if decision == "approved" and existing_user:
            membership = Membership.query.filter_by(
                user_id=existing_user.id, chama_id=join_req.chama_id
            ).first()
            if membership and membership.status == "pending":
                membership.status = "active"
                if membership.joined_at is None:
                    membership.joined_at = now

        log_audit(
            join_req.chama_id,
            user.id,
            "update",
            "join_requests",
            join_req.id,
            old_values={"status": old_status},
            new_values={"status": decision, "reviewed_by": user.id},
        )
        db.session.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        if decision == "approved":
            subject = f"Welcome to {chama_name} — Join Request Approved"
            html_body = (
                f"<p>Hello <strong>{join_req.full_name}</strong>,</p>"
                f"<p>Your request to join <strong>{chama_name}</strong> has been approved! "
                f"Log in or register here: <a href='{frontend_url}/login'>{frontend_url}/login</a></p>"
            )
        else:
            subject = f"Update on Your Join Request to {chama_name}"
            html_body = (
                f"<p>Hello <strong>{join_req.full_name}</strong>,</p>"
                f"<p>Thank you for your interest in <strong>{chama_name}</strong>. "
                "Unfortunately, your request was not approved at this time."
            )
        _send_email(join_req.email, subject, html_body)
        return {"message": f"Join request has been {decision}.", "join_request": join_req.to_dict()}
    except AppError:
        db.session.rollback()
        raise
    except Exception as exc:
        handle_db_exception(db, exc, "We could not update the join request. Please try again.")


def list_memberships_service(chama_id, user, status_filter=None, page=1, per_page=10):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    query = Membership.query.filter_by(chama_id=chama_id)
    if status_filter in VALID_MEMBERSHIP_STATUSES:
        query = query.filter_by(status=status_filter)
    query = query.order_by(Membership.member_number.asc())
    return _paginate_query(query, page, per_page)


def update_membership_service(membership_id, user, payload):
    membership = db.session.get(Membership, membership_id)
    if membership is None:
        raise AppError(f"Membership with ID {membership_id} was not found.", 404)
    _assert_active_member(user, membership.chama_id)
    new_status = require_str(payload, "status", "Status", required=False)
    new_role = require_str(payload, "role", "Role", required=False)
    if not new_status and not new_role:
        raise AppError("Please provide either a new 'status' or a new 'role' to update.", 400)
    old_values = {
        "status": membership.status,
        "role": membership.user.role if membership.user else None,
    }
    try:
        if new_status:
            if new_status not in VALID_MEMBERSHIP_STATUSES:
                raise AppError(f"Status must be one of: {', '.join(VALID_MEMBERSHIP_STATUSES)}.", 400)
            membership.status = new_status
            if new_status == "active" and membership.joined_at is None:
                membership.joined_at = _utc_now()
        if new_role:
            if new_role not in VALID_MEMBER_ROLES:
                raise AppError(f"Role must be one of: {', '.join(VALID_MEMBER_ROLES)}.", 400)
            if membership.user:
                membership.user.role = new_role
        new_values = {
            "status": membership.status,
            "role": membership.user.role if membership.user else None,
        }
        log_audit(membership.chama_id, user.id, "update", "memberships", membership.id, old_values=old_values, new_values=new_values)
        db.session.commit()
        return {"message": "Membership updated successfully.", "membership": membership.to_dict()}
    except AppError:
        db.session.rollback()
        raise
    except Exception as exc:
        handle_db_exception(db, exc, "We could not update the membership record. Please try again.")


def super_admin_list_users_service(page=1, per_page=10):
    query = User.query.order_by(User.created_at.desc())
    return _paginate_query(query, page, per_page)


def super_admin_toggle_user_service(user_id, admin_user, payload):
    target_user = db.session.get(User, user_id)
    if target_user is None:
        raise AppError(f"User with ID {user_id} was not found.", 404)
    if not isinstance(payload, dict) or not isinstance(payload.get("is_active"), bool):
        raise AppError("Please provide a boolean 'is_active' field (true or false).", 400)
    try:
        old_active = target_user.is_active
        target_user.is_active = payload["is_active"]
        log_audit(
            None,
            admin_user.id,
            "update",
            "users",
            target_user.id,
            old_values={"is_active": old_active},
            new_values={"is_active": target_user.is_active},
        )
        db.session.commit()
        state_label = "activated" if target_user.is_active else "suspended"
        return {"message": f"User account has been {state_label} successfully.", "user": target_user.to_dict()}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not update the user's account status. Please try again.")


def super_admin_list_audit_logs_service(page=1, per_page=10):
    query = AuditLog.query.order_by(AuditLog.created_at.desc())
    return _paginate_query(query, page, per_page)