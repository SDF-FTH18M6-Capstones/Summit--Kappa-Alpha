"""
Cloudinary Media & Document Upload Routes.

Provides a single authenticated endpoint for uploading profile avatars, Chama logos,
project images, announcement banners, and meeting minute PDFs/scans:
  - POST /api/uploads : Accepts multipart/form-data ('file'), validates extension and size,
                        uploads to Cloudinary (or falls back locally in dev if unconfigured),
                        and returns {"url": "<secure_url>"}.
"""

import io
import os
import uuid
import cloudinary
import cloudinary.uploader
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import jwt_required
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.utils import secure_filename

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit
MAX_IMAGE_SIZE = (800, 800)
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def _resize_image(file):
    """Shrink an image to fit within 800x800 in memory. Returns a BytesIO.
    Never upscales, keeps aspect ratio. Raises ValueError if not a real image."""
    try:
        img = Image.open(file)
        fmt = img.format
        img = ImageOps.exif_transpose(img)
    except (UnidentifiedImageError, OSError):
        raise ValueError("The file is not a valid image.")
    if fmt not in ALLOWED_IMAGE_FORMATS:
        raise ValueError("Only JPEG, PNG or WEBP images are allowed.")
    img.thumbnail(MAX_IMAGE_SIZE)
    if fmt == "JPEG" and img.mode != "RGB":
        img = img.convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format=fmt, optimize=True)
    buf.seek(0)
    return buf


def _allowed_file(filename):
    """Return True only when the file has a supported image or PDF extension."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _configure_cloudinary():
    """Configure Cloudinary from .env credentials. Returns True if credentials are present."""
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        return False

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    return True


@uploads_bp.route("/uploads", methods=["POST"])
@uploads_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_file():
    """
    Upload an image (PNG, JPG, JPEG, WEBP) or PDF document to Cloudinary.
    Expects multipart/form-data with field name 'file' and optional 'folder' text field.
    Images are resized to at most 800x800 before upload; PDFs are uploaded unchanged.
    ---
    tags:
      - Uploads
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: PNG, JPG, JPEG, WEBP image or PDF, max 5 MB
      - name: folder
        in: formData
        type: string
        required: false
        description: Cloudinary folder (default summit-chama)
    responses:
      201:
        description: Uploaded; returns the secure URL
      400:
        description: Missing file, unsupported type, too large or invalid image
      401:
        description: Missing or invalid JWT
      500:
        description: Upload failed
    """
    if "file" not in request.files:
        return jsonify({
            "error": "No file was attached. Please select an image or PDF file under the 'file' field."
        }), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({
            "error": "The selected file has no filename. Please choose a valid image or PDF."
        }), 400

    if not _allowed_file(file.filename):
        return jsonify({
            "error": "Unsupported file format. Allowed formats are: PNG, JPG, JPEG, WEBP, and PDF."
        }), 400

    # Enforce 5 MB maximum upload size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE_BYTES:
        return jsonify({
            "error": "File is too large. Maximum allowed upload size is 5 MB."
        }), 400

    folder = (request.form.get("folder") or "summit-chama").strip()
    safe_name = secure_filename(file.filename)

    is_pdf = safe_name.lower().endswith(".pdf")
    try:
        payload = file if is_pdf else _resize_image(file)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        # Upload to Cloudinary when credentials are configured in .env
        if _configure_cloudinary():
            result = cloudinary.uploader.upload(
                payload,
                folder=folder,
                resource_type="auto",  # Handles both images and PDFs cleanly
                public_id=f"{uuid.uuid4().hex}_{safe_name.rsplit('.', 1)[0]}",
            )
            return jsonify({
                "message": "File uploaded successfully.",
                "url": result["secure_url"],
                "public_id": result.get("public_id"),
            }), 201

        # Local fallback when CLOUDINARY_* keys are omitted in local development
        static_upload_dir = os.path.join(current_app.root_path, "static", "uploads")
        os.makedirs(static_upload_dir, exist_ok=True)
        unique_filename = f"{uuid.uuid4().hex}_{safe_name}"
        local_path = os.path.join(static_upload_dir, unique_filename)
        if is_pdf:
            file.save(local_path)
        else:
            with open(local_path, "wb") as fh:
                fh.write(payload.getvalue())

        local_url = f"{request.host_url.rstrip('/')}/static/uploads/{unique_filename}"
        return jsonify({
            "message": "File uploaded locally (Cloudinary keys not configured).",
            "url": local_url,
        }), 201

    except Exception as exc:
        return jsonify({
            "error": "We could not upload your file due to a server error. Please try again.",
            "details": str(exc),
        }), 500
