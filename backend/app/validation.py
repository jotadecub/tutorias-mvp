from datetime import date, datetime, time

from flask import request


class ApiError(Exception):
    def __init__(self, message, status=400, fields=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.fields = fields or {}


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("El cuerpo de la petición debe ser un objeto JSON.")
    return data


def text_field(data, key, label, min_len=1, max_len=255, required=True):
    value = data.get(key)
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            raise ApiError(f"{label} es obligatorio.", 422, {key: "Campo obligatorio"})
        return None
    if not isinstance(value, str):
        raise ApiError(f"{label} debe ser texto.", 422, {key: "Debe ser texto"})
    value = value.strip()
    if len(value) < min_len:
        raise ApiError(f"{label} debe tener al menos {min_len} caracteres.", 422, {key: f"Mínimo {min_len} caracteres"})
    if len(value) > max_len:
        raise ApiError(f"{label} no puede superar {max_len} caracteres.", 422, {key: f"Máximo {max_len} caracteres"})
    return value


def int_field(data, key, label):
    value = data.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise ApiError(f"{label} es obligatorio.", 422, {key: "Campo obligatorio"})
    return value


def date_field(data, key, label) -> date:
    try:
        return datetime.strptime(str(data.get(key, "")), "%Y-%m-%d").date()
    except ValueError:
        raise ApiError(f"{label} no es una fecha válida (AAAA-MM-DD).", 422, {key: "Fecha no válida"})


def time_field(data, key, label) -> time:
    try:
        return datetime.strptime(str(data.get(key, "")), "%H:%M").time()
    except ValueError:
        raise ApiError(f"{label} no es una hora válida (HH:MM).", 422, {key: "Hora no válida"})
