from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import (
    Announcement,
    Meeting,
    MeetingAttendance,
    MeetingMinutes,
    Membership,
    User,
)

operations_bp = Blueprint("operations", __name__)

OFFICIAL_ROLES = ("secretary", "chama_admin")
ATTENDANCE_STATUSES = ("present", "absent", "apology")
MAX_PER_PAGE = 100


def _val(value):
    """Plain string for an enum member or a string column."""
    return getattr(value, "value", value)


def _iso(value):
    return value.isoformat() if value else None


def _access(chama_id, officials_only=False):
    """Check the caller is an active member of the chama.

    Returns (user, error_response). When officials_only is True the caller
    must also be a secretary or chama_admin.
    """
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return None, (jsonify({"error": "User not found or inactive"}), 401)

    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or _val(membership.status) != "active":
        return None, (jsonify({"error": "You are not an active member of this chama"}), 403)

    if officials_only and _val(user.role) not in OFFICIAL_ROLES:
        return None, (jsonify({"error": "Only the secretary or chama admin can do this"}), 403)
    return user, None


def _parse_datetime(value):
    """ISO 8601 string -> naive UTC datetime, or None."""
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _read_text(data, key, errors, max_len=None, required=False):
    value = data.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            errors[key] = f"{key} is required"
        return None
    if not isinstance(value, str):
        errors[key] = f"{key} must be text"
        return None
    value = value.strip()
    if max_len and len(value) > max_len:
        errors[key] = f"{key} must be at most {max_len} characters"
        return None
    return value


def _paginate(query, serializer):
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    page = max(page, 1)
    per_page = min(max(per_page, 1), MAX_PER_PAGE)

    result = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify(
        {
            "items": [serializer(item) for item in result.items],
            "page": result.page,
            "per_page": result.per_page,
            "total": result.total,
            "pages": result.pages,
        }
    ), 200


def _serialize_meeting(m):
    return {
        "id": m.id,
        "chama_id": m.chama_id,
        "title": m.title,
        "meeting_date": _iso(m.meeting_date),
        "venue": m.venue,
        "agenda": m.agenda,
        "created_by": m.created_by,
    }


def _serialize_minutes(m):
    return {
        "id": m.id,
        "meeting_id": m.meeting_id,
        "minutes": m.minutes,
        "file_url": m.file_url,
        "recorded_by": m.recorded_by,
        "created_at": _iso(m.created_at),
    }


def _serialize_attendance(record, membership=None, user=None):
    payload = {
        "id": record.id,
        "meeting_id": record.meeting_id,
        "membership_id": record.membership_id,
        "status": _val(record.status),
    }
    if membership is not None:
        payload["member_number"] = membership.member_number
    if user is not None:
        payload["full_name"] = user.full_name
    return payload


def _serialize_announcement(a):
    return {
        "id": a.id,
        "chama_id": a.chama_id,
        "title": a.title,
        "content": a.content,
        "image_url": a.image_url,
        "created_by": a.created_by,
        "created_at": _iso(a.created_at),
    }


def _get_meeting_or_404(meeting_id):
    meeting = db.session.get(Meeting, meeting_id)
    if meeting is None:
        return None, (jsonify({"error": "Meeting not found"}), 404)
    return meeting, None


@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["POST"])
@jwt_required()
def create_meeting(chama_id):
    user, error = _access(chama_id, officials_only=True)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    errors = {}
    title = _read_text(data, "title", errors, max_len=200, required=True)
    venue = _read_text(data, "venue", errors, max_len=150)
    agenda = _read_text(data, "agenda", errors)
    meeting_date = _parse_datetime(data.get("meeting_date"))
    if meeting_date is None:
        errors["meeting_date"] = "A valid ISO 8601 date and time is required"
    if errors:
        return jsonify({"errors": errors}), 400

    meeting = Meeting(
        chama_id=chama_id,
        title=title,
        meeting_date=meeting_date,
        venue=venue,
        agenda=agenda,
        created_by=user.id,
    )
    db.session.add(meeting)
    db.session.commit()
    return jsonify(_serialize_meeting(meeting)), 201


