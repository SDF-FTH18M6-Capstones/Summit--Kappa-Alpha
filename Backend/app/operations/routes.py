"""
Chama Operations HTTP Routes (/api/chamas/<id>/meetings, /minutes, /attendance, /announcements).
Thin controller layer — all database logic lives in app/operations/services.py.
"""

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.operations.services import (
    create_announcement_service,
    create_meeting_service,
    create_minutes_service,
    delete_announcement_service,
    delete_meeting_service,
    get_attendance_service,
    get_minutes_service,
    list_announcements_service,
    list_chama_minutes_service,
    list_meetings_service,
    record_attendance_service,
)

from app.utils.decorators import role_required
from app.utils.exceptions import AppError

operations_bp = Blueprint("operations", __name__)

ALL_CHAMA_ROLES = ("member", "secretary", "treasurer", "chama_admin")
OPERATIONS_WRITE_ROLES = ("secretary", "chama_admin")


@operations_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({"error": "Please check the highlighted form fields and try again.", "errors": err.messages}), 400


@operations_bp.errorhandler(AppError)
def handle_app_error(err):
    payload = {"error": err.message}
    if err.errors:
        payload["errors"] = err.errors
    return jsonify(payload), err.status_code


@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_meeting(chama_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(create_meeting_service(chama_id, g.current_user, payload)), 201


@operations_bp.route("/chamas/<int:chama_id>/meetings", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_meetings(chama_id):
    result = list_meetings_service(
        chama_id=chama_id,
        user=g.current_user,
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 20, type=int),
    )
    return jsonify(result), 200


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_minutes(meeting_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(create_minutes_service(meeting_id, g.current_user, payload)), 201


@operations_bp.route("/meetings/<int:meeting_id>/minutes", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_minutes(meeting_id):
    return jsonify(get_minutes_service(meeting_id, g.current_user)), 200


@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def record_attendance(meeting_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(record_attendance_service(meeting_id, g.current_user, payload)), 201


@operations_bp.route("/meetings/<int:meeting_id>/attendance", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def get_attendance(meeting_id):
    return jsonify(get_attendance_service(meeting_id, g.current_user)), 200


@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["POST"])
@role_required(*OPERATIONS_WRITE_ROLES)
def create_announcement(chama_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(create_announcement_service(chama_id, g.current_user, payload)), 201


@operations_bp.route("/chamas/<int:chama_id>/announcements", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_announcements(chama_id):
    result = list_announcements_service(
        chama_id=chama_id,
        user=g.current_user,
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 20, type=int),
    )
    return jsonify(result), 200
@operations_bp.route("/chamas/<int:chama_id>/minutes", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_chama_minutes(chama_id):
    result = list_chama_minutes_service(
        chama_id=chama_id,
        user=g.current_user,
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 20, type=int),
    )
    return jsonify(result), 200


@operations_bp.route("/meetings/<int:meeting_id>", methods=["DELETE"])
@role_required(*OPERATIONS_WRITE_ROLES)
def delete_meeting(meeting_id):
    return jsonify(delete_meeting_service(meeting_id, g.current_user)), 200


@operations_bp.route("/announcements/<int:announcement_id>", methods=["DELETE"])
@role_required(*OPERATIONS_WRITE_ROLES)
def delete_announcement(announcement_id):
    return jsonify(delete_announcement_service(announcement_id, g.current_user)), 200
