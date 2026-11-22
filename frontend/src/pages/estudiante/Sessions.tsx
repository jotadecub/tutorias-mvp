import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { Session } from "../../types";

const fetchSessions = () => api.get<Session[]>("/sessions", { params: { estado: "programada" } }).then((r) => r.data);

export default function StudentSessions() {
  const { data, loading, error, reload } = useFetch(fetchSessions);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar tus tutorías."} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Mis tutorías" description="Tutorías programadas con su docente, fecha y horario." />
      <Card padded={false}>
        <SessionsTable sessions={data} viewer="estudiante" empty={{ title: "No tienes tutorías programadas", description: "Cuando el coordinador programe una de tus solicitudes aparecerá aquí." }} />
      </Card>
    </>
  );
}
