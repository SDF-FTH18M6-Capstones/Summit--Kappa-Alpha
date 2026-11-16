from datetime import timezone

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app import db
from app.decorators import SUPER_ADMIN, log_audit, role_required
from app.models import (
    Announcement,
    Chama,
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

ALL_CHAMA_ROLES = ("member", "secretary", "treasurer", "chama_admin")
OPERATIONS_WRITE_ROLES = ("secretary", "chama_admin")
MAX_PER_PAGE = 100


# ==============================================================================
# HELPER UTILITIES
# ==============================================================================

def _val(value):
    """Return a plain string whether 'value' is an Enum member or a string column."""
    return getattr(value, "value", value)


def _iso(value):
    """Convert a date or datetime object into an ISO-8601 string, or return None."""
    return value.isoformat() if value else None


def _naive_utc(value):
    """Normalize timezone-aware datetimes into naive UTC so SQLite3 compares dates reliably."""
    if value is not None and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _load(schema_class, payload):
    """Validate a JSON payload using a Marshmallow schema."""
    try:
        return schema_class().load(payload), None
    except ValidationError as err:
        return None, (
            jsonify({
                "error": "Please check the highlighted form fields and try again.",
                "errors": err.messages,
            }),
            400,
        )


def _verify_chama_membership(chama_id):
    """Confirm that g.current_user is either a super_admin or an active Chama member."""
    user = g.current_user
    if _val(user.role) == SUPER_ADMIN:
        if db.session.get(Chama, chama_id) is None:
            return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404
        return None

    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or _val(membership.status) != "active":
        return jsonify({
            "error": "Access denied. You must be an active member of this Chama to view or manage operations."
        }), 403

    return None


def _paginate(query, serializer):
    """Paginate any SQLAlchemy query using ?page= and ?per_page= query params."""
    page = max(request.args.get("page", 1, type=int), 1)
    per_page = min(max(request.args.get("per_page", 20, type=int), 1), MAX_PER_PAGE)

    result = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "items": [serializer(item) for item in result.items],
        "page": result.page,
        "per_page": result.per_page,
        "total": result.total,
        "pages": result.pages,
    }), 200


def _serialize_meeting(meeting):
    """Serialize all attributes of a 'meetings' row into a clean dictionary."""
    return {
        "id": meeting.id,
        "chama_id": meeting.chama_id,
        "title": meeting.title,
        "meeting_date": _iso(meeting.meeting_date),
        "venue": meeting.venue,
        "agenda": meeting.agenda,
        "created_by": meeting.created_by,
    }


def _serialize_minutes(minutes_row):
    """Serialize all attributes of a 'meeting_minutes' row into a clean dictionary."""
    return {
        "id": minutes_row.id,
        "meeting_id": minutes_row.meeting_id,
        "minutes": minutes_row.minutes,
        "file_url": minutes_row.file_url,
        "recorded_by": minutes_row.recorded_by,
        "created_at": _iso(minutes_row.created_at),
    }


def _serialize_attendance(record, membership=None, user=None):
    """Serialize a 'meeting_attendance' row along with optional member number and full name."""
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


def _serialize_announcement(announcement):
    """Serialize all attributes of an 'announcements' row into a clean dictionary."""
    return {
        "id": announcement.id,
        "chama_id": announcement.chama_id,
        "title": announcement.title,
        "content": announcement.content,
        "image_url": announcement.image_url,
        "created_by": announcement.created_by,
        "created_at": _iso(announcement.created_at),
    }


def _get_meeting_or_404(meeting_id):
    """Look up a Meeting by primary key or return a descriptive 404 JSON error."""
    meeting = db.session.get(Meeting, meeting_id)
    if meeting is None:
        return None, (jsonify({"error": f"Meeting with ID {meeting_id} was not found."}), 404)
    return meeting, None


# ==============================================================================
# 1. CHAMA MEETINGS ENDPOINTS
# ==============================================================================

@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_meeting(chama_id):
    """Allow the Secretary or Chama Admin to schedule a new meeting in 'meetings'."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data, error = _load(MeetingSchema, request.get_json(silent=True) or {})
    if error:
        return error

    user = g.current_user

    try:
        meeting = Meeting(
            chama_id=chama_id,
            title=data["title"].strip(),
            meeting_date=_naive_utc(data["meeting_date"]),
            venue=data.get("venue"),
            agenda=data.get("agenda"),
            created_by=user.id,
        )
        db.session.add(meeting)
        db.session.flush()

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="meetings",
            record_id=meeting.id,
            new_values=_serialize_meeting(meeting),
        )
        db.session.commit()

        return jsonify({
            "message": "Meeting scheduled successfully.",
            "meeting": _serialize_meeting(meeting),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not schedule the meeting due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_meetings(chama_id):
    """Return a paginated list of meetings for a Chama ordered newest-first."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        query = Meeting.query.filter_by(chama_id=chama_id).order_by(Meeting.meeting_date.desc())
        return _paginate(query, _serialize_meeting)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the Chama's meetings due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 2. MEETING MINUTES ENDPOINTS
# ==============================================================================

