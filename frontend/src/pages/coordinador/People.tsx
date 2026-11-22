import { Users } from "lucide-react";
import { useState } from "react";
import { api } from "../../api";
import { Card, EmptyState, ErrorBox, Loading, PageHeader, Table, Td, cx } from "../../components/ui";
import { useFetch } from "../../hooks";
import type { User } from "../../types";

const fetchUsers = () => api.get<User[]>("/users").then((r) => r.data);

export default function CoordPeople() {
  const { data, loading, error, reload } = useFetch(fetchUsers);
  const [tab, setTab] = useState<"estudiante" | "docente">("estudiante");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar la lista."} onRetry={reload} />;

  const rows = data.filter((u) => u.rol === tab);
  return (
    <>
      <PageHeader title="Estudiantes y docentes" description="Personas registradas en el sistema (datos ficticios de demostración)." />
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        {(["estudiante", "docente"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cx("rounded-md px-4 py-1.5 text-sm font-medium", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
            {t === "estudiante" ? "Estudiantes" : "Docentes"} ({data.filter((u) => u.rol === t).length})
          </button>
        ))}
      </div>
      <Card padded={false}>
        {rows.length === 0 ? <EmptyState icon={<Users className="h-6 w-6" />} title="No hay registros" /> : (
          <Table head={tab === "estudiante" ? ["Nombre", "Correo", "Grado"] : ["Nombre", "Correo"]}>
            {rows.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{u.nombre}</Td>
                <Td>{u.email}</Td>
                {tab === "estudiante" && <Td>{u.grado ?? "—"}</Td>}
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
