import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { Session } from "../../types";

const fetchSessions = () => api.get<Session[]>("/sessions", { params: { estado: "programada" } }).then((r) => r.data);

export default function CoordSessions() {
  const { data, loading, error, reload } = useFetch(fetchSessions);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar las tutorías."} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Tutorías programadas" description="Sesiones pendientes de realizarse, ordenadas por fecha." />
      <Card padded={false}>
        <SessionsTable sessions={data} viewer="coordinador" empty={{ title: "No hay tutorías programadas", description: "Programa una desde la sección de solicitudes." }} />
      </Card>
    </>
  );
}
