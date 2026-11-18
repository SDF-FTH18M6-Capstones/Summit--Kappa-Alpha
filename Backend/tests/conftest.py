import os

# SQLAlchemy 2.1.x's compiled extension crashes under pytest in this environment.
# This must be set before SQLAlchemy is imported.
os.environ.setdefault("DISABLE_SQLALCHEMY_CEXT_RUNTIME", "1")
