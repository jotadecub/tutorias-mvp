import { api } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Card, ErrorBox, Loading, PageHeader } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { Session } from "../../types";

const fetchHistory = () => api.get<Session[]>("/sessions", { params: { estado: "finalizada" } }).then((r) => r.data);

export default function StudentHistory() {
  const { data, loading, error, reload } = useFetch(fetchHistory);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar tu historial."} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Historial de tutorías" description="Tutorías realizadas, con tu asistencia y las observaciones del docente." />
      <Card padded={false}>
        <SessionsTable sessions={data} viewer="estudiante" withAttendance empty={{ title: "Aún no tienes tutorías realizadas", description: "Tu historial aparecerá aquí después de tu primera tutoría." }} />
      </Card>
    </>
  );
}
