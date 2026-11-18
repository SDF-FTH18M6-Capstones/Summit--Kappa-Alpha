"""
Authentication, Registration, Email Verification, and Password Recovery Services.
Contains all database transactions and security checks for the 'auth' domain.
"""

from datetime import datetime, timedelta, timezone
import os
import re
import secrets

from flask_jwt_extended import create_access_token, create_refresh_token
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from werkzeug.security import check_password_hash, generate_password_hash

from app.models.models import Chama, EmailVerificationToken, Membership, User, db
from app.utils.exceptions import (
    AppError,
    handle_db_exception,
    require_positive_int,
    require_str,
    validate_alpha_text,
    validate_chama_name,
    validate_email,
    validate_password,
    validate_person_name,
    validate_reg_number,
)
from app.utils.schemas import Kenyan_Tel_Regex


def _utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _generate_unique_slug(chama_name):
    base_slug = re.sub(r"[^a-z0-9]+", "-", chama_name.strip().lower()).strip("-") or "chama"
    slug = base_slug
    counter = 1
    while Chama.query.filter_by(slug=slug).first() is not None:
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def _send_email(to_email, subject, html_content):
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
        f"<p>This verification link expires in 24 hours.</p>"
    )
    _send_email(user.email, "Verify Your Summit Chama Account", html_body)


def _attach_membership_context(user):
    membership = Membership.query.filter_by(user_id=user.id).first()
    payload = user.to_dict()
    payload["chama_id"] = membership.chama_id if membership else None
    payload["membership_id"] = membership.id if membership else None
    payload["membership_status"] = membership.status if membership else None
    return payload


def register_chama_service(data):
    chama_name = validate_chama_name(data.get("chama_name"), "Chama name")
    location = validate_alpha_text(data.get("location"), "Location", required=False, max_len=150)
    description = require_str(data, "description", "Description", required=False, max_len=2000)
    constitution = require_str(data, "constitution", "Constitution", required=False, max_len=10000)
    registration_number = validate_reg_number(data.get("registration_number"), "Registration number")
    logo_url = require_str(data, "logo_url", "Logo URL", required=False, max_len=500)

    full_name = validate_person_name(data.get("full_name"), "Full name")
    email = validate_email(data.get("email"))
    raw_phone = require_str(data, "phone_number", "Phone number", required=True, max_len=20)
    phone = raw_phone.replace(" ", "")
    profile_image_url = require_str(data, "profile_image_url", "Profile image URL", required=False, max_len=500)
    password = validate_password(data.get("password"))

    if not re.match(Kenyan_Tel_Regex, phone):
        raise AppError(
            "Please enter a valid Kenyan phone number (for example, 0712345678 or 254712345678).",
            400,
        )

    if User.query.filter_by(email=email).first():
        raise AppError("An account with this email address already exists. Please log in instead.", 409)

    if Chama.query.filter_by(name=chama_name).first():
        raise AppError(f"A Chama named '{chama_name}' is already registered. Please choose a different name.", 409)

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

        return {
            "message": "Chama registered successfully! Please check your email to verify your account before logging in.",
            "chama": new_chama.to_dict(),
            "user": admin_user.to_dict(),
        }
    except AppError:
        db.session.rollback()
        raise
    except Exception as exc:
        handle_db_exception(db, exc, "We could not complete your Chama registration. Please try again shortly.")


def register_member_service(data):
    chama_id = require_positive_int(data.get("chama_id"), "Chama ID")
    full_name = validate_person_name(data.get("full_name"), "Full name")
    email = validate_email(data.get("email"))
    raw_phone = require_str(data, "phone_number", "Phone number", required=True, max_len=20)
    phone = raw_phone.replace(" ", "")
    profile_image_url = require_str(data, "profile_image_url", "Profile image URL", required=False, max_len=500)
    password = validate_password(data.get("password"))

    if not re.match(Kenyan_Tel_Regex, phone):
        raise AppError(
            "Please enter a valid Kenyan phone number (for example, 0712345678 or 254712345678).",
            400,
        )

    chama = db.session.get(Chama, chama_id)
    if not chama:
        raise AppError("The Chama you selected could not be found.", 404)

    if User.query.filter_by(email=email).first():
        raise AppError("An account with this email address already exists. Please log in instead.", 409)

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

        return {
            "message": "Your member account has been created! Please verify your email and await Chama Admin approval.",
            "user": new_user.to_dict(),
            "membership": membership.to_dict(),
        }
    except AppError:
        db.session.rollback()
        raise
    except Exception as exc:
        handle_db_exception(db, exc, "We could not complete your member registration. Please try again shortly.")


def verify_email_service(token_raw):
    if not isinstance(token_raw, str) or not token_raw.strip():
        raise AppError("Verification token is missing from the link. Please use the full link sent to your email.", 400)

    token_str = token_raw.strip()
    record = EmailVerificationToken.query.filter_by(token=token_str).first()
    if not record:
        raise AppError("This verification link is invalid. Please request a new verification email.", 404)
    if record.used_at is not None:
        raise AppError("This verification link has already been used. You can proceed to log in.", 400)

    now = _utc_now()
    if record.expires_at < now:
        raise AppError("This verification link has expired. Please request a new verification email.", 400)

    user = db.session.get(User, record.user_id)
    if not user:
        raise AppError("No user account was found for this verification token.", 404)

    try:
        user.is_email_verified = True
        record.used_at = now
        db.session.commit()
        return {"message": "Your email has been verified successfully! You may now log in to your account."}
    except Exception as exc:
        handle_db_exception(db, exc, "We could not verify your email right now. Please try again.")


def resend_verification_service(data):
    email = validate_email(data.get("email"))
    try:
        user = User.query.filter_by(email=email).first()
        if user and not user.is_email_verified:
            _issue_verification_email(user)
            db.session.commit()
        return {
            "message": "If an unverified account exists for that email address, a new verification link has been sent."
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not send a verification email right now. Please try again.")


def login_service(data):
    email = validate_email(data.get("email"))
    password = require_str(data, "password", "Password", required=True, max_len=128)
    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        raise AppError("Invalid email address or password. Please check your credentials.", 401)
    if not user.is_active:
        raise AppError("Your account has been deactivated. Please contact your Chama Admin or platform support.", 403)
    if not user.is_email_verified:
        raise AppError("Your email address has not been verified yet. Please check your inbox for the verification link.", 403)
    user_payload = _attach_membership_context(user)
    return {
        "message": "Login successful.",
        "access_token": create_access_token(identity=str(user.id)),
        "refresh_token": create_refresh_token(identity=str(user.id)),
        "user": user_payload,
    }


def refresh_token_service(user_id):
    user = db.session.get(User, int(user_id))
    if not user or not user.is_active:
        raise AppError("Your account is inactive or no longer exists. Please log in again.", 401)
    return {
        "message": "Access token refreshed successfully.",
        "access_token": create_access_token(identity=str(user.id)),
    }


def get_current_user_service(user_id):
    user = db.session.get(User, int(user_id))
    if not user or not user.is_active:
        raise AppError("Authenticated user account was not found or is inactive.", 404)
    return {"user": _attach_membership_context(user)}


def forgot_password_service(data):
    email = validate_email(data.get("email"))
    try:
        user = User.query.filter_by(email=email).first()
        if user:
            token_str = secrets.token_urlsafe(32)
            reset_record = EmailVerificationToken(
                token=token_str,
                user_id=user.id,
                expires_at=_utc_now() + timedelta(hours=1),
                used_at=None,
            )
            db.session.add(reset_record)
            db.session.commit()
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
            reset_link = f"{frontend_url}/reset-password?token={token_str}"
            html_body = (
                f"Hello {user.full_name},"
                "Click the link below to reset your Summit Chama password (expires in 1 hour):"
                f"{reset_link}"
            )
            _send_email(user.email, "Reset Your Summit Chama Password", html_body)
        return {
            "message": "If an account exists for that email address, a password reset link has been sent."
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not process your password reset request. Please try again.")


def reset_password_service(data):
    token_str = require_str(data, "token", "Password reset token", required=True, max_len=255)
    new_password = validate_password(data.get("password"))
    record = EmailVerificationToken.query.filter_by(token=token_str).first()
    now = _utc_now()
    if not record:
        raise AppError("This password reset link is invalid. Please request a new reset email.", 404)
    if record.used_at is not None:
        raise AppError("This password reset link has already been used. Please request a new one.", 400)
    if record.expires_at < now:
        raise AppError("This password reset link has expired. Please request a new reset email.", 400)

    user = db.session.get(User, record.user_id)
    if not user:
        raise AppError("No user account was found for this password reset token.", 404)

    try:
        user.password = generate_password_hash(new_password)
        record.used_at = now
        db.session.commit()
        return {
            "message": "Your password has been reset successfully! You can now log in with your new password."
        }
    except Exception as exc:
        handle_db_exception(db, exc, "We could not reset your password due to a server error. Please try again.")
