"""
Centralized Security Validators and Domain Exception Classes.

Protects all services against:
  - Type-confusion / dictionary-injection payloads (e.g. {"email": {"$ne": ""}})
  - Numeric-only or symbol-only person names, Chama names, and locations
  - Invalid registration numbers, malformed email addresses, and weak passwords
  - SQL LIKE wildcard abuse (% and _)
  - Raw database exception leakage
"""

import re
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$")
PERSON_NAME_REGEX = re.compile(r"^(?=(?:.*[A-Za-z]){2,})[A-Za-z][A-Za-z\s'.-]{1,149}$")
CHAMA_NAME_REGEX = re.compile(r"^(?=(?:.*[A-Za-z]){2,})[A-Za-z][A-Za-z\s&'.-]{2,149}$")
ALPHA_TEXT_REGEX = re.compile(r"^(?=(?:.*[A-Za-z]){2,})[A-Za-z][A-Za-z\s&',.()-]{1,199}$")
REG_NUMBER_REGEX = re.compile(r"^[A-Za-z0-9/-]{3,50}$")


class AppError(Exception):
    """Base application exception carrying an HTTP status code and user-friendly message."""

    def __init__(self, message, status_code=400, errors=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.errors = errors


def require_str(data, field_name, label=None, required=True, max_len=255):
    """
    Safely extract and sanitize a string field from a JSON payload.
    Blocks non-string injection payloads (dicts, lists, booleans, ints).
    """
    display = label or field_name.replace("_", " ").capitalize()
    if not isinstance(data, dict):
        raise AppError("Invalid request body. Expected a JSON object.", 400)

    raw = data.get(field_name)
    if raw is None or (isinstance(raw, str) and raw.strip() == ""):
        if required:
            raise AppError(f"{display} is required and cannot be blank.", 400)
        return None

    if not isinstance(raw, str):
        raise AppError(f"{display} must be a valid text string.", 400)

    cleaned = raw.strip()
    if len(cleaned) > max_len:
        raise AppError(f"{display} must not exceed {max_len} characters.", 400)

    return cleaned


def validate_person_name(name_raw, label="Full name"):
    """Ensure a person's name contains alphabets only (no numbers or symbols like '12345')."""
    cleaned = require_str({"val": name_raw}, "val", label=label, required=True, max_len=150)
    if not PERSON_NAME_REGEX.match(cleaned):
        raise AppError(
            f"{label} must contain letters only (spaces, hyphens, and apostrophes allowed) and cannot include numbers.",
            400,
        )
    return " ".join(cleaned.split())


def validate_chama_name(name_raw, label="Chama name"):
    """Ensure a Chama name contains alphabets only (no numbers or symbols)."""
    cleaned = require_str({"val": name_raw}, "val", label=label, required=True, max_len=150)
    if not CHAMA_NAME_REGEX.match(cleaned):
        raise AppError(
            f"{label} must be 3–150 characters long and contain letters only (no numbers).",
            400,
        )
    return " ".join(cleaned.split())


def validate_alpha_text(value_raw, label="Field", required=False, max_len=150):
    """Ensure text fields like location contain letters only (no numbers)."""
    cleaned = require_str({"val": value_raw}, "val", label=label, required=required, max_len=max_len)
    if cleaned is None:
        return None
    if not ALPHA_TEXT_REGEX.match(cleaned):
        raise AppError(f"{label} must contain letters only and cannot include numbers.", 400)
    return " ".join(cleaned.split())


def validate_reg_number(value_raw, label="Registration number"):
    """Ensure registration numbers use valid alphanumeric, hyphen, or slash characters (e.g. CHM-2026-5467)."""
    cleaned = require_str({"val": value_raw}, "val", label=label, required=False, max_len=50)
    if cleaned is None:
        return None
    if not REG_NUMBER_REGEX.match(cleaned):
        raise AppError(
            f"{label} must be 3–50 characters using letters, numbers, hyphens, or slashes only (e.g. CHM-2026-5467).",
            400,
        )
    return cleaned.upper()


def validate_email(email_raw):
    """Enforce strict string type and valid email address format (e.g. name@example.com)."""
    if not isinstance(email_raw, str) or not email_raw.strip():
        raise AppError("A valid email address is required.", 400)

    email = email_raw.strip().lower()
    if len(email) > 255 or not EMAIL_REGEX.match(email):
        raise AppError(
            "Please enter a valid email address (for example, member@example.com).",
            400,
        )
    return email


def validate_password(password_raw):
    """Enforce strict password complexity to prevent weak or type-confused passwords."""
    if not isinstance(password_raw, str) or not password_raw:
        raise AppError("Password is required.", 400)

    if not PASSWORD_REGEX.match(password_raw):
        raise AppError(
            "Password must be 8–128 characters long and include at least one uppercase letter, "
            "one lowercase letter, one number, and one special character (e.g. Pass@123).",
            400,
        )
    return password_raw


def require_positive_int(value, label="ID"):
    """Safely parse a positive integer ID without allowing booleans or negative numbers."""
    if isinstance(value, bool):
        raise AppError(f"{label} must be a valid positive number.", 400)
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        raise AppError(f"{label} must be a valid positive number.", 400)

    if parsed <= 0:
        raise AppError(f"{label} must be greater than zero.", 400)
    return parsed


def escape_like(term):
    """Escape SQL LIKE wildcards (%, _, \\) so user search terms cannot manipulate wildcard matching."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def handle_db_exception(db, exc, fallback_message):
    """Safely roll back a failed SQLAlchemy transaction without exposing raw SQL internals."""
    db.session.rollback()
    if isinstance(exc, IntegrityError):
        raise AppError(
            "This operation conflicts with an existing record or violates a data constraint.",
            409,
        )
    if isinstance(exc, SQLAlchemyError):
        raise AppError(fallback_message, 500)
    raise AppError(fallback_message, 500)
