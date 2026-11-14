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

# All routes in this file automatically start with "/api/auth"
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


# ==========================================
# HELPER FUNCTIONS (Reusable Utilities)
# ==========================================

def _utc_now():
    """Return current UTC time without timezone info so SQLite3 compares dates cleanly."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_unique_slug(name):
    """Turn a Chama name like 'Summit Chama' into a unique URL slug like 'summit-chama'."""
    base_slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-") or "chama"
    slug = base_slug
    counter = 1

    while Chama.query.filter_by(slug=slug).first() is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1

    return slug


def _send_email(to_email, subject, html_content):
    """Send an email via SendGrid. If no API key is set in .env, print the link in the terminal."""
    api_key = os.getenv("SENDGRID_API_KEY")
    sender_email = os.getenv("SENDGRID_FROM_EMAIL", "noreply@summitchama.co.ke")

    if not api_key:
        print("\n" + "=" * 60)
        print(f"DEV EMAIL TO: {to_email}")
        print(f"SUBJECT:      {subject}")
        print(f"CONTENT:      {html_content}")
        print("=" * 60 + "\n")
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
        print(f"SendGrid delivery error: {exc}")
        return False


def _create_and_send_verification_email(user):
    """Generate a 24-hour verification token, save it to the DB, and email the link."""
    token_str = secrets.token_urlsafe(32)
    expires_at = _utc_now() + timedelta(hours=24)

    verification_record = EmailVerificationToken(
        token=token_str,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.session.add(verification_record)
    db.session.flush()

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_link = f"{frontend_url}/verify-email?token={token_str}"

    html_body = (
        f"<p>Hello <strong>{user.full_name}</strong>,</p>"
        f"<p>Welcome to Summit Chama! Please click the link below to verify your email address:</p>"
        f"<p><a href='{verify_link}'>{verify_link}</a></p>"
        f"<p>This link expires in 24 hours.</p>"
    )
    _send_email(user.email, "Verify Your Summit Chama Account", html_body)


# ==========================================
# 1. REGISTER A NEW CHAMA + ADMIN ACCOUNT
# ==========================================

@auth_bp.route("/register-chama", methods=["POST"])
def register_chama():
    """Creates a new Chama, creates its Chairperson (chama_admin), and sends verification email."""
    data = request.get_json(silent=True) or {}

    chama_name = (data.get("chama_name") or "").strip()
    location = (data.get("location") or "").strip()
    description = (data.get("description") or "").strip()
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone_number") or "").strip().replace(" ", "")
    password = data.get("password") or ""

    if not all([chama_name, full_name, email, phone, password]):
        return jsonify({"error": "Chama name, full name, email, phone number, and password are required."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    if not re.match(Kenyan_Tel_Regex, phone):
        return jsonify({"error": "Phone number must be a valid Kenyan number (07XXXXXXXX or 2547XXXXXXXX)."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    if Chama.query.filter_by(name=chama_name).first():
        return jsonify({"error": "A Chama with this name is already registered."}), 409

    try:
        admin_user = User(
            full_name=full_name,
            email=email,
            password=generate_password_hash(password),
            phone_number=phone,
            role="chama_admin",
            is_email_verified=False,
            is_active=True,
        )
        db.session.add(admin_user)
        db.session.flush()

        new_chama = Chama(
            name=chama_name,
            slug=_generate_unique_slug(chama_name),
            location=location or None,
            description=description or None,
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

        _create_and_send_verification_email(admin_user)
        db.session.commit()

        return jsonify({
            "message": "Chama registered successfully! Check your email to verify your account.",
            "chama": new_chama.to_dict(),
            "user": admin_user.to_dict(),
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(exc)}"}), 500


# ==========================================
# 2. REGISTER AS A MEMBER OF AN EXISTING CHAMA
# ==========================================

@auth_bp.route("/register-member", methods=["POST"])
def register_member():
    """Creates a regular member account with a 'pending' membership awaiting Chama Admin approval."""
    data = request.get_json(silent=True) or {}

    chama_id = data.get("chama_id")
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    phone = (data.get("phone_number") or "").strip().replace(" ", "")
    password = data.get("password") or ""

    if not all([chama_id, full_name, email, phone, password]):
        return jsonify({"error": "All fields (chama_id, full_name, email, phone_number, password) are required."}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    if not re.match(Kenyan_Tel_Regex, phone):
        return jsonify({"error": "Phone number must be a valid Kenyan number (07XXXXXXXX or 2547XXXXXXXX)."}), 400

    chama = db.session.get(Chama, int(chama_id))
    if not chama:
        return jsonify({"error": "Selected Chama does not exist."}), 404

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists."}), 409

    try:
        new_user = User(
            full_name=full_name,
            email=email,
            password=generate_password_hash(password),
            phone_number=phone,
            role="member",
            is_email_verified=False,
            is_active=True,
        )
        db.session.add(new_user)
        db.session.flush()

        member_count = Membership.query.filter_by(chama_id=chama.id).count() + 1
        membership = Membership(
            user_id=new_user.id,
            chama_id=chama.id,
            member_number=f"MEM{member_count:03d}",
            status="pending",
        )
        db.session.add(membership)

        _create_and_send_verification_email(new_user)
        db.session.commit()

        return jsonify({
            "message": "Account created! Please verify your email and wait for Chama Admin approval.",
            "user": new_user.to_dict(),
        }), 201

    except Exception as exc:
        db.session.rollback()
        return jsonify({"error": f"Registration failed: {str(exc)}"}), 500


# ==========================================
# 3. EMAIL VERIFICATION & RESEND LINK
# ==========================================

@auth_bp.route("/verify-email", methods=["GET"])
def verify_email():
    """Marks a user's email as verified when they click the link sent to their inbox."""
    token_str = (request.args.get("token") or "").strip()
    if not token_str:
        return jsonify({"error": "Verification token is missing."}), 400

    record = EmailVerificationToken.query.filter_by(token=token_str).first()
    if not record:
        return jsonify({"error": "Invalid verification token."}), 404

    if record.used_at is not None:
        return jsonify({"error": "This verification link has already been used."}), 400

    now = _utc_now()
    if record.expires_at < now:
        return jsonify({"error": "This verification link has expired. Please request a new one."}), 400

    user = db.session.get(User, record.user_id)
    if not user:
        return jsonify({"error": "User not found for this verification token."}), 404

    user.is_email_verified = True
    record.used_at = now
    db.session.commit()
    return jsonify({"message": "Email verified successfully! You can now log in."}), 200


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    """Sends a fresh verification link if the user didn't receive the first one."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    if user and not user.is_email_verified:
        _create_and_send_verification_email(user)
        db.session.commit()

    return jsonify({
        "message": "If an unverified account exists for that email, a new verification link has been sent."
    }), 200


# ==========================================
# 4. LOGIN, REFRESH TOKEN, CURRENT USER & LOGOUT
# ==========================================

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticates email & password and returns JWT access + refresh tokens and user info."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid email or password."}), 401

    if not user.is_active:
        return jsonify({"error": "Your account has been deactivated. Contact support."}), 403

    if not user.is_email_verified:
        return jsonify({"error": "Please verify your email address before logging in."}), 403

    membership = Membership.query.filter_by(user_id=user.id).first()
    user_data = user.to_dict()
    user_data["chama_id"] = membership.chama_id if membership else None
    user_data["membership_id"] = membership.id if membership else None
    user_data["membership_status"] = membership.status if membership else None

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful.",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user_data,
    }), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """Issues a brand-new access token when the old 1-hour access token expires."""
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=str(current_user_id))
    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Returns the currently logged-in user's profile when the React app refreshes."""
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or not user.is_active:
        return jsonify({"error": "User not found or inactive."}), 404

    membership = Membership.query.filter_by(user_id=user.id).first()
    user_data = user.to_dict()
    user_data["chama_id"] = membership.chama_id if membership else None
    user_data["membership_id"] = membership.id if membership else None
    user_data["membership_status"] = membership.status if membership else None
    return jsonify({"user": user_data}), 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(optional=True)
