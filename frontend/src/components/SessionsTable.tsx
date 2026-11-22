import { CalendarX } from "lucide-react";
import type { ReactNode } from "react";
import type { Rol, Session } from "../types";
import { formatDate } from "../utils";
import { AttendanceBadge, EmptyState, StatusBadge, Table, Td } from "./ui";

interface Props {
  sessions: Session[];
  viewer: Rol; // quién mira la tabla: define qué columnas de personas se muestran
  empty: { title: string; description?: string };
  withAttendance?: boolean;
  actions?: (s: Session) => ReactNode;
}

/** Tabla reutilizable de tutorías (agenda, programadas, historial). */
export default function SessionsTable({ sessions, viewer, empty, withAttendance, actions }: Props) {
  if (sessions.length === 0) return <EmptyState icon={<CalendarX className="h-6 w-6" />} {...empty} />;

  const showStudent = viewer !== "estudiante";
  const showTeacher = viewer !== "docente";
  const head = [
    "Fecha y hora", "Área",
    ...(showStudent ? ["Estudiante"] : []),
    ...(showTeacher ? ["Docente"] : []),
    "Estado",
    ...(withAttendance ? ["Asistencia", "Observaciones"] : []),
    ...(actions ? ["Acciones"] : []),
  ];

  return (
    <Table head={head}>
      {sessions.map((s) => (
        <tr key={s.id} className="hover:bg-slate-50/60">
          <Td>
            <p className="font-medium text-slate-900">{formatDate(s.fecha)}</p>
            <p className="text-xs text-slate-500">{s.hora_inicio} – {s.hora_fin}</p>
          </Td>
          <Td>
            <p className="text-slate-800">{s.area.nombre}</p>
            <p className="max-w-[16rem] truncate text-xs text-slate-500" title={s.motivo}>{s.motivo}</p>
          </Td>
          {showStudent && <Td>{s.estudiante.nombre}{s.estudiante.grado && <span className="block text-xs text-slate-500">{s.estudiante.grado}</span>}</Td>}
          {showTeacher && <Td>{s.docente.nombre}</Td>}
          <Td><StatusBadge estado={s.estado} /></Td>
          {withAttendance && (
            <>
              <Td>{s.asistencia ? <AttendanceBadge estado={s.asistencia.estado} /> : <span className="text-slate-400">Sin registrar</span>}</Td>
              <Td className="max-w-xs text-slate-600">{s.asistencia?.observaciones || <span className="text-slate-400">—</span>}</Td>
            </>
          )}
          {actions && <Td>{actions(s)}</Td>}
        </tr>
      ))}
    </Table>
  );
}
