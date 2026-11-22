from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..auth import roles_required
from ..extensions import db
from ..models import AcademicArea, Role, User

bp = Blueprint("catalog", __name__, url_prefix="/api")


@bp.get("/areas")
@jwt_required()
def areas():
    rows = db.session.execute(db.select(AcademicArea).order_by(AcademicArea.nombre)).scalars()
    return jsonify([a.to_dict() for a in rows])


@bp.get("/users")
@roles_required("coordinador")
def users():
    rol = request.args.get("rol")
    query = db.select(User).join(Role).where(User.activo.is_(True))
    if rol in ("docente", "estudiante"):
        query = query.where(Role.nombre == rol)
    else:
        query = query.where(Role.nombre.in_(("docente", "estudiante")))
    rows = db.session.execute(query.order_by(User.nombre)).scalars()
    return jsonify([u.to_dict() for u in rows])
