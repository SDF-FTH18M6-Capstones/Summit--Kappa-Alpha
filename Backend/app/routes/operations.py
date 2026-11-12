from datetime import timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from marshmallow import ValidationError

from app import db
from app.models import (
    Announcement,
    Meeting,
    MeetingAttendance,
    MeetingMinutes,
    Membership,
    User,
)
from app.schemas import (
    AnnouncementSchema,
    MeetingAttendanceSchema,
    MeetingMinutesSchema,
    MeetingSchema,
)

operations_bp = Blueprint("operations", __name__)

OFFICIAL_ROLES = ("secretary", "chama_admin")
MAX_PER_PAGE = 100


# ------------------------------------------------------------------ helpers

def _val(value):
    """Plain string for an enum member or a string column."""
    return getattr(value, "value", value)


def _iso(value):
    return value.isoformat() if value else None


def _naive_utc(value):
    """Store datetimes as naive UTC, whatever offset the client sent."""
    if value is not None and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _load(schema_class, payload):
    """Validate a payload with a Marshmallow schema from app/schemas.py.

    Returns (data, error_response); exactly one of the two is None.
    """
    try:
        return schema_class().load(payload), None
    except ValidationError as err:
        return None, (jsonify({"errors": err.messages}), 400)


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


def _paginate(query, serializer):
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 20, type=int), 1), MAX_PER_PAGE)

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


# ----------------------------------------------------------------- meetings

@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["POST"])
@jwt_required()
def create_meeting(chama_id):
    user, error = _access(chama_id, officials_only=True)
    if error:
        return error

    data, error = _load(MeetingSchema, request.get_json(silent=True) or {})
    if error:
        return error

    meeting = Meeting(
        chama_id=chama_id,
        title=data["title"],
        meeting_date=_naive_utc(data["meeting_date"]),
        venue=data.get("venue"),
        agenda=data.get("agenda"),
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


# ------------------------------------------------------------------ minutes

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

    data, error = _load(MeetingMinutesSchema, request.get_json(silent=True) or {})
    if error:
        return error

    minutes = MeetingMinutes(
        meeting_id=meeting.id,
        recorded_by=user.id,
        minutes=data["minutes"],
        file_url=data.get("file_url"),
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


# --------------------------------------------------------------- attendance

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

    payload = request.get_json(silent=True) or {}
    is_bulk = isinstance(payload.get("records"), list)
    entries = payload["records"] if is_bulk else [payload]
    if not entries:
        return jsonify({"error": "No attendance records supplied"}), 400

    schema = MeetingAttendanceSchema()
    errors = {}
    cleaned = []
    for index, entry in enumerate(entries):
        try:
            item = schema.load(entry)
        except ValidationError as err:
            errors[str(index)] = err.messages
            continue

        # Business rule the schema can't check: the member must belong to
        # the same chama as the meeting.
        membership = db.session.get(Membership, item["membership_id"])
        if membership is None or membership.chama_id != meeting.chama_id:
            errors[str(index)] = {"membership_id": ["Member does not belong to this chama."]}
            continue
        cleaned.append(item)

    if errors:
        return jsonify({"errors": errors if is_bulk else errors["0"]}), 400

    saved = []
    for item in cleaned:
        record = MeetingAttendance.query.filter_by(
            meeting_id=meeting.id, membership_id=item["membership_id"]
        ).first()
        if record is None:
            record = MeetingAttendance(
                meeting_id=meeting.id,
                membership_id=item["membership_id"],
                status=item["status"],
            )
            db.session.add(record)
        else:
            record.status = item["status"]
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


# ------------------------------------------------------------ announcements

@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["POST"])
@jwt_required()
def create_announcement(chama_id):
    user, error = _access(chama_id, officials_only=True)
    if error:
        return error

    data, error = _load(AnnouncementSchema, request.get_json(silent=True) or {})
    if error:
        return error

    announcement = Announcement(
        chama_id=chama_id,
        created_by=user.id,
        title=data["title"],
        content=data["content"],
        image_url=data.get("image_url"),
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
