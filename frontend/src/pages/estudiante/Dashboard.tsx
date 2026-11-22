import { CalendarClock, ClipboardList, Hourglass } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader, StatCard } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { StudentDashboard as Data } from "../../types";

const fetchDashboard = () => api.get<Data>("/dashboard").then((r) => r.data);

export default function StudentDashboard() {
  const { data, loading, error, reload } = useFetch(fetchDashboard);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar el dashboard."} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Dashboard" description="Tus solicitudes y tutorías de refuerzo." action={<Link to="/estudiante/solicitudes" className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Nueva solicitud</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Solicitudes realizadas" value={data.solicitudes_realizadas} icon={<ClipboardList className="h-5 w-5" />} />
        <StatCard label="Solicitudes pendientes" value={data.solicitudes_pendientes} icon={<Hourglass className="h-5 w-5" />} tone="amber" />
        <StatCard label="Próximas tutorías" value={data.proximas_count} icon={<CalendarClock className="h-5 w-5" />} tone="emerald" />
      </div>
      <div className="space-y-6">
        <Card title="Próximas tutorías" padded={false} action={<Link to="/estudiante/tutorias" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver todas</Link>}>
          <SessionsTable sessions={data.proximas_tutorias} viewer="estudiante" empty={{ title: "No tienes tutorías programadas", description: "Cuando el coordinador programe tu solicitud aparecerá aquí." }} />
        </Card>
        <Card title="Últimas tutorías realizadas" padded={false} action={<Link to="/estudiante/historial" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver historial</Link>}>
          <SessionsTable sessions={data.ultimas_tutorias} viewer="estudiante" withAttendance empty={{ title: "Aún no tienes tutorías realizadas" }} />
        </Card>
      </div>
    </>
  );
}
