from datetime import date

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..auth import current_user
from ..extensions import db
from ..models import Role, TutoringRequest, TutoringSession, User

bp = Blueprint("dashboard", __name__, url_prefix="/api")


def _count(query):
    return db.session.scalar(db.select(db.func.count()).select_from(query.subquery()))


def _upcoming(base_where, limit=5):
    query = (
        db.select(TutoringSession)
        .where(*base_where, TutoringSession.estado == "programada")
        .order_by(TutoringSession.fecha, TutoringSession.hora_inicio)
        .limit(limit)
    )
    return [s.to_dict() for s in db.session.execute(query).scalars()]


@bp.get("/dashboard")
@jwt_required()
def dashboard():
    user = current_user()
    role = user.role.nombre

    if role == "coordinador":
        users_by_role = lambda name: _count(db.select(User.id).join(Role).where(Role.nombre == name, User.activo.is_(True)))
        latest = db.session.execute(
            db.select(TutoringRequest).order_by(TutoringRequest.created_at.desc()).limit(5)
        ).scalars()
        return jsonify(
            rol=role,
            total_estudiantes=users_by_role("estudiante"),
            total_docentes=users_by_role("docente"),
            solicitudes_pendientes=_count(db.select(TutoringRequest.id).where(TutoringRequest.estado == "pendiente")),
            tutorias_programadas=_count(db.select(TutoringSession.id).where(TutoringSession.estado == "programada")),
            ultimas_solicitudes=[r.to_dict() for r in latest],
        )

    if role == "docente":
        mine = TutoringSession.teacher_id == user.id
        return jsonify(
            rol=role,
            tutorias_asignadas=_count(db.select(TutoringSession.id).where(mine)),
            sesiones_realizadas=_count(db.select(TutoringSession.id).where(mine, TutoringSession.estado == "finalizada")),
            proximas_count=_count(db.select(TutoringSession.id).where(mine, TutoringSession.estado == "programada")),
            proximas_sesiones=_upcoming([mine]),
        )

    mine_req = TutoringRequest.student_id == user.id
    mine = TutoringSession.student_id == user.id
    last_done = db.session.execute(
        db.select(TutoringSession)
        .where(mine, TutoringSession.estado == "finalizada")
        .order_by(TutoringSession.fecha.desc(), TutoringSession.hora_inicio.desc())
        .limit(5)
    ).scalars()
    return jsonify(
        rol=role,
        solicitudes_realizadas=_count(db.select(TutoringRequest.id).where(mine_req)),
        solicitudes_pendientes=_count(db.select(TutoringRequest.id).where(mine_req, TutoringRequest.estado == "pendiente")),
        proximas_count=_count(db.select(TutoringSession.id).where(mine, TutoringSession.estado == "programada")),
        proximas_tutorias=_upcoming([mine]),
        ultimas_tutorias=[s.to_dict() for s in last_done],
    )
