from datetime import datetime, timedelta, timezone
import os
import re
import secrets

from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from werkzeug.security import check_password_hash, generate_password_hash

from app.models import Chama, EmailVerificationToken, Membership, User, db
from app.schemas import Kenyan_Tel_Regex

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ==============================================================================
# HELPER UTILITIES
# ==============================================================================

def _utc_now():
    """Return the current UTC timestamp as a naive datetime so SQLite3 compares dates reliably."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_unique_slug(chama_name):
    """Convert a Chama name (e.g. 'Summit Chama') into a unique URL slug ('summit-chama')."""
    base_slug = re.sub(r"[^a-z0-9]+", "-", chama_name.strip().lower()).strip("-") or "chama"
    slug = base_slug
    counter = 1

    while Chama.query.filter_by(slug=slug).first() is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def _send_email(to_email, subject, html_content):
    """Deliver a transactional email through SendGrid, or print it to the terminal in local dev."""
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@summitchama.co.ke")

    if not api_key:
        print("\n" + "=" * 65)
        print(f"[DEV EMAIL] To:      {to_email}")
        print(f"[DEV EMAIL] Subject: {subject}")
        print(f"[DEV EMAIL] Body:    {html_content}")
        print("=" * 65 + "\n")
        return True

    try:
        message = Mail(
            from_email=sender_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        return True
    except Exception as exc:
        print(f"SendGrid email delivery failed for {to_email}: {exc}")
        return False


def _issue_verification_email(user):
    """Create a 24-hour EmailVerificationToken row and send the clickable verification link."""
    token_str = secrets.token_urlsafe(32)
    expires_at = _utc_now() + timedelta(hours=24)

    verification_record = EmailVerificationToken(
        token=token_str,
        user_id=user.id,
        expires_at=expires_at,
        used_at=None,
    )
    db.session.add(verification_record)
    db.session.flush()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_link = f"{frontend_url}/verify-email?token={token_str}"

    html_body = (
        f"<p>Hello <strong>{user.full_name}</strong>,</p>"
        f"<p>Welcome to Summit Chama! Please verify your email address by clicking the link below:</p>"
        f"<p><a href='{verify_link}'>{verify_link}</a></p>"
        f"<p>This verification link will expire in 24 hours.</p>"
    )
    _send_email(user.email, "Verify Your Summit Chama Account", html_body)


# ==============================================================================
# 1. REGISTER A NEW CHAMA & ITS CHAIRPERSON (chama_admin)
# ==============================================================================

@auth_bp.route("/register-chama", methods=["POST"])
def register_chama():
    """
    Create a new Chama organization alongside its founding Chairperson ('chama_admin').
    Populates 'users', 'chamas', 'memberships', and 'email_verification_tokens' atomically.
    """
    data = request.get_json(silent=True) or {}

    chama_name = (data.get("chama_name") or "").strip()
    location = (data.get("location") or "").strip() or None
    description = (data.get("description") or "").strip() or None
    constitution = (data.get("constitution") or "").strip() or None
    registration_number = (data.get("registration_number") or "").strip() or None
    logo_url = (data.get("logo_url") or "").strip() or None

    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone_number") or "").strip().replace(" ", "")
    profile_image_url = (data.get("profile_image_url") or "").strip() or None
    password = data.get("password") or ""

    if not all([chama_name, full_name, email, phone, password]):
        return jsonify({
            "error": "Please fill in all required fields: Chama name, your full name, email, phone number, and password."
        }), 400

    if len(password) < 8:
        return jsonify({
            "error": "Your password must be at least 8 characters long."
        }), 400

    if not re.match(Kenyan_Tel_Regex, phone):
        return jsonify({
            "error": "Please enter a valid Kenyan phone number (for example, 0712345678 or 254712345678)."
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "An account with this email address already exists. Please log in instead."
        }), 409

    if Chama.query.filter_by(name=chama_name).first():
        return jsonify({
            "error": f"A Chama named '{chama_name}' is already registered. Please choose a different name."
        }), 409

    try:
        admin_user = User(
            full_name=full_name,
            email=email,
            password=generate_password_hash(password),
            phone_number=phone,
            role="chama_admin",
            profile_image_url=profile_image_url,
            is_email_verified=False,
            is_active=True,
        )
        db.session.add(admin_user)
        db.session.flush()

        new_chama = Chama(
            name=chama_name,
            slug=_generate_unique_slug(chama_name),
            description=description,
            location=location,
            constitution=constitution,
            registration_number=registration_number,
            logo_url=logo_url,
            created_by=admin_user.id,
        )
        db.session.add(new_chama)
        db.session.flush()

        admin_membership = Membership(
            user_id=admin_user.id,
            chama_id=new_chama.id,
            member_number="MEM001",
            status="active",
        )
        db.session.add(admin_membership)

        _issue_verification_email(admin_user)
        db.session.commit()

        return jsonify({
            "message": "Chama registered successfully! Please check your email to verify your account before logging in.",
            "chama": new_chama.to_dict(),
            "user": admin_user.to_dict(),
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not complete your Chama registration due to a server error. Please try again shortly.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 2. REGISTER AS A MEMBER OF AN EXISTING CHAMA
# ==============================================================================

@auth_bp.route("/register-member", methods=["POST"])
def register_member():
    """
    Create a regular 'member' account and queue a 'pending' membership under an existing Chama.
    The Chama Admin must approve the membership before the member becomes active.
    """
    data = request.get_json(silent=True) or {}

    raw_chama_id = data.get("chama_id")
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone_number") or "").strip().replace(" ", "")
    profile_image_url = (data.get("profile_image_url") or "").strip() or None
    password = data.get("password") or ""

    if not all([raw_chama_id, full_name, email, phone, password]):
        return jsonify({
            "error": "Please select a Chama and fill in your full name, email, phone number, and password."
        }), 400

    try:
        chama_id = int(raw_chama_id)
    except (TypeError, ValueError):
        return jsonify({"error": "The selected Chama ID is invalid. Please choose a valid Chama from the list."}), 400

    if len(password) < 8:
        return jsonify({"error": "Your password must be at least 8 characters long."}), 400

    if not re.match(Kenyan_Tel_Regex, phone):
        return jsonify({
            "error": "Please enter a valid Kenyan phone number (for example, 0712345678 or 254712345678)."
        }), 400

    chama = db.session.get(Chama, chama_id)
    if not chama:
        return jsonify({"error": "The Chama you selected could not be found."}), 404

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "An account with this email address already exists. Please log in instead."
        }), 409

    try:
        new_user = User(
            full_name=full_name,
            email=email,
            password=generate_password_hash(password),
            phone_number=phone,
            role="member",
            profile_image_url=profile_image_url,
            is_email_verified=False,
            is_active=True,
        )
        db.session.add(new_user)
        db.session.flush()

        next_number = Membership.query.filter_by(chama_id=chama.id).count() + 1
        membership = Membership(
            user_id=new_user.id,
            chama_id=chama.id,
            member_number=f"MEM{next_number:03d}",
            status="pending",
        )
        db.session.add(membership)

        _issue_verification_email(new_user)
        db.session.commit()
        return jsonify({
            "message": "Your member account has been created! Please verify your email and await Chama Admin approval.",
            "user": new_user.to_dict(),
            "membership": membership.to_dict(),
        }), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not complete your member registration due to a server error. Please try again shortly.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 3. EMAIL VERIFICATION & RESEND VERIFICATION LINK
# ==============================================================================

@auth_bp.route("/verify-email", methods=["GET"])
def verify_email():
    """Verify a user's email address when they open the verification link containing ?token=..."""
    token_str = (request.args.get("token") or "").strip()
    if not token_str:
        return jsonify({
            "error": "Verification token is missing from the link. Please use the full link sent to your email."
        }), 400

    try:
        record = EmailVerificationToken.query.filter_by(token=token_str).first()
        if not record:
            return jsonify({
                "error": "This verification link is invalid. Please request a new verification email."
            }), 404
        if record.used_at is not None:
            return jsonify({
                "error": "This verification link has already been used. You can proceed to log in."
            }), 400

        now = _utc_now()
        if record.expires_at < now:
            return jsonify({
                "error": "This verification link has expired. Please request a new verification email."
            }), 400

        user = db.session.get(User, record.user_id)
        if not user:
            return jsonify({
                "error": "No user account was found for this verification token."
            }), 404

        user.is_email_verified = True
        record.used_at = now
        db.session.commit()
        return jsonify({
            "message": "Your email has been verified successfully! You may now log in to your account."
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We encountered a server error while verifying your email. Please try again.",
            "details": str(exc),
        }), 500


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """Send a fresh 24-hour verification link to an unverified user's email address."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Please enter the email address you registered with."}), 400

    try:
        user = User.query.filter_by(email=email).first()
        if user and not user.is_email_verified:
            _issue_verification_email(user)
            db.session.commit()

        return jsonify({
            "message": "If an unverified account exists for that email address, a new verification link has been sent."
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not send a new verification email right now due to a server error. Please try again.",
            "details": str(exc),
        }), 500


# ==============================================================================
# 4. LOGIN, REFRESH JWT TOKEN, CURRENT USER (/me) & LOGOUT
# ==============================================================================

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate email and password, enforce active + verified status, and issue stateless
    JWT access and refresh tokens along with the user's Chama and Membership identifiers.
    """
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Please enter both your email address and password."}), 400

    try:
        user = User.query.filter_by(email=email).first()
        if not user or not check_password_hash(user.password, password):
            return jsonify({"error": "Invalid email address or password. Please check your credentials."}), 401
        if not user.is_active:
            return jsonify({
                "error": "Your account has been deactivated. Please contact your Chama Admin or platform support."
            }), 403
        if not user.is_email_verified:
            return jsonify({
                "error": "Your email address has not been verified yet. Please check your inbox for the verification link."
            }), 403

        membership = Membership.query.filter_by(user_id=user.id).first()
        user_payload = user.to_dict()
        user_payload["chama_id"] = membership.chama_id if membership else None
        user_payload["membership_id"] = membership.id if membership else None
        user_payload["membership_status"] = membership.status if membership else None

        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful.",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user_payload,
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We encountered a server error while logging you in. Please try again shortly.",
            "details": str(exc),
        }), 500


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """Issue a fresh 1-hour JWT access token when the client presents a valid refresh token."""
    try:
        current_user_id = int(get_jwt_identity())
        user = db.session.get(User, current_user_id)
        if not user or not user.is_active:
            return jsonify({"error": "Your account is inactive or no longer exists. Please log in again."}), 401

        new_access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Access token refreshed successfully.",
            "access_token": new_access_token,
        }), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not refresh your session token due to a server error. Please log in again.",
            "details": str(exc),
        }), 500


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Return the authenticated user's profile and active Chama details using their JWT token."""
    try:
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or not user.is_active:
            return jsonify({"error": "Authenticated user account was not found or is inactive."}), 404

        membership = Membership.query.filter_by(user_id=user.id).first()
        user_payload = user.to_dict()
        user_payload["chama_id"] = membership.chama_id if membership else None
        user_payload["membership_id"] = membership.id if membership else None
        user_payload["membership_status"] = membership.status if membership else None
        return jsonify({"user": user_payload}), 200
    except Exception as exc:
        return jsonify({
            "error": "We could not load your user profile due to a server error. Please refresh the page.",
            "details": str(exc),
        }), 500


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(optional=True)
def logout():
    """Acknowledge logout so the frontend client can clear stored JWT tokens from localStorage."""
    return jsonify({"message": "You have been logged out successfully."}), 200