@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["GET"])
@jwt_required()
def list_meetings(chama_id):
    _, error = _access(chama_id)
    if error:
        return error

    query = Meeting.query.filter_by(chama_id=chama_id).order_by(Meeting.meeting_date.desc())
    return _paginate(query, _serialize_meeting)


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["POST"])
@jwt_required()
def create_minutes(meeting_id):
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error
    user, error = _access(meeting.chama_id, officials_only=True)
    if error:
        return error

    if MeetingMinutes.query.filter_by(meeting_id=meeting.id).first() is not None:
        return jsonify({"error": "Minutes already exist for this meeting"}), 409

    data = request.get_json(silent=True) or {}
    errors = {}
    text = _read_text(data, "minutes", errors, required=True)
    file_url = _read_text(data, "file_url", errors, max_len=500)
    if errors:
        return jsonify({"errors": errors}), 400

    minutes = MeetingMinutes(
        meeting_id=meeting.id,
        recorded_by=user.id,
        minutes=text,
        file_url=file_url,
    )
    db.session.add(minutes)
    db.session.commit()
    return jsonify(_serialize_minutes(minutes)), 201


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["GET"])
@jwt_required()
def get_minutes(meeting_id):
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error
    _, error = _access(meeting.chama_id)
    if error:
        return error

    minutes = MeetingMinutes.query.filter_by(meeting_id=meeting.id).first()
    if minutes is None:
        return jsonify({"error": "No minutes recorded for this meeting"}), 404
    return jsonify(_serialize_minutes(minutes)), 200


@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["POST"])
@jwt_required()
def record_attendance(meeting_id):
    """Record attendance for one member, or many via {"records": [...]}.

    Recording the same member again updates their status (one row per
    meeting and member).
    """
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error
    _, error = _access(meeting.chama_id, officials_only=True)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    entries = data.get("records") if isinstance(data.get("records"), list) else [data]
    if not entries:
        return jsonify({"error": "No attendance records supplied"}), 400

    errors = {}
    cleaned = []
    for index, entry in enumerate(entries):
        problems = {}
        entry = entry if isinstance(entry, dict) else {}
        membership_id = entry.get("membership_id")
        status = entry.get("status")

        if not isinstance(membership_id, int) or isinstance(membership_id, bool):
            problems["membership_id"] = "membership_id must be an integer"
        else:
            membership = db.session.get(Membership, membership_id)
            if membership is None or membership.chama_id != meeting.chama_id:
                problems["membership_id"] = "Member does not belong to this chama"

        if status not in ATTENDANCE_STATUSES:
            problems["status"] = f"status must be one of: {', '.join(ATTENDANCE_STATUSES)}"

        if problems:
            errors[str(index)] = problems
        else:
            cleaned.append((membership_id, status))

    if errors:
        return jsonify({"errors": errors}), 400

    saved = []
    for membership_id, status in cleaned:
        record = MeetingAttendance.query.filter_by(
            meeting_id=meeting.id, membership_id=membership_id
        ).first()
        if record is None:
            record = MeetingAttendance(
                meeting_id=meeting.id, membership_id=membership_id, status=status
            )
            db.session.add(record)
        else:
            record.status = status
        saved.append(record)

    db.session.commit()
    return jsonify({"items": [_serialize_attendance(r) for r in saved]}), 201


@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["GET"])
@jwt_required()
def get_attendance(meeting_id):
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error
    _, error = _access(meeting.chama_id)
    if error:
        return error

    rows = (
        db.session.query(MeetingAttendance, Membership, User)
        .join(Membership, MeetingAttendance.membership_id == Membership.id)
        .join(User, Membership.user_id == User.id)
        .filter(MeetingAttendance.meeting_id == meeting.id)
        .order_by(Membership.member_number)
        .all()
    )
    return jsonify(
        {"items": [_serialize_attendance(rec, mem, usr) for rec, mem, usr in rows]}
    ), 200


@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["POST"])
@jwt_required()
def create_announcement(chama_id):
    user, error = _access(chama_id, officials_only=True)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    errors = {}
    title = _read_text(data, "title", errors, max_len=200, required=True)
    content = _read_text(data, "content", errors, required=True)
    image_url = _read_text(data, "image_url", errors, max_len=500)
    if errors:
        return jsonify({"errors": errors}), 400

    announcement = Announcement(
        chama_id=chama_id,
        created_by=user.id,
        title=title,
        content=content,
        image_url=image_url,
    )
    db.session.add(announcement)
    db.session.commit()
    return jsonify(_serialize_announcement(announcement)), 201


@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["GET"])
@jwt_required()
def list_announcements(chama_id):
    _, error = _access(chama_id)
    if error:
        return error

    query = Announcement.query.filter_by(chama_id=chama_id).order_by(
        Announcement.created_at.desc()
    )
    return _paginate(query, _serialize_announcement)
