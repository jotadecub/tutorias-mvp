from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..auth import current_user, roles_required
from ..extensions import db
from ..models import ATTENDANCE_STATES, Attendance, TutoringSession
from ..validation import ApiError, json_body, text_field

bp = Blueprint("sessions", __name__, url_prefix="/api")


def _scoped_query(user):
    query = db.select(TutoringSession)
    role = user.role.nombre
    if role == "docente":
        query = query.where(TutoringSession.teacher_id == user.id)
    elif role == "estudiante":
        query = query.where(TutoringSession.student_id == user.id)
    return query


@bp.get("/sessions")
@jwt_required()
def list_sessions():
    user = current_user()
    query = _scoped_query(user)
    estado = request.args.get("estado")
    if estado:
        query = query.where(TutoringSession.estado == estado)
    # Programadas: de la más próxima a la más lejana; finalizadas: las más recientes primero
    if estado == "finalizada":
        query = query.order_by(TutoringSession.fecha.desc(), TutoringSession.hora_inicio.desc())
    else:
        query = query.order_by(TutoringSession.fecha, TutoringSession.hora_inicio)
    return jsonify([s.to_dict() for s in db.session.execute(query).scalars()])


@bp.post("/sessions/<int:session_id>/attendance")
@roles_required("docente")
def register_attendance(session_id):
    user = current_user()
    session = db.session.execute(
        db.select(TutoringSession).where(TutoringSession.id == session_id).with_for_update()
    ).scalar_one_or_none()
    if not session:
        raise ApiError("La tutoría no existe.", 404)
    if session.teacher_id != user.id:
        raise ApiError("Esta tutoría no está asignada a ti.", 403)
    if session.attendance:
        raise ApiError("La asistencia de esta tutoría ya fue registrada.", 409)

    data = json_body()
    estado = data.get("estado")
    if estado not in ATTENDANCE_STATES:
        raise ApiError("El estado de asistencia no es válido.", 422, {"estado": "Elige asistió, no asistió o justificada"})
    obs = text_field(data, "observaciones", "Las observaciones", max_len=1000, required=False)

    record = Attendance(session_id=session.id, estado=estado, observaciones=obs, registered_by=user.id)
    session.estado = "finalizada"
    session.request.estado = "finalizada"
    db.session.add(record)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@bp.get("/attendance")
@roles_required("coordinador")
def list_attendance():
    query = (
        db.select(TutoringSession)
        .join(Attendance)
        .order_by(TutoringSession.fecha.desc(), TutoringSession.hora_inicio.desc())
    )
    return jsonify([s.to_dict() for s in db.session.execute(query).scalars()])
