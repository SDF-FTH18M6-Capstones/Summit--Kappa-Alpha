from datetime import timedelta
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # Database & JWT Configuration
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///chama.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-prod")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    app.config["JWT_REFRESH_TOKEN_EXPIRES"] = timedelta(days=7)

    # Initialize Extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Import Models so Flask-Migrate detects all 17 tables
    from app import models  # noqa: F401

    # Register Sprint 2 Blueprints
    from app.routes.chamas import chamas_bp
    from app.routes.finance import finance_bp
    from app.routes.operations import operations_bp

    app.register_blueprint(chamas_bp)                         # Already has url_prefix="/api"
    app.register_blueprint(finance_bp)                        # Routes already start with "/api/..."
    app.register_blueprint(operations_bp, url_prefix="/api")  # Adds "/api" prefix to operations routes

    # Global JSON Error Handlers
    @app.errorhandler(404)
    def not_found(err):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(err):
        return jsonify({"error": "Internal server error"}), 500

    return app
