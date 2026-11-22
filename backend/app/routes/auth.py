from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, jwt_required

from ..auth import current_user
from ..extensions import db
from ..models import User
from ..validation import ApiError, json_body, text_field

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/login")
def login():
    data = json_body()
    email = text_field(data, "email", "El correo", max_len=150).lower()
    password = text_field(data, "password", "La contraseña", max_len=128)
    user = db.session.execute(db.select(User).filter_by(email=email)).scalar_one_or_none()
    if not user or not user.activo or not user.check_password(password):
        raise ApiError("Correo o contraseña incorrectos.", 401)
    token = create_access_token(identity=str(user.id), additional_claims={"rol": user.role.nombre})
    return jsonify(access_token=token, user=user.to_dict())


@bp.get("/me")
@jwt_required()
def me():
    return jsonify(user=current_user().to_dict())
