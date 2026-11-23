import re

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..auth import roles_required
from ..extensions import db
from ..models import AcademicArea, Role, User
from ..validation import ApiError, json_body, text_field

bp = Blueprint("catalog", __name__, url_prefix="/api")


@bp.get("/areas")
@jwt_required()
def areas():
    rows = db.session.execute(db.select(AcademicArea).order_by(AcademicArea.nombre)).scalars()
    return jsonify([a.to_dict() for a in rows])


@bp.get("/users")
@roles_required("coordinador", "secretaria")
def users():
    rol = request.args.get("rol")
    query = db.select(User).join(Role).where(User.activo.is_(True))
    if rol in ("docente", "estudiante"):
        query = query.where(Role.nombre == rol)
    else:
        query = query.where(Role.nombre.in_(("docente", "estudiante")))
    rows = db.session.execute(query.order_by(User.nombre)).scalars()
    return jsonify([u.to_dict() for u in rows])


def _email_field(data, required=True):
    email = text_field(data, "email", "El correo", max_len=150, required=required)
    if email and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ApiError("El correo no es válido.", 422, {"email": "Correo no válido"})
    return email.lower() if email else None


def _target_user(user_id):
    user = db.session.get(User, user_id)
    if not user or not user.activo or user.role.nombre not in ("docente", "estudiante"):
        raise ApiError("La persona no existe.", 404)
    return user


def _email_in_use(email, exclude_id=None):
    query = db.select(User.id).where(db.func.lower(User.email) == email)
    if exclude_id is not None:
        query = query.where(User.id != exclude_id)
    return db.session.scalar(query) is not None


@bp.post("/users")
@roles_required("secretaria")
def create_user():
    data = json_body()
    rol = text_field(data, "rol", "El rol", max_len=20)
    if rol not in ("docente", "estudiante"):
        raise ApiError("Solo se pueden registrar docentes o estudiantes.", 422, {"rol": "Rol no válido"})

    nombre = text_field(data, "nombre", "El nombre", max_len=120)
    email = _email_field(data)
    password = text_field(data, "password", "La contraseña", min_len=8, max_len=128)
    grado = text_field(data, "grado", "El grado", max_len=20) if rol == "estudiante" else None

    if _email_in_use(email):
        raise ApiError("Ya existe una persona con ese correo.", 409, {"email": "Correo ya registrado"})

    user = User(nombre=nombre, email=email, role=db.session.scalar(db.select(Role).where(Role.nombre == rol)), grado=grado)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@bp.put("/users/<int:user_id>")
@roles_required("secretaria")
def update_user(user_id):
    data = json_body()
    user = _target_user(user_id)
    if "rol" in data:
        raise ApiError("No se puede cambiar el rol de una persona.", 422, {"rol": "Campo no editable"})

    if "nombre" in data:
        user.nombre = text_field(data, "nombre", "El nombre", max_len=120)
    if "email" in data:
        email = _email_field(data)
        if _email_in_use(email, exclude_id=user.id):
            raise ApiError("Ya existe una persona con ese correo.", 409, {"email": "Correo ya registrado"})
        user.email = email
    if "password" in data:
        user.set_password(text_field(data, "password", "La contraseña", min_len=8, max_len=128))
    if "grado" in data:
        if user.role.nombre != "estudiante":
            raise ApiError("El grado solo aplica a estudiantes.", 422, {"grado": "Campo no aplicable"})
        user.grado = text_field(data, "grado", "El grado", max_len=20)

    db.session.commit()
    return jsonify(user.to_dict())


@bp.delete("/users/<int:user_id>")
@roles_required("secretaria")
def delete_user(user_id):
    user = _target_user(user_id)
    user.activo = False
    db.session.commit()
    return jsonify(id=user.id, activo=False)
