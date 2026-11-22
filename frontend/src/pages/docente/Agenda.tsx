import { ClipboardPen } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "../../api";
import SessionsTable from "../../components/SessionsTable";
import { Button, Card, ErrorBox, Field, Loading, Modal, PageHeader, Textarea, cx } from "../../components/ui";
import { useFetch } from "../../hooks";
import { useToast } from "../../toast";
import type { AttendanceState, Session } from "../../types";
import { ATTENDANCE_LABEL, formatDate } from "../../utils";

const fetchSessions = () => api.get<Session[]>("/sessions").then((r) => r.data);
const OPTIONS: AttendanceState[] = ["asistio", "no_asistio", "justificada"];

export default function TeacherAgenda() {
  const { data, loading, error, reload } = useFetch(fetchSessions);
  const [tab, setTab] = useState<"programada" | "finalizada">("programada");
  const [selected, setSelected] = useState<Session | null>(null);
  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudo cargar la agenda."} onRetry={reload} />;

  const upcoming = data.filter((s) => s.estado === "programada");
  const done = data.filter((s) => s.estado === "finalizada").sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  return (
    <>
      <PageHeader title="Mi agenda" description="Consulta tus tutorías asignadas y registra la asistencia de cada sesión." />
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        {([["programada", `Por registrar (${upcoming.length})`], ["finalizada", `Realizadas (${done.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={cx("rounded-md px-4 py-1.5 text-sm font-medium", tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>{label}</button>
        ))}
      </div>
      <Card padded={false}>
        {tab === "programada" ? (
          <SessionsTable sessions={upcoming} viewer="docente" empty={{ title: "No tienes tutorías pendientes", description: "Cuando el coordinador programe una tutoría contigo aparecerá aquí." }}
            actions={(s) => <Button size="sm" onClick={() => setSelected(s)}><ClipboardPen className="h-3.5 w-3.5" /> Registrar asistencia</Button>} />
        ) : (
          <SessionsTable sessions={done} viewer="docente" withAttendance empty={{ title: "Aún no has registrado sesiones" }} />
        )}
      </Card>
      {selected && <AttendanceModal session={selected} onClose={() => setSelected(null)} onDone={() => { setSelected(null); void reload(); }} />}
    </>
  );
}

function AttendanceModal({ session: s, onClose, onDone }: { session: Session; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [estado, setEstado] = useState<AttendanceState | "">("");
  const [observaciones, setObservaciones] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!estado) return setErrors({ estado: "Selecciona una opción" });
    setSaving(true);
    try {
      await api.post(`/sessions/${s.id}/attendance`, { estado, observaciones });
      toast.success("Asistencia registrada correctamente.");
      onDone();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Registrar asistencia" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="attendance-form" loading={saving}>Guardar registro</Button></>}>
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-900">{s.estudiante.nombre}{s.estudiante.grado ? ` · ${s.estudiante.grado}` : ""}</p>
        <p className="text-slate-600">{s.estudiante.email}</p>
        <p className="mt-1 text-slate-600">{s.area.nombre} · {formatDate(s.fecha)}, {s.hora_inicio} – {s.hora_fin}</p>
        <p className="text-slate-500">Motivo: {s.motivo}</p>
      </div>
      <form id="attendance-form" onSubmit={submit} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Asistencia</legend>
          <div className="grid grid-cols-3 gap-2">
            {OPTIONS.map((o) => (
              <label key={o} className={cx("cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors", estado === o ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300 text-slate-600 hover:bg-slate-50")}>
                <input type="radio" name="estado" value={o} checked={estado === o} onChange={() => { setEstado(o); setErrors({}); }} className="sr-only" />
                {ATTENDANCE_LABEL[o]}
              </label>
            ))}
          </div>
          {errors.estado && <p className="mt-1 text-xs text-rose-600">{errors.estado}</p>}
        </fieldset>
        <Field label="Observaciones (opcional)" error={errors.observaciones}>
          <Textarea rows={4} maxLength={1000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Temas trabajados, avances, recomendaciones…" />
        </Field>
      </form>
    </Modal>
  );
}
