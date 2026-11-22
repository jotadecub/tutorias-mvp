import { CalendarDays, ClipboardList, GraduationCap, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../api";
import { Card, ErrorBox, Loading, PageHeader, StatCard, StatusBadge, Table, Td } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { CoordinatorDashboard } from "../../types";
import { formatDateTime } from "../../utils";

const fetchDashboard = () => api.get<CoordinatorDashboard>("/dashboard").then((r) => r.data);

export default function CoordDashboard() {
  const { data, loading, error, reload } = useFetch(fetchDashboard);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar el dashboard."} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general de las tutorías y refuerzos académicos." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Estudiantes" value={data.total_estudiantes} icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard label="Docentes" value={data.total_docentes} icon={<Users className="h-5 w-5" />} tone="sky" />
        <StatCard label="Solicitudes pendientes" value={data.solicitudes_pendientes} icon={<ClipboardList className="h-5 w-5" />} tone="amber" />
        <StatCard label="Tutorías programadas" value={data.tutorias_programadas} icon={<CalendarDays className="h-5 w-5" />} tone="emerald" />
      </div>
      <Card title="Últimas solicitudes recibidas" padded={false} action={<Link to="/coordinador/solicitudes" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver todas</Link>}>
        {data.ultimas_solicitudes.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aún no hay solicitudes.</p>
        ) : (
          <Table head={["Estudiante", "Área", "Fecha", "Motivo", "Estado"]}>
            {data.ultimas_solicitudes.map((r) => (
              <tr key={r.id}>
                <Td className="font-medium text-slate-900">{r.estudiante.nombre}</Td>
                <Td>{r.area.nombre}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(r.fecha_solicitud)}</Td>
                <Td className="max-w-xs truncate">{r.motivo}</Td>
                <Td><StatusBadge estado={r.estado} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
