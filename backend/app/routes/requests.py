from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..auth import current_user, roles_required
from ..extensions import db
from ..models import AcademicArea, Role, TutoringRequest, TutoringSession, User
from ..validation import ApiError, date_field, int_field, json_body, text_field, time_field

bp = Blueprint("requests", __name__, url_prefix="/api/requests")


def _get_request(request_id) -> TutoringRequest:
    obj = db.session.get(TutoringRequest, request_id)
    if not obj:
        raise ApiError("La solicitud no existe.", 404)
    return obj


def _own_pending(request_id, user) -> TutoringRequest:
    obj = _get_request(request_id)
    if obj.student_id != user.id:
        raise ApiError("Esta solicitud no te pertenece.", 403)
    if obj.estado != "pendiente":
        raise ApiError("Solo puedes modificar solicitudes pendientes.", 409)
    return obj


def _request_payload(data):
    area_id = int_field(data, "area_id", "El área académica")
    if not db.session.get(AcademicArea, area_id):
        raise ApiError("El área académica no existe.", 422, {"area_id": "Área no válida"})
    return {
        "area_id": area_id,
        "motivo": text_field(data, "motivo", "El motivo", min_len=5, max_len=150),
        "descripcion": text_field(data, "descripcion", "La descripción", min_len=10, max_len=1000),
    }


@bp.get("")
@roles_required("coordinador", "estudiante")
def list_requests():
    user = current_user()
    query = db.select(TutoringRequest).order_by(TutoringRequest.created_at.desc())
    if user.role.nombre == "estudiante":
        query = query.where(TutoringRequest.student_id == user.id)
    estado = request.args.get("estado")
    if estado:
        query = query.where(TutoringRequest.estado == estado)
    return jsonify([r.to_dict() for r in db.session.execute(query).scalars()])


@bp.post("")
@roles_required("estudiante")
def create_request():
    user = current_user()
    obj = TutoringRequest(student_id=user.id, estado="pendiente", **_request_payload(json_body()))
    db.session.add(obj)
    db.session.commit()
    return jsonify(obj.to_dict()), 201


@bp.put("/<int:request_id>")
@roles_required("estudiante")
def update_request(request_id):
    obj = _own_pending(request_id, current_user())
    for key, value in _request_payload(json_body()).items():
        setattr(obj, key, value)
    db.session.commit()
    return jsonify(obj.to_dict())


@bp.delete("/<int:request_id>")
@roles_required("estudiante")
def delete_request(request_id):
    obj = _own_pending(request_id, current_user())
    db.session.delete(obj)
    db.session.commit()
    return jsonify(ok=True)


@bp.patch("/<int:request_id>/aprobar")
@roles_required("coordinador")
def approve(request_id):
    obj = _get_request(request_id)
    if obj.estado != "pendiente":
        raise ApiError("Solo se pueden aprobar solicitudes pendientes.", 409)
    obj.estado = "aprobada"
    obj.motivo_rechazo = None
    db.session.commit()
    return jsonify(obj.to_dict())


@bp.patch("/<int:request_id>/rechazar")
@roles_required("coordinador")
def reject(request_id):
    obj = _get_request(request_id)
    if obj.estado not in ("pendiente", "aprobada"):
        raise ApiError("Esta solicitud ya no se puede rechazar.", 409)
    data = request.get_json(silent=True) or {}
    obj.motivo_rechazo = text_field(data, "motivo_rechazo", "El motivo del rechazo", max_len=255, required=False)
    obj.estado = "rechazada"
    db.session.commit()
    return jsonify(obj.to_dict())


def _overlap_exists(column, user_id, fecha, inicio, fin) -> bool:
    return (
        db.session.execute(
            db.select(TutoringSession.id).where(
                column == user_id,
                TutoringSession.fecha == fecha,
                TutoringSession.hora_inicio < fin,
                TutoringSession.hora_fin > inicio,
            )
        ).first()
        is not None
    )


@bp.post("/<int:request_id>/programar")
@roles_required("coordinador")
def schedule(request_id):
    """Aprueba (si aún está pendiente), asigna docente y programa la sesión."""
    data = json_body()
    obj = db.session.execute(
        db.select(TutoringRequest).where(TutoringRequest.id == request_id).with_for_update()
    ).scalar_one_or_none()
    if not obj:
        raise ApiError("La solicitud no existe.", 404)
    if obj.estado not in ("pendiente", "aprobada"):
        raise ApiError("Solo se pueden programar solicitudes pendientes o aprobadas.", 409)

    teacher_id = int_field(data, "teacher_id", "El docente tutor")
    teacher = db.session.get(User, teacher_id)
    if not teacher or teacher.role.nombre != "docente" or not teacher.activo:
        raise ApiError("El docente seleccionado no es válido.", 422, {"teacher_id": "Docente no válido"})

    fecha = date_field(data, "fecha", "La fecha")
    inicio = time_field(data, "hora_inicio", "La hora de inicio")
    fin = time_field(data, "hora_fin", "La hora de finalización")
    if fecha < date.today():
        raise ApiError("La fecha no puede ser anterior a hoy.", 422, {"fecha": "No puede ser pasada"})
    if fin <= inicio:
        raise ApiError("La hora de finalización debe ser posterior a la de inicio.", 422, {"hora_fin": "Debe ser posterior al inicio"})

    if _overlap_exists(TutoringSession.teacher_id, teacher.id, fecha, inicio, fin):
        raise ApiError("El docente ya tiene una tutoría en ese horario.", 409, {"teacher_id": "Horario ocupado"})
    if _overlap_exists(TutoringSession.student_id, obj.student_id, fecha, inicio, fin):
        raise ApiError("El estudiante ya tiene una tutoría en ese horario.", 409, {"fecha": "Horario ocupado para el estudiante"})

    session = TutoringSession(
        request_id=obj.id, teacher_id=teacher.id, student_id=obj.student_id,
        fecha=fecha, hora_inicio=inicio, hora_fin=fin, estado="programada",
    )
    obj.estado = "programada"
    obj.motivo_rechazo = None
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201