# ==============================================================================
# 5. FORGOT PASSWORD & RESET PASSWORD
# ==============================================================================

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Generate a 1-hour password reset token in 'email_verification_tokens' and email the reset link."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Please enter the email address associated with your account."}), 400

    try:
        user = User.query.filter_by(email=email).first()
        if user:
            token_str = secrets.token_urlsafe(32)
            expires_at = _utc_now() + timedelta(hours=1)
            reset_record = EmailVerificationToken(
                token=token_str,
                user_id=user.id,
                expires_at=expires_at,
                used_at=None,
            )
            db.session.add(reset_record)
            db.session.commit()

            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password?token={token_str}"
            html_body = (
                f"Hello {user.full_name},\n"
                "We received a request to reset your Summit Chama password. Click the link below to set a new password:\n"
                f"{reset_link}\n"
                "This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email."
            )
            _send_email(user.email, "Reset Your Summit Chama Password", html_body)

        return jsonify({
            "message": "If an account exists for that email address, a password reset link has been sent."
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not process your password reset request due to a server error. Please try again later.",
            "details": str(exc),
        }), 500


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Validate a single-use password reset token and update the user's hashed password."""
    data = request.get_json(silent=True) or {}
    token_str = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token_str:
        return jsonify({"error": "Password reset token is missing. Please use the link sent to your email."}), 400
    if len(new_password) < 8:
        return jsonify({"error": "Your new password must be at least 8 characters long."}), 400

    try:
        record = EmailVerificationToken.query.filter_by(token=token_str).first()
        now = _utc_now()

        if not record:
            return jsonify({"error": "This password reset link is invalid. Please request a new reset email."}), 404
        if record.used_at is not None:
            return jsonify({"error": "This password reset link has already been used. Please request a new one."}), 400
        if record.expires_at < now:
            return jsonify({"error": "This password reset link has expired. Please request a new reset email."}), 400

        user = db.session.get(User, record.user_id)
        if not user:
            return jsonify({"error": "No user account was found for this password reset token."}), 404

        user.password = generate_password_hash(new_password)
        record.used_at = now
        db.session.commit()
        return jsonify({
            "message": "Your password has been reset successfully! You can now log in with your new password."
        }), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({
            "error": "We could not reset your password due to a server error. Please try again shortly.",
            "details": str(exc),
        }), 500
