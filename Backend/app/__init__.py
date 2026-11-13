from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chama.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['JWT_SECRET_KEY'] = 'your_secret_key'
    app.config['JWT_ACCESS_TOKEN_LOCATION'] = ['headers']
    # Existing signed tokens use numeric user IDs as their subject.
    app.config['JWT_VERIFY_SUB'] = False


    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from app import models
    from app.routes.finance import finance_bp
    app.register_blueprint(finance_bp)
    from app.routes.operations import operations_bp
    app.register_blueprint(operations_bp, url_prefix="/api")
    return app