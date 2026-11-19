"""
Chama Operations Services: Meetings, Meeting Minutes, Attendance Roll-Call & Announcements.
Contains all database transactions, membership isolation checks, and audit logging.
"""

from datetime import timezone
from marshmallow import ValidationError

from app.models.models import (
    Announcement,
    Chama,
    Meeting,
    MeetingAttendance,
    MeetingMinutes,
    Membership,
    User,
    db,
)
from app.utils.decorators import SUPER_ADMIN, log_audit
from app.utils.exceptions import AppError, handle_db_exception
from app.utils.schemas import (
    AnnouncementSchema,
    MeetingAttendanceSchema,
    MeetingMinutesSchema,
    MeetingSchema,
)

MAX_PER_PAGE = 100


def _val(value):
    return getattr(value, "value", value)


def _iso(value):
    return value.isoformat() if value else None


def _naive_utc(value):
    if value is not None and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _assert_chama_exists(chama_id):
    chama = db.session.get(Chama, chama_id)
    if chama is None:
        raise AppError(f"Chama with ID {chama_id} was not found.", 404)
    return chama


def _assert_active_member(user, chama_id):
    if _val(user.role) == SUPER_ADMIN:
        return
    membership = Membership.query.filter_by(user_id=user.id, chama_id=chama_id).first()
    if membership is None or _val(membership.status) != "active":
        raise AppError(
            "Access denied. You must be an active member of this Chama to view or manage operations.",
            403,
        )


def _get_meeting_or_raise(meeting_id):
    meeting = db.session.get(Meeting, meeting_id)
    if meeting is None:
        raise AppError(f"Meeting with ID {meeting_id} was not found.", 404)
    return meeting


def _serialize_meeting(meeting):
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
    return {
        "id": minutes_row.id,
        "meeting_id": minutes_row.meeting_id,
        "minutes": minutes_row.minutes,
        "file_url": minutes_row.file_url,
        "recorded_by": minutes_row.recorded_by,
        "created_at": _iso(minutes_row.created_at),
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


def _paginate_query(query, serializer, page=1, per_page=20):
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 20), 1), MAX_PER_PAGE)
    result = query.paginate(page=safe_page, per_page=safe_per_page, error_out=False)
    return {
        "items": [serializer(item) for item in result.items],
        "page": result.page,
        "per_page": result.per_page,
        "total": result.total,
        "pages": result.pages,
    }


def create_meeting_service(chama_id, user, payload):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    data = MeetingSchema().load(payload)
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
        log_audit(chama_id, user.id, "create", "meetings", meeting.id, new_values=_serialize_meeting(meeting))
        db.session.commit()
        return {"message": "Meeting scheduled successfully.", "meeting": _serialize_meeting(meeting)}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not schedule the meeting. Please try again.")


def list_meetings_service(chama_id, user, page=1, per_page=20):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    query = Meeting.query.filter_by(chama_id=chama_id).order_by(Meeting.meeting_date.desc())
    return _paginate_query(query, _serialize_meeting, page, per_page)


def create_minutes_service(meeting_id, user, payload):
    meeting = _get_meeting_or_raise(meeting_id)
    _assert_active_member(user, meeting.chama_id)
    if MeetingMinutes.query.filter_by(meeting_id=meeting.id).first() is not None:
        raise AppError("Official minutes have already been recorded for this meeting.", 409)
    data = MeetingMinutesSchema().load(payload)
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
            meeting.chama_id,
            user.id,
            "create",
            "meeting_minutes",
            minutes_row.id,
            new_values={"meeting_id": meeting.id, "file_url": minutes_row.file_url},
        )
        db.session.commit()
        return {"message": "Meeting minutes recorded successfully.", "minutes": _serialize_minutes(minutes_row)}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not save the meeting minutes. Please try again.")


def get_minutes_service(meeting_id, user):
    meeting = _get_meeting_or_raise(meeting_id)
    _assert_active_member(user, meeting.chama_id)
    minutes_row = MeetingMinutes.query.filter_by(meeting_id=meeting.id).first()
    if minutes_row is None:
        raise AppError("No minutes have been recorded for this meeting yet.", 404)
    return _serialize_minutes(minutes_row)


