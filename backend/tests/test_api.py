from datetime import date, timedelta

from app.extensions import db
from app.models import User


def tomorrow(days=1):
    return (date.today() + timedelta(days=days)).isoformat()


# ---------- Autenticación ----------
def test_login_ok_and_role(client):
    res = client.post("/api/auth/login", json={"email": "coordinador@demo.edu.co", "password": "Coord123*"})
    assert res.status_code == 200
    assert res.get_json()["user"]["rol"] == "coordinador"


def test_login_wrong_password_and_validation(client):
    assert client.post("/api/auth/login", json={"email": "coordinador@demo.edu.co", "password": "mala"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "", "password": ""}).status_code == 422
    assert client.post("/api/auth/login", data="no-json").status_code == 400


def test_passwords_are_hashed(app):
    user = db.session.execute(db.select(User).filter_by(email="coordinador@demo.edu.co")).scalar_one()
    assert user.password_hash != "Coord123*"
    assert user.password_hash.startswith(("scrypt:", "pbkdf2:"))


def test_protected_routes_need_token_and_role(client, login):
    assert client.get("/api/dashboard").status_code == 401
    est = login("estudiante1@demo.edu.co", "estudiante")
    assert client.get("/api/users", headers=est).status_code == 403
    assert client.patch("/api/requests/1/aprobar", headers=est).status_code == 403
    doc = login("docente1@demo.edu.co", "docente")
    assert client.post("/api/requests", headers=doc, json={}).status_code == 403


# ---------- Flujo principal (criterio de aceptación del MVP) ----------
def test_full_flow(client, login):
    est = login("estudiante1@demo.edu.co", "estudiante")
    coord = login("coordinador@demo.edu.co", "coordinador")
    doc = login("docente1@demo.edu.co", "docente")

    areas = client.get("/api/areas", headers=est).get_json()
    mat = next(a for a in areas if a["nombre"] == "Matemáticas")

    # 1. El estudiante registra la solicitud
    res = client.post("/api/requests", headers=est, json={
        "area_id": mat["id"], "motivo": "Refuerzo de álgebra", "descripcion": "No comprendo la factorización de trinomios.",
    })
    assert res.status_code == 201
    req = res.get_json()
    assert req["estado"] == "pendiente"

    # 2. El coordinador la ve, la aprueba y asigna docente + horario
    pend = client.get("/api/requests?estado=pendiente", headers=coord).get_json()
    assert any(r["id"] == req["id"] for r in pend)
    assert client.patch(f"/api/requests/{req['id']}/aprobar", headers=coord).get_json()["estado"] == "aprobada"

    teachers = client.get("/api/users?rol=docente", headers=coord).get_json()
    teacher = next(t for t in teachers if t["email"] == "docente1@demo.edu.co")
    res = client.post(f"/api/requests/{req['id']}/programar", headers=coord, json={
        "teacher_id": teacher["id"], "fecha": tomorrow(10), "hora_inicio": "10:00", "hora_fin": "11:00",
    })
    assert res.status_code == 201
    session = res.get_json()
    assert client.get("/api/requests", headers=est).get_json()[0]["estado"] == "programada"

    # 3. El docente ve su agenda y registra asistencia
    agenda = client.get("/api/sessions?estado=programada", headers=doc).get_json()
    assert any(s["id"] == session["id"] for s in agenda)
    res = client.post(f"/api/sessions/{session['id']}/attendance", headers=doc, json={"estado": "asistio", "observaciones": "Buen avance."})
    assert res.status_code == 201
    assert res.get_json()["asistencia"]["estado"] == "asistio"
    # No se puede registrar dos veces
    assert client.post(f"/api/sessions/{session['id']}/attendance", headers=doc, json={"estado": "asistio"}).status_code == 409

    # 4. El estudiante consulta estado e historial
    hist = client.get("/api/sessions?estado=finalizada", headers=est).get_json()
    mine = next(s for s in hist if s["id"] == session["id"])
    assert mine["asistencia"]["estado"] == "asistio" and mine["asistencia"]["observaciones"] == "Buen avance."
    assert client.get("/api/requests", headers=est).get_json()[0]["estado"] == "finalizada"

    # El coordinador la ve en los registros de asistencia y en el dashboard
    assert any(s["id"] == session["id"] for s in client.get("/api/attendance", headers=coord).get_json())
    assert client.get("/api/dashboard", headers=coord).get_json()["total_estudiantes"] == 10


# ---------- Reglas de negocio ----------
def _new_request(client, headers, area_id, motivo="Apoyo en la materia", desc="Necesito apoyo con los temas vistos."):
    return client.post("/api/requests", headers=headers, json={"area_id": area_id, "motivo": motivo, "descripcion": desc}).get_json()


def test_no_overlap_for_teacher_or_student(client, login):
    coord = login("coordinador@demo.edu.co", "coordinador")
    e3 = login("estudiante3@demo.edu.co", "estudiante")
    e4 = login("estudiante4@demo.edu.co", "estudiante")
    area = client.get("/api/areas", headers=e3).get_json()[0]["id"]
    teachers = {t["email"]: t["id"] for t in client.get("/api/users?rol=docente", headers=coord).get_json()}

    r1 = _new_request(client, e3, area)
    r2 = _new_request(client, e4, area)
    r3 = _new_request(client, e3, area)
    fecha = tomorrow(20)

    ok = client.post(f"/api/requests/{r1['id']}/programar", headers=coord, json={
        "teacher_id": teachers["docente1@demo.edu.co"], "fecha": fecha, "hora_inicio": "09:00", "hora_fin": "10:00"})
    assert ok.status_code == 201

    # Mismo docente, horario solapado -> 409
    clash_teacher = client.post(f"/api/requests/{r2['id']}/programar", headers=coord, json={
        "teacher_id": teachers["docente1@demo.edu.co"], "fecha": fecha, "hora_inicio": "09:30", "hora_fin": "10:30"})
    assert clash_teacher.status_code == 409

    # Mismo estudiante, otro docente, horario solapado -> 409
    clash_student = client.post(f"/api/requests/{r3['id']}/programar", headers=coord, json={
        "teacher_id": teachers["docente2@demo.edu.co"], "fecha": fecha, "hora_inicio": "09:30", "hora_fin": "10:30"})
    assert clash_student.status_code == 409

    # Horario contiguo (sin solapamiento) -> permitido
    adjacent = client.post(f"/api/requests/{r2['id']}/programar", headers=coord, json={
        "teacher_id": teachers["docente1@demo.edu.co"], "fecha": fecha, "hora_inicio": "10:00", "hora_fin": "11:00"})
    assert adjacent.status_code == 201


