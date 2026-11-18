"""
Authentication HTTP Routes (/api/auth/*).
Thin controller layer — all validation and database operations live in app/auth/services.py.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.auth.services import (
    forgot_password_service,
    get_current_user_service,
    login_service,
    refresh_token_service,
    register_chama_service,
    register_member_service,
    resend_verification_service,
    reset_password_service,
    verify_email_service,
)
from app.utils.exceptions import AppError

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.errorhandler(AppError)
def handle_app_error(err):
    payload = {"error": err.message}
    if err.errors:
        payload["errors"] = err.errors
    return jsonify(payload), err.status_code


@auth_bp.route("/register-chama", methods=["POST"])
def register_chama():
    result = register_chama_service(request.get_json(silent=True) or {})
    return jsonify(result), 201


@auth_bp.route("/register-member", methods=["POST"])
def register_member():
    result = register_member_service(request.get_json(silent=True) or {})
    return jsonify(result), 201


@auth_bp.route("/verify-email", methods=["GET"])
def verify_email():
    result = verify_email_service(request.args.get("token"))
    return jsonify(result), 200


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    result = resend_verification_service(request.get_json(silent=True) or {})
    return jsonify(result), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    result = login_service(request.get_json(silent=True) or {})
    return jsonify(result), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    result = refresh_token_service(get_jwt_identity())
    return jsonify(result), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    result = get_current_user_service(get_jwt_identity())
    return jsonify(result), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(optional=True)
def logout():
    return jsonify({"message": "You have been logged out successfully."}), 200


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    result = forgot_password_service(request.get_json(silent=True) or {})
    return jsonify(result), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    result = reset_password_service(request.get_json(silent=True) or {})
    return jsonify(result), 200
