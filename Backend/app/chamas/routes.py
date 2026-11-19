"""
Chama Discovery, Projects, Join Requests, Memberships & Super-Admin HTTP Routes (/api/*).
Thin controller layer — all database logic lives in app/chamas/services.py.
"""

from flask import Blueprint, g, jsonify, request
from marshmallow import ValidationError

from app.chamas.services import (
    create_project_service,
    get_public_chama_profile_service,
    list_chama_audit_logs_service,
    list_chamas_service,
    list_memberships_service,
    list_projects_service,
    super_admin_list_audit_logs_service,
    super_admin_list_users_service,
    super_admin_toggle_user_service,
    update_chama_settings_service,
    update_membership_service,
)

from app.utils.decorators import SUPER_ADMIN, role_required
from app.utils.exceptions import AppError
from app.utils.schemas import ChamaUpdateSchema, ProjectSchema

chamas_bp = Blueprint("chamas", __name__, url_prefix="/api")

chama_update_schema = ChamaUpdateSchema()
project_schema = ProjectSchema()

ALL_CHAMA_ROLES = ("member", "secretary", "treasurer", "chama_admin")
CHAMA_ADMIN_ROLES = ("chama_admin",)


@chamas_bp.errorhandler(ValidationError)
def handle_validation_error(err):
    return jsonify({"error": "Please check the highlighted form fields and try again.", "errors": err.messages}), 400


@chamas_bp.errorhandler(AppError)
def handle_app_error(err):
    payload = {"error": err.message}
    if err.errors:
        payload["errors"] = err.errors
    return jsonify(payload), err.status_code


@chamas_bp.route("/chamas", methods=["GET"])
def list_chamas():
    result = list_chamas_service(
        search=request.args.get("search", "", type=str),
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@chamas_bp.route("/chamas/<string:slug>/public", methods=["GET"])
def get_public_chama_profile(slug):
    return jsonify(get_public_chama_profile_service(slug)), 200


@chamas_bp.route("/chamas/<int:chama_id>", methods=["PATCH"])
@role_required(*CHAMA_ADMIN_ROLES)
def update_chama_settings(chama_id):
    data = chama_update_schema.load(request.get_json(silent=True) or {})
    return jsonify(update_chama_settings_service(chama_id, g.current_user, data)), 200


@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["POST"])
@role_required(*CHAMA_ADMIN_ROLES)
def create_project(chama_id):
    data = project_schema.load(request.get_json(silent=True) or {})
    return jsonify(create_project_service(chama_id, g.current_user, data)), 201


@chamas_bp.route("/chamas/<int:chama_id>/projects", methods=["GET"])
def list_projects(chama_id):
    result = list_projects_service(
        chama_id=chama_id,
        public_only=request.args.get("public_only", "false").lower() == "true",
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@chamas_bp.route("/chamas/<int:chama_id>/memberships", methods=["GET"])
@role_required(*ALL_CHAMA_ROLES)
def list_memberships(chama_id):
    result = list_memberships_service(
        chama_id=chama_id,
        user=g.current_user,
        status_filter=request.args.get("status", type=str),
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@chamas_bp.route("/memberships/<int:membership_id>", methods=["PATCH"])
@role_required(*CHAMA_ADMIN_ROLES)
def update_membership_and_role(membership_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(update_membership_service(membership_id, g.current_user, payload)), 200


@chamas_bp.route("/chamas/<int:chama_id>/audit-logs", methods=["GET"])
@role_required(*CHAMA_ADMIN_ROLES)
def list_chama_audit_logs(chama_id):
    result = list_chama_audit_logs_service(
        chama_id=chama_id,
        user=g.current_user,
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200



@chamas_bp.route("/admin/users", methods=["GET"])
@role_required(SUPER_ADMIN)
def super_admin_list_users():
    result = super_admin_list_users_service(
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200


@chamas_bp.route("/admin/users/<int:user_id>/status", methods=["PATCH"])
@role_required(SUPER_ADMIN)
def super_admin_toggle_user_status(user_id):
    payload = request.get_json(silent=True) or {}
    return jsonify(super_admin_toggle_user_service(user_id, g.current_user, payload)), 200


@chamas_bp.route("/admin/audit-logs", methods=["GET"])
@role_required(SUPER_ADMIN)
def super_admin_list_audit_logs():
    result = super_admin_list_audit_logs_service(
        page=request.args.get("page", 1, type=int),
        per_page=request.args.get("per_page", 10, type=int),
    )
    return jsonify(result), 200
