import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { Session } from "../../types";

const fetchAttendance = () => api.get<Session[]>("/attendance").then((r) => r.data);

export default function CoordAttendance() {
  const { data, loading, error, reload } = useFetch(fetchAttendance);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar los registros."} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Registros de asistencia" description="Historial general de tutorías con su asistencia y observaciones." />
      <Card padded={false}>
        <SessionsTable sessions={data} viewer="coordinador" withAttendance empty={{ title: "Aún no hay asistencias registradas", description: "Aparecerán aquí cuando los docentes registren sus sesiones." }} />
      </Card>
    </>
  );
}
