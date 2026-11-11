from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app import db
from app.models import Announcement, Meeting, MeetingMinutes, Membership, User

operations_bp = Blueprint("operations", __name__)

OFFICIAL_ROLES = ("secretary", "chama_admin")


# ------------------------------------------------------------------ helpers

def _val(value):
    """Return the plain string for an enum member or a string column."""
    return getattr(value, "value", value)


def _context():
    """Resolve the current user and their active membership.

    The chama is the user's only active membership, or the one named by the
    optional ?chama_id= query parameter. Returns (user, membership, error).
    """
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None or not user.is_active:
        return None, None, (jsonify({"error": "User not found or inactive"}), 401)

    query = Membership.query.filter_by(user_id=user.id)
    chama_id = request.args.get("chama_id", type=int)
    if chama_id is not None:
        query = query.filter_by(chama_id=chama_id)

    active = [m for m in query.all() if _val(m.status) == "active"]
    if not active:
        return None, None, (
            jsonify({"error": "You are not an active member of this chama"}),
            403,
        )
    return user, active[0], None


def _require_official(user):
    if _val(user.role) not in OFFICIAL_ROLES:
        return jsonify({"error": "Only the secretary or chama admin can do this"}), 403
    return None


def _parse_datetime(value):
    """Parse an ISO 8601 string into a naive UTC datetime, or None."""
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
    """Read a stripped string field. Records a problem in `errors`."""
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


def _iso(value):
    return value.isoformat() if value else None


def _serialize_minutes(minutes):
    if minutes is None:
        return None
    return {
        "id": minutes.id,
        "meeting_id": minutes.meeting_id,
        "minutes": minutes.minutes,
        "file_url": minutes.file_url,
        "recorded_by": minutes.recorded_by,
        "created_at": _iso(minutes.created_at),
    }


def _serialize_meeting(meeting, include_minutes=False):
    minutes = MeetingMinutes.query.filter_by(meeting_id=meeting.id).first()
    payload = {
        "id": meeting.id,
        "chama_id": meeting.chama_id,
        "title": meeting.title,
        "meeting_date": _iso(meeting.meeting_date),
        "venue": meeting.venue,
        "agenda": meeting.agenda,
        "created_by": meeting.created_by,
        "has_minutes": minutes is not None,
    }
    if include_minutes:
        payload["minutes"] = _serialize_minutes(minutes)
    return payload


def _serialize_announcement(announcement):
    return {
        "id": announcement.id,
        "chama_id": announcement.chama_id,
        "title": announcement.title,
        "content": announcement.content,
        "image_url": announcement.image_url,
        "created_by": announcement.created_by,
        "created_at": _iso(announcement.created_at),
    }


def _find_meeting(meeting_id, chama_id):
    return Meeting.query.filter_by(id=meeting_id, chama_id=chama_id).first()


# ----------------------------------------------------------------- meetings

@operations_bp.route("/meetings", methods=["GET"])
@jwt_required()
def list_meetings():
    user, membership, error = _context()
    if error:
        return error

    meetings = (
        Meeting.query.filter_by(chama_id=membership.chama_id)
        .order_by(Meeting.meeting_date.desc())
        .all()
    )
    return jsonify([_serialize_meeting(m) for m in meetings]), 200


@operations_bp.route("/meetings", methods=["POST"])
@jwt_required()
def create_meeting():
    user, membership, error = _context()
    if error:
        return error
    denied = _require_official(user)
    if denied:
        return denied

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
        chama_id=membership.chama_id,
        title=title,
        meeting_date=meeting_date,
        venue=venue,
        agenda=agenda,
        created_by=user.id,
    )
    db.session.add(meeting)
    db.session.commit()
    return jsonify(_serialize_meeting(meeting, include_minutes=True)), 201


@operations_bp.route("/meetings/<int:meeting_id>", methods=["GET"])
@jwt_required()
def get_meeting(meeting_id):
    user, membership, error = _context()
    if error:
        return error

    meeting = _find_meeting(meeting_id, membership.chama_id)
    if meeting is None:
        return jsonify({"error": "Meeting not found"}), 404
    return jsonify(_serialize_meeting(meeting, include_minutes=True)), 200


@operations_bp.route("/meetings/<int:meeting_id>", methods=["PATCH"])
@jwt_required()
def update_meeting(meeting_id):
    user, membership, error = _context()
    if error:
        return error
    denied = _require_official(user)
    if denied:
        return denied

    meeting = _find_meeting(meeting_id, membership.chama_id)
    if meeting is None:
        return jsonify({"error": "Meeting not found"}), 404

    data = request.get_json(silent=True) or {}
    errors = {}

    for key, max_len, required in (
        ("title", 200, True),
        ("venue", 150, False),
        ("agenda", None, False),
    ):
        if key in data:
            value = _read_text(data, key, errors, max_len, required)
            if key not in errors:
                setattr(meeting, key, value)

    if "meeting_date" in data:
        meeting_date = _parse_datetime(data["meeting_date"])
        if meeting_date is None:
            errors["meeting_date"] = "A valid ISO 8601 date and time is required"
        else:
            meeting.meeting_date = meeting_date

    if errors:
        db.session.rollback()
        return jsonify({"errors": errors}), 400

    db.session.commit()
    return jsonify(_serialize_meeting(meeting, include_minutes=True)), 200


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["PUT"])
@jwt_required()
def upsert_minutes(meeting_id):
    """Create the meeting's minutes, or replace them (one set per meeting)."""
    user, membership, error = _context()
    if error:
        return error
    denied = _require_official(user)
    if denied:
        return denied

    meeting = _find_meeting(meeting_id, membership.chama_id)
    if meeting is None:
        return jsonify({"error": "Meeting not found"}), 404

    data = request.get_json(silent=True) or {}
    errors = {}
    text = _read_text(data, "minutes", errors, required=True)
    file_url = _read_text(data, "file_url", errors, max_len=500)
    if errors:
        return jsonify({"errors": errors}), 400

    minutes = MeetingMinutes.query.filter_by(meeting_id=meeting.id).first()
    created = minutes is None
    if created:
        minutes = MeetingMinutes(
            meeting_id=meeting.id,
            recorded_by=user.id,
            minutes=text,
            file_url=file_url,
        )
        db.session.add(minutes)
    else:
        minutes.minutes = text
        minutes.file_url = file_url
        minutes.recorded_by = user.id

    db.session.commit()
    return jsonify(_serialize_minutes(minutes)), 201 if created else 200


# ------------------------------------------------------------ announcements

@operations_bp.route("/announcements", methods=["GET"])
@jwt_required()
def list_announcements():
    user, membership, error = _context()
    if error:
        return error

    announcements = (
        Announcement.query.filter_by(chama_id=membership.chama_id)
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return jsonify([_serialize_announcement(a) for a in announcements]), 200


@operations_bp.route("/announcements", methods=["POST"])
@jwt_required()
def create_announcement():
    user, membership, error = _context()
    if error:
        return error
    denied = _require_official(user)
    if denied:
        return denied

    data = request.get_json(silent=True) or {}
    errors = {}
    title = _read_text(data, "title", errors, max_len=200, required=True)
    content = _read_text(data, "content", errors, required=True)
    image_url = _read_text(data, "image_url", errors, max_len=500)
    if errors:
        return jsonify({"errors": errors}), 400

    announcement = Announcement(
        chama_id=membership.chama_id,
        created_by=user.id,
        title=title,
        content=content,
        image_url=image_url,
    )
    db.session.add(announcement)
    db.session.commit()
    return jsonify(_serialize_announcement(announcement)), 201
