"""Datos ficticios de demostración. No contienen información real de personas."""
from datetime import date, datetime, time, timedelta, timezone

from .extensions import db
from .models import (
    ROLE_NAMES, AcademicArea, Attendance, Role, TutoringRequest, TutoringSession, User,
)

PASSWORDS = {
    "coordinador": "Coord123*",
    "secretaria": "Secretaria123*",
    "docente": "Docente123*",
    "estudiante": "Estudiante123*",
}

AREAS = ["Matemáticas", "Inglés", "Lenguaje", "Ciencias"]

COORDINADOR = ("Andrés Ramírez (Coordinador)", "coordinador@demo.edu.co")
SECRETARIA = ("Secretaría", "secretaria@demo.edu.co")
DOCENTES = [
    ("Laura Mendoza", "docente1@demo.edu.co"),
    ("Carlos Peña", "docente2@demo.edu.co"),
    ("Marta Gómez", "docente3@demo.edu.co"),
]
ESTUDIANTES = [
    ("Valentina Rojas", "9°"), ("Santiago Herrera", "8°"), ("Camila Duarte", "10°"),
    ("Mateo Cárdenas", "7°"), ("Isabela Ortiz", "11°"), ("Samuel Pineda", "9°"),
    ("Luciana Vargas", "8°"), ("Emiliano Torres", "10°"), ("Mariana Salazar", "7°"),
    ("Joaquín Mejía", "11°"),
]


def seed_database():
    roles = {n: Role(nombre=n) for n in ROLE_NAMES}
    db.session.add_all(roles.values())
    areas = {n: AcademicArea(nombre=n) for n in AREAS}
    db.session.add_all(areas.values())

    def make_user(nombre, email, rol, grado=None):
        u = User(nombre=nombre, email=email, role=roles[rol], grado=grado)
        u.set_password(PASSWORDS[rol])
        db.session.add(u)
        return u

    make_user(*COORDINADOR, "coordinador")
    make_user(*SECRETARIA, "secretaria")
    docentes = [make_user(n, e, "docente") for n, e in DOCENTES]
    estudiantes = [
        make_user(n, f"estudiante{i}@demo.edu.co", "estudiante", g)
        for i, (n, g) in enumerate(ESTUDIANTES, start=1)
    ]
    db.session.flush()

    now = datetime.now(timezone.utc)
    today = date.today()
    est = lambda i: estudiantes[i - 1]

    def add_request(student, area, motivo, descripcion, estado, days_ago, rechazo=None):
        r = TutoringRequest(
            student_id=student.id, area_id=areas[area].id, motivo=motivo, descripcion=descripcion,
            estado=estado, motivo_rechazo=rechazo, created_at=now - timedelta(days=days_ago, hours=days_ago),
        )
        db.session.add(r)
        db.session.flush()
        return r

    def add_session(req, teacher, offset_days, start, end, attendance=None, obs=None):
        s = TutoringSession(
            request_id=req.id, teacher_id=teacher.id, student_id=req.student_id,
            fecha=today + timedelta(days=offset_days), hora_inicio=time(*start), hora_fin=time(*end),
            estado="finalizada" if attendance else "programada",
        )
        db.session.add(s)
        db.session.flush()
        if attendance:
            db.session.add(Attendance(session_id=s.id, estado=attendance, observaciones=obs, registered_by=teacher.id))

    # Pendientes
    add_request(est(3), "Matemáticas", "Dificultad con ecuaciones lineales", "No entiendo cómo despejar la incógnita cuando hay fracciones en la ecuación.", "pendiente", 0)
    add_request(est(4), "Inglés", "Pronunciación y vocabulario", "Necesito practicar conversación básica y ampliar vocabulario para la evaluación oral.", "pendiente", 1)
    add_request(est(5), "Ciencias", "Preparación para evaluación de química", "Tengo dudas sobre balanceo de ecuaciones químicas y estequiometría.", "pendiente", 2)
    # Rechazada y aprobada
    add_request(est(6), "Lenguaje", "Corrección de ortografía", "Quiero reforzar el uso de tildes y signos de puntuación.", "rechazada", 4,
                rechazo="Ya existe un taller grupal de ortografía los miércoles; se recomienda asistir.")
    add_request(est(7), "Matemáticas", "Refuerzo en geometría", "Me cuesta calcular áreas y perímetros de figuras compuestas.", "aprobada", 3)
    # Programadas
    add_session(add_request(est(2), "Matemáticas", "Problemas de proporcionalidad", "Quiero practicar regla de tres y porcentajes.", "programada", 5), docentes[0], 1, (14, 0), (15, 0))
    add_session(add_request(est(8), "Inglés", "Gramática: tiempos verbales", "Confundo el presente perfecto con el pasado simple.", "programada", 4), docentes[1], 2, (14, 0), (15, 0))
    add_session(add_request(est(9), "Lenguaje", "Comprensión de lectura", "Me cuesta identificar la idea principal de los textos.", "programada", 3), docentes[2], 3, (15, 0), (16, 0))
    # Finalizadas (con asistencia)
    add_session(add_request(est(1), "Lenguaje", "Análisis de textos narrativos", "Necesito apoyo para analizar personajes y narrador.", "finalizada", 14), docentes[2], -10, (14, 0), (15, 0), "asistio", "Participó activamente y completó la guía de práctica.")
    add_session(add_request(est(10), "Matemáticas", "Funciones y gráficas", "Dudas con la representación gráfica de funciones.", "finalizada", 12), docentes[0], -5, (14, 0), (15, 0), "no_asistio", "No se presentó a la sesión.")
    add_session(add_request(est(2), "Inglés", "Vocabulario técnico", "Quiero reforzar vocabulario para el proyecto de ciencias.", "finalizada", 9), docentes[1], -3, (15, 0), (16, 0), "justificada", "El estudiante avisó por cita médica; se sugiere reprogramar.")

    db.session.commit()


def seed_secretary_account():
    email = SECRETARIA[1]
    if db.session.execute(db.select(User.id).filter_by(email=email)).first():
        return False

    role = db.session.execute(db.select(Role).filter_by(nombre="secretaria")).scalar_one_or_none()
    if role is None:
        role = Role(nombre="secretaria")
        db.session.add(role)
        db.session.flush()

    user = User(nombre=SECRETARIA[0], email=email, role=role)
    user.set_password(PASSWORDS["secretaria"])
    db.session.add(user)
    db.session.commit()
    return True