@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_minutes(meeting_id):
    """Allow the Secretary or Chama Admin to record official minutes in 'meeting_minutes'."""
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error

    membership_error = _verify_chama_membership(meeting.chama_id)
    if membership_error:
        return membership_error

    if MeetingMinutes.query.filter_by(meeting_id=meeting.id).first() is not None:
        return jsonify({
            "error": "Official minutes have already been recorded for this meeting."
        }), 409

    data, error = _load(MeetingMinutesSchema, request.get_json(silent=True) or {})
    if error:
        return error

    user = g.current_user

    try:
        minutes_row = MeetingMinutes(
            meeting_id=meeting.id,
            recorded_by=user.id,
            minutes=data["minutes"],
            file_url=data.get("file_url"),
        )
        db.session.add(minutes_row)
        db.session.flush()

        log_audit(
            chama_id=meeting.chama_id,
            user_id=user.id,
            action="create",
            table_name="meeting_minutes",
            record_id=minutes_row.id,
            new_values={"meeting_id": meeting.id, "file_url": minutes_row.file_url},
        )
        db.session.commit()

        return jsonify({
            "message": "Meeting minutes recorded successfully.",
            "minutes": _serialize_minutes(minutes_row),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not save the meeting minutes due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_minutes(meeting_id):
    """Allow any active Chama member to read the recorded minutes for a meeting."""
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error

    membership_error = _verify_chama_membership(meeting.chama_id)
    if membership_error:
        return membership_error

    try:
        minutes_row = MeetingMinutes.query.filter_by(meeting_id=meeting.id).first()
        if minutes_row is None:
            return jsonify({
                "error": "No minutes have been recorded for this meeting yet."
            }), 404

        return jsonify(_serialize_minutes(minutes_row)), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the meeting minutes due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 3. MEETING ATTENDANCE ENDPOINTS
# ==============================================================================

@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def record_attendance(meeting_id):
    """
    Allow the Secretary or Chama Admin to record attendance for one member or a batch
    via {"records": [...]}. Re-submitting an existing member updates their status in place.
    """
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error

    membership_error = _verify_chama_membership(meeting.chama_id)
    if membership_error:
        return membership_error

    payload = request.get_json(silent=True) or {}
    is_bulk = isinstance(payload.get("records"), list)
    entries = payload["records"] if is_bulk else [payload]

    if not entries:
        return jsonify({"error": "Please provide at least one attendance record to save."}), 400

    schema = MeetingAttendanceSchema()
    errors = {}
    cleaned = []

    for index, entry in enumerate(entries):
        try:
            item = schema.load(entry)
        except ValidationError as err:
            errors[str(index)] = err.messages
            continue

        membership = db.session.get(Membership, item["membership_id"])
        if membership is None or membership.chama_id != meeting.chama_id:
            errors[str(index)] = {"membership_id": ["Member does not belong to this Chama."]}
            continue

        cleaned.append(item)

    if errors:
        return jsonify({
            "error": "Some attendance entries could not be validated.",
            "errors": errors if is_bulk else errors["0"],
        }), 400

    user = g.current_user

    try:
        saved = []
        for item in cleaned:
            record = MeetingAttendance.query.filter_by(
                meeting_id=meeting.id,
                membership_id=item["membership_id"],
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

        db.session.flush()

        log_audit(
            chama_id=meeting.chama_id,
            user_id=user.id,
            action="update",
            table_name="meeting_attendance",
            record_id=meeting.id,
            new_values={"meeting_id": meeting.id, "updated_count": len(saved)},
        )
        db.session.commit()

        return jsonify({
            "message": "Meeting attendance recorded successfully.",
            "items": [_serialize_attendance(r) for r in saved],
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not save the attendance records due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_attendance(meeting_id):
    """Return the attendance roll-call for a meeting joined with member numbers and full names."""
    meeting, error = _get_meeting_or_404(meeting_id)
    if error:
        return error

    membership_error = _verify_chama_membership(meeting.chama_id)
    if membership_error:
        return membership_error

    try:
        rows = (
            db.session.query(MeetingAttendance, Membership, User)
            .join(Membership, MeetingAttendance.membership_id == Membership.id)
            .join(User, Membership.user_id == User.id)
            .filter(MeetingAttendance.meeting_id == meeting.id)
            .order_by(Membership.member_number)
            .all()
        )
        return jsonify({
            "items": [_serialize_attendance(rec, mem, usr) for rec, mem, usr in rows]
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load the meeting attendance roster due to a server error.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 4. CHAMA ANNOUNCEMENTS ENDPOINTS
# ==============================================================================

@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_announcement(chama_id):
    """Allow the Secretary or Chama Admin to post a new announcement in 'announcements'."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    data, error = _load(AnnouncementSchema, request.get_json(silent=True) or {})
    if error:
        return error

    user = g.current_user

    try:
        announcement = Announcement(
            chama_id=chama_id,
            created_by=user.id,
            title=data["title"].strip(),
            content=data["content"],
            image_url=data.get("image_url"),
        )
        db.session.add(announcement)
        db.session.flush()

        log_audit(
            chama_id=chama_id,
            user_id=user.id,
            action="create",
            table_name="announcements",
            record_id=announcement.id,
            new_values=_serialize_announcement(announcement),
        )
        db.session.commit()

        return jsonify({
            "message": "Announcement published successfully.",
            "announcement": _serialize_announcement(announcement),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not publish the announcement due to a server error. Please try again.",
            "details": str(exc),
        }), 500


@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_announcements(chama_id):
    """Return a paginated list of Chama announcements ordered newest-first."""
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        return jsonify({"error": f"Chama with ID {chama_id} was not found."}), 404

    membership_error = _verify_chama_membership(chama_id)
    if membership_error:
        return membership_error

    try:
        query = Announcement.query.filter_by(chama_id=chama_id).order_by(Announcement.created_at.desc())
        return _paginate(query, _serialize_announcement)
    except Exception as exc:
        return jsonify({
            "error": "We could not load the Chama announcements due to a server error.",
            "details": str(exc),
        }), 500
