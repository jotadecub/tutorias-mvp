export type Rol = "coordinador" | "secretaria" | "docente" | "estudiante";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  grado?: string | null;
}

export interface Area { id: number; nombre: string }

export type RequestState = "pendiente" | "aprobada" | "rechazada" | "programada" | "finalizada";
export type AttendanceState = "asistio" | "no_asistio" | "justificada";

export interface TutRequest {
  id: number;
  estudiante: { id: number; nombre: string; grado?: string | null };
  area: Area;
  motivo: string;
  descripcion: string;
  estado: RequestState;
  motivo_rechazo?: string | null;
  fecha_solicitud: string;
  sesion_id?: number | null;
}

export interface Attendance {
  id: number;
  estado: AttendanceState;
  observaciones?: string | null;
  registrado_en: string;
}

export interface Session {
  id: number;
  solicitud_id: number;
  estudiante: { id: number; nombre: string; grado?: string | null; email: string };
  docente: { id: number; nombre: string; email: string };
  area: Area;
  motivo: string;
  fecha: string; // AAAA-MM-DD
  hora_inicio: string; // HH:MM
  hora_fin: string;
  estado: "programada" | "finalizada";
  asistencia: Attendance | null;
}

export interface CoordinatorDashboard {
  rol: "coordinador";
  total_estudiantes: number;
  total_docentes: number;
  solicitudes_pendientes: number;
  tutorias_programadas: number;
  ultimas_solicitudes: TutRequest[];
}
export interface TeacherDashboard {
  rol: "docente";
  tutorias_asignadas: number;
  sesiones_realizadas: number;
  proximas_count: number;
  proximas_sesiones: Session[];
}
export interface StudentDashboard {
  rol: "estudiante";
  solicitudes_realizadas: number;
  solicitudes_pendientes: number;
  proximas_count: number;
  proximas_tutorias: Session[];
  ultimas_tutorias: Session[];
}