def test_schedule_validations(client, login):
    coord = login("coordinador@demo.edu.co", "coordinador")
    e3 = login("estudiante3@demo.edu.co", "estudiante")
    area = client.get("/api/areas", headers=e3).get_json()[0]["id"]
    teacher = client.get("/api/users?rol=docente", headers=coord).get_json()[0]["id"]
    r = _new_request(client, e3, area)
    url = f"/api/requests/{r['id']}/programar"
    base = {"teacher_id": teacher, "fecha": tomorrow(15), "hora_inicio": "09:00", "hora_fin": "10:00"}
    assert client.post(url, headers=coord, json={**base, "hora_fin": "08:00"}).status_code == 422
    assert client.post(url, headers=coord, json={**base, "fecha": "2020-01-01"}).status_code == 422
    assert client.post(url, headers=coord, json={**base, "fecha": "no-es-fecha"}).status_code == 422
    assert client.post(url, headers=coord, json={**base, "teacher_id": 999999}).status_code == 422
    # Un estudiante no es un docente válido
    student_id = client.get("/api/users?rol=estudiante", headers=coord).get_json()[0]["id"]
    assert client.post(url, headers=coord, json={**base, "teacher_id": student_id}).status_code == 422


def test_request_validation_and_crud(client, login):
    est = login("estudiante3@demo.edu.co", "estudiante")
    other = login("estudiante4@demo.edu.co", "estudiante")
    area = client.get("/api/areas", headers=est).get_json()[0]["id"]
    assert client.post("/api/requests", headers=est, json={"area_id": area, "motivo": "ab", "descripcion": "corta"}).status_code == 422
    assert client.post("/api/requests", headers=est, json={"area_id": 9999, "motivo": "Motivo válido", "descripcion": "Descripción suficientemente larga."}).status_code == 422

    r = _new_request(client, est, area)
    # Editar la propia solicitud pendiente
    upd = client.put(f"/api/requests/{r['id']}", headers=est, json={"area_id": area, "motivo": "Motivo editado", "descripcion": "Descripción editada con más detalle."})
    assert upd.status_code == 200 and upd.get_json()["motivo"] == "Motivo editado"
    # Otro estudiante no puede tocarla
    assert client.delete(f"/api/requests/{r['id']}", headers=other).status_code == 403
    # Eliminar (cancelar) la propia
    assert client.delete(f"/api/requests/{r['id']}", headers=est).status_code == 200
    assert client.delete(f"/api/requests/{r['id']}", headers=est).status_code == 404


def test_reject_and_state_rules(client, login):
    coord = login("coordinador@demo.edu.co", "coordinador")
    est = login("estudiante3@demo.edu.co", "estudiante")
    area = client.get("/api/areas", headers=est).get_json()[0]["id"]
    r = _new_request(client, est, area)
    res = client.patch(f"/api/requests/{r['id']}/rechazar", headers=coord, json={"motivo_rechazo": "Cupo completo"})
    assert res.get_json()["estado"] == "rechazada"
    assert client.patch(f"/api/requests/{r['id']}/aprobar", headers=coord).status_code == 409
    # Una solicitud rechazada ya no puede modificarla el estudiante
    assert client.delete(f"/api/requests/{r['id']}", headers=est).status_code == 409


def test_attendance_rules(client, login):
    # La tutoría programada del seed (estudiante2 con docente1): otro docente no puede registrar
    doc1 = login("docente1@demo.edu.co", "docente")
    doc2 = login("docente2@demo.edu.co", "docente")
    sess = client.get("/api/sessions?estado=programada", headers=doc1).get_json()[0]
    assert client.post(f"/api/sessions/{sess['id']}/attendance", headers=doc2, json={"estado": "asistio"}).status_code == 403
    assert client.post(f"/api/sessions/{sess['id']}/attendance", headers=doc1, json={"estado": "otra"}).status_code == 422
    assert client.post(f"/api/sessions/{sess['id']}/attendance", headers=doc1, json={"estado": "no_asistio"}).status_code == 201


def test_dashboards_from_database(client, login):
    coord = client.get("/api/dashboard", headers=login("coordinador@demo.edu.co", "coordinador")).get_json()
    assert coord["total_docentes"] == 3 and coord["solicitudes_pendientes"] == 3 and coord["tutorias_programadas"] == 3
    doc = client.get("/api/dashboard", headers=login("docente1@demo.edu.co", "docente")).get_json()
    assert doc["tutorias_asignadas"] == 2 and doc["sesiones_realizadas"] == 1
    est = client.get("/api/dashboard", headers=login("estudiante2@demo.edu.co", "estudiante")).get_json()
    assert est["solicitudes_realizadas"] == 2 and len(est["proximas_tutorias"]) == 1 and len(est["ultimas_tutorias"]) == 1