def record_attendance_service(meeting_id, user, payload):
    meeting = _get_meeting_or_raise(meeting_id)
    _assert_active_member(user, meeting.chama_id)
    if not isinstance(payload, dict):
        raise AppError("Invalid request payload.", 400)
    is_bulk = isinstance(payload.get("records"), list)
    entries = payload["records"] if is_bulk else [payload]
    if not entries:
        raise AppError("Please provide at least one attendance record to save.", 400)
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
        raise AppError(
            "Some attendance entries could not be validated.",
            400,
            errors=errors if is_bulk else errors["0"],
        )
    try:
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
        db.session.flush()
        log_audit(
            meeting.chama_id,
            user.id,
            "update",
            "meeting_attendance",
            meeting.id,
            new_values={"meeting_id": meeting.id, "updated_count": len(saved)},
        )
        db.session.commit()
        return {
            "message": "Meeting attendance recorded successfully.",
            "items": [_serialize_attendance(r) for r in saved],
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not save the attendance records. Please try again.")


def get_attendance_service(meeting_id, user):
    meeting = _get_meeting_or_raise(meeting_id)
    _assert_active_member(user, meeting.chama_id)
    rows = (
        db.session.query(MeetingAttendance, Membership, User)
        .join(Membership, MeetingAttendance.membership_id == Membership.id)
        .join(User, Membership.user_id == User.id)
        .filter(MeetingAttendance.meeting_id == meeting.id)
        .order_by(Membership.member_number)
        .all()
    )
    return {"items": [_serialize_attendance(rec, mem, usr) for rec, mem, usr in rows]}


def create_announcement_service(chama_id, user, payload):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    data = AnnouncementSchema().load(payload)
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
            chama_id,
            user.id,
            "create",
            "announcements",
            announcement.id,
            new_values=_serialize_announcement(announcement),
        )
        db.session.commit()
        return {
            "message": "Announcement published successfully.",
            "announcement": _serialize_announcement(announcement),
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not publish the announcement. Please try again.")


def list_announcements_service(chama_id, user, page=1, per_page=20):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    query = Announcement.query.filter_by(chama_id=chama_id).order_by(Announcement.created_at.desc())
    return _paginate_query(query, _serialize_announcement, page, per_page)
def list_chama_minutes_service(chama_id, user, page=1, per_page=20):
    _assert_chama_exists(chama_id)
    _assert_active_member(user, chama_id)
    safe_page = max(int(page or 1), 1)
    safe_per_page = min(max(int(per_page or 20), 1), MAX_PER_PAGE)
    query = (
        db.session.query(MeetingMinutes, Meeting)
        .join(Meeting, MeetingMinutes.meeting_id == Meeting.id)
        .filter(Meeting.chama_id == chama_id)
        .order_by(MeetingMinutes.created_at.desc())
    )
    pagination = query.paginate(page=safe_page, per_page=safe_per_page, error_out=False)
    items = []
    for minutes_row, meeting in pagination.items:
        item = _serialize_minutes(minutes_row)
        item["meeting_title"] = meeting.title
        item["meeting_date"] = _iso(meeting.meeting_date)
        item["attendance_count"] = len(meeting.attendance)
        items.append(item)
    return {
        "items": items,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
    }


def delete_meeting_service(meeting_id, user):
    meeting = _get_meeting_or_raise(meeting_id)
    _assert_active_member(user, meeting.chama_id)
    try:
        snapshot = _serialize_meeting(meeting)
        log_audit(meeting.chama_id, user.id, "delete", "meetings", meeting.id, old_values=snapshot)
        db.session.delete(meeting)
        db.session.commit()
        return {"message": "Meeting deleted successfully."}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not delete the meeting. Please try again.")


def delete_announcement_service(announcement_id, user):
    announcement = db.session.get(Announcement, announcement_id)
    if announcement is None:
        raise AppError(f"Announcement with ID {announcement_id} was not found.", 404)
    _assert_active_member(user, announcement.chama_id)
    try:
        snapshot = _serialize_announcement(announcement)
        log_audit(announcement.chama_id, user.id, "delete", "announcements", announcement.id, old_values=snapshot)
        db.session.delete(announcement)
        db.session.commit()
        return {"message": "Announcement deleted successfully."}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not delete the announcement. Please try again.")
