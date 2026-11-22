import type { AttendanceState, RequestState } from "./types";

export const REQUEST_LABEL: Record<RequestState, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  programada: "Programada",
  finalizada: "Finalizada",
};

export const ATTENDANCE_LABEL: Record<AttendanceState, string> = {
  asistio: "Asistió",
  no_asistio: "No asistió",
  justificada: "Justificada",
};

/** "2026-11-25" -> "mié, 25 nov 2026" (sin desfase de zona horaria) */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name: string): string {
  return name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