def logout():
    """Confirms logout so the frontend can clear localStorage tokens."""
    return jsonify({"message": "Logged out successfully."}), 200


# ==========================================
# 5. FORGOT PASSWORD & RESET PASSWORD
# ==========================================

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Generates a 1-hour password reset token and sends the reset link via email."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = User.query.filter_by(email=email).first()

    if user:
        token_str = secrets.token_urlsafe(32)
        expires_at = _utc_now() + timedelta(hours=1)
        reset_record = EmailVerificationToken(
            token=token_str,
            user_id=user.id,
            expires_at=expires_at,
        )
        db.session.add(reset_record)
        db.session.commit()

        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={token_str}"
        html_body = (
            f"Hello {user.full_name},\n"
            f"We received a request to reset your Summit Chama password. Click below to set a new one:\n"
            f"{reset_link}\n"
            f"This link expires in 1 hour. If you didn't request this, ignore this email."
        )
        _send_email(user.email, "Reset Your Summit Chama Password", html_body)

    return jsonify({
        "message": "If an account exists for that email, a password reset link has been sent."
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Validates the reset token and updates the user's hashed password."""
    data = request.get_json(silent=True) or {}
    token_str = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token_str or len(new_password) < 8:
        return jsonify({"error": "A valid reset token and a password of at least 8 characters are required."}), 400

    record = EmailVerificationToken.query.filter_by(token=token_str).first()
    now = _utc_now()
    if not record or record.used_at is not None or record.expires_at < now:
        return jsonify({"error": "Invalid or expired password reset link."}), 400

    user = db.session.get(User, record.user_id)
    if not user:
        return jsonify({"error": "User not found for this password reset request."}), 404

    user.password = generate_password_hash(new_password)
    record.used_at = now
    db.session.commit()
    return jsonify({"message": "Password reset successfully! You can now log in with your new password."}), 200
