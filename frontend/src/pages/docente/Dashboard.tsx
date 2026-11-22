import { CalendarCheck, CalendarClock, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { TeacherDashboard as Data } from "../../types";

const fetchDashboard = () => api.get<Data>("/dashboard").then((r) => r.data);

export default function TeacherDashboard() {
  const { data, loading, error, reload } = useFetch(fetchDashboard);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar el dashboard."} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Dashboard" description="Tu actividad como docente tutor." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Tutorías asignadas" value={data.tutorias_asignadas} icon={<ClipboardCheck className="h-5 w-5" />} />
        <StatCard label="Próximas sesiones" value={data.proximas_count} icon={<CalendarClock className="h-5 w-5" />} tone="amber" />
        <StatCard label="Sesiones realizadas" value={data.sesiones_realizadas} icon={<CalendarCheck className="h-5 w-5" />} tone="emerald" />
      </div>
      <Card title="Próximas sesiones" padded={false} action={<Link to="/docente/agenda" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ir a mi agenda</Link>}>
        <SessionsTable sessions={data.proximas_sesiones} viewer="docente" empty={{ title: "No tienes sesiones próximas", description: "Cuando el coordinador te asigne tutorías aparecerán aquí." }} />
      </Card>
    </>
  );
}
