from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request

from .extensions import db
from .models import User


def current_user() -> User:
    return db.session.get(User, int(get_jwt_identity()))


def roles_required(*roles):
    """Exige un JWT válido y que el rol del token esté entre los permitidos."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            if get_jwt().get("rol") not in roles:
                return jsonify(error="No tienes permisos para esta acción."), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator
