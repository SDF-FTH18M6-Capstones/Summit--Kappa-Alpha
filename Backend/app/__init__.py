import os
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Database configuration (defaults to instance/chama.db locally)
    database_url = os.getenv("DATABASE_URL", "sqlite:///chama.db")
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT configuration
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-prod")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    # Initialize extensions
    db.init_app(app)
    from app.models import models  # noqa: F401 — registers all 17 models with Alembic
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": os.getenv("FRONTEND_URL", "*")}})

    # Register domain blueprints
    from app.auth.routes import auth_bp
    from app.chamas.routes import chamas_bp
    from app.finance.routes import finance_bp
    from app.operations.routes import operations_bp
    from app.utils.uploads import uploads_bp
    

    app.register_blueprint(auth_bp)
    app.register_blueprint(chamas_bp)
    app.register_blueprint(finance_bp)
    app.register_blueprint(operations_bp, url_prefix="/api")
    app.register_blueprint(uploads_bp)

    # Standard JWT error handlers
    @jwt.unauthorized_loader
    def missing_token_callback(err):
        return jsonify({"error": "Authentication required. Please log in.", "details": err}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(err):
        return jsonify({"error": "Invalid authentication token. Please log in again.", "details": err}), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Your session has expired. Please log in again."}), 401

    return app
