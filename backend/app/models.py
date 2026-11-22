from datetime import datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from .extensions import db

# Valores permitidos (se validan en la API y con restricciones CHECK en la base de datos)
REQUEST_STATES = ("pendiente", "aprobada", "rechazada", "programada", "finalizada")
SESSION_STATES = ("programada", "finalizada")
ATTENDANCE_STATES = ("asistio", "no_asistio", "justificada")
ROLE_NAMES = ("coordinador", "docente", "estudiante")


def utcnow():
    return datetime.now(timezone.utc)


class Role(db.Model):
    __tablename__ = "roles"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(30), unique=True, nullable=False)


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    grado = db.Column(db.String(20))  # solo estudiantes (ej. "9°")
    activo = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    role = db.relationship("Role")

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)

    def to_dict(self):
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "rol": self.role.nombre,
            "grado": self.grado,
        }


class AcademicArea(db.Model):
    __tablename__ = "academic_areas"
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(60), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "nombre": self.nombre}


class TutoringRequest(db.Model):
    __tablename__ = "tutoring_requests"
    __table_args__ = (
        db.CheckConstraint(
            "estado IN ('pendiente','aprobada','rechazada','programada','finalizada')",
            name="ck_request_estado",
        ),
    )
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    area_id = db.Column(db.Integer, db.ForeignKey("academic_areas.id"), nullable=False)
    motivo = db.Column(db.String(150), nullable=False)
    descripcion = db.Column(db.Text, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="pendiente", index=True)
    motivo_rechazo = db.Column(db.String(255))
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    student = db.relationship("User", foreign_keys=[student_id])
    area = db.relationship("AcademicArea")
    session = db.relationship("TutoringSession", back_populates="request", uselist=False)

    def to_dict(self):
        return {
            "id": self.id,
            "estudiante": {"id": self.student.id, "nombre": self.student.nombre, "grado": self.student.grado},
            "area": self.area.to_dict(),
            "motivo": self.motivo,
            "descripcion": self.descripcion,
            "estado": self.estado,
            "motivo_rechazo": self.motivo_rechazo,
            "fecha_solicitud": self.created_at.isoformat(),
            "sesion_id": self.session.id if self.session else None,
        }


class TutoringSession(db.Model):
    __tablename__ = "tutoring_sessions"
    __table_args__ = (
        db.CheckConstraint("hora_fin > hora_inicio", name="ck_session_horas"),
        db.CheckConstraint("estado IN ('programada','finalizada')", name="ck_session_estado"),
    )
    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey("tutoring_requests.id"), unique=True, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    fecha = db.Column(db.Date, nullable=False, index=True)
    hora_inicio = db.Column(db.Time, nullable=False)
    hora_fin = db.Column(db.Time, nullable=False)
    estado = db.Column(db.String(20), nullable=False, default="programada")
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    request = db.relationship("TutoringRequest", back_populates="session")
    teacher = db.relationship("User", foreign_keys=[teacher_id])
    student = db.relationship("User", foreign_keys=[student_id])
    attendance = db.relationship("Attendance", back_populates="session", uselist=False)

    def to_dict(self):
        a = self.attendance
        return {
            "id": self.id,
            "solicitud_id": self.request_id,
            "estudiante": {"id": self.student.id, "nombre": self.student.nombre, "grado": self.student.grado, "email": self.student.email},
            "docente": {"id": self.teacher.id, "nombre": self.teacher.nombre, "email": self.teacher.email},
            "area": self.request.area.to_dict(),
            "motivo": self.request.motivo,
            "fecha": self.fecha.isoformat(),
            "hora_inicio": self.hora_inicio.strftime("%H:%M"),
            "hora_fin": self.hora_fin.strftime("%H:%M"),
            "estado": self.estado,
            "asistencia": a.to_dict() if a else None,
        }


class Attendance(db.Model):
    __tablename__ = "attendance_records"
    __table_args__ = (
        db.CheckConstraint("estado IN ('asistio','no_asistio','justificada')", name="ck_attendance_estado"),
    )
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("tutoring_sessions.id"), unique=True, nullable=False)
    estado = db.Column(db.String(20), nullable=False)
    observaciones = db.Column(db.Text)
    registered_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)

    session = db.relationship("TutoringSession", back_populates="attendance")

    def to_dict(self):
        return {
            "id": self.id,
            "estado": self.estado,
            "observaciones": self.observaciones,
            "registrado_en": self.created_at.isoformat(),
        }
