import { Check, ClipboardList, Eye, X as XIcon, CalendarPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "../../api";
import { Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, StatusBadge, Table, Td, Textarea, cx } from "../../components/ui";
import { useFetch } from "../../hooks";
import { useToast } from "../../toast";
import type { RequestState, TutRequest, User } from "../../types";
import { REQUEST_LABEL, formatDateTime, todayISO } from "../../utils";

const fetchRequests = () => api.get<TutRequest[]>("/requests").then((r) => r.data);
const FILTERS: ("todas" | RequestState)[] = ["todas", "pendiente", "aprobada", "programada", "finalizada", "rechazada"];

type ModalState = { kind: "detail" | "schedule" | "reject"; request: TutRequest } | null;

export default function CoordRequests() {
  const { data, loading, error, reload } = useFetch(fetchRequests);
  const toast = useToast();
  const [filter, setFilter] = useState<"todas" | RequestState>("todas");
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar las solicitudes."} onRetry={reload} />;

  const rows = filter === "todas" ? data : data.filter((r) => r.estado === filter);
  const count = (f: string) => (f === "todas" ? data.length : data.filter((r) => r.estado === f).length);

  async function approve(r: TutRequest) {
    setBusyId(r.id);
    try {
      await api.patch(`/requests/${r.id}/aprobar`);
      toast.success(`Solicitud de ${r.estudiante.nombre} aprobada. Ahora puedes programar la tutoría.`);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader title="Solicitudes de tutoría" description="Revisa, aprueba o rechaza las solicitudes y programa las tutorías." />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cx("rounded-full px-3 py-1.5 text-sm font-medium transition-colors", filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50")}>
            {f === "todas" ? "Todas" : REQUEST_LABEL[f]} <span className={filter === f ? "text-indigo-200" : "text-slate-400"}>{count(f)}</span>
          </button>
        ))}
      </div>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No hay solicitudes en este estado" />
        ) : (
          <Table head={["Estudiante", "Área", "Fecha de solicitud", "Motivo", "Estado", "Acciones"]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td><p className="font-medium text-slate-900">{r.estudiante.nombre}</p><p className="text-xs text-slate-500">{r.estudiante.grado}</p></Td>
                <Td>{r.area.nombre}</Td>
                <Td className="whitespace-nowrap">{formatDateTime(r.fecha_solicitud)}</Td>
                <Td className="max-w-xs"><p className="truncate" title={r.motivo}>{r.motivo}</p></Td>
                <Td><StatusBadge estado={r.estado} /></Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "detail", request: r })}><Eye className="h-3.5 w-3.5" /> Ver</Button>
                    {r.estado === "pendiente" && (
                      <Button size="sm" variant="secondary" loading={busyId === r.id} onClick={() => approve(r)}><Check className="h-3.5 w-3.5" /> Aprobar</Button>
                    )}
                    {(r.estado === "pendiente" || r.estado === "aprobada") && (
                      <>
                        <Button size="sm" onClick={() => setModal({ kind: "schedule", request: r })}><CalendarPlus className="h-3.5 w-3.5" /> Programar</Button>
                        <Button size="sm" variant="danger" onClick={() => setModal({ kind: "reject", request: r })}><XIcon className="h-3.5 w-3.5" /> Rechazar</Button>
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {modal?.kind === "detail" && <DetailModal request={modal.request} onClose={() => setModal(null)} />}
      {modal?.kind === "schedule" && <ScheduleModal request={modal.request} onClose={() => setModal(null)} onDone={() => { setModal(null); void reload(); }} />}
      {modal?.kind === "reject" && <RejectModal request={modal.request} onClose={() => setModal(null)} onDone={() => { setModal(null); void reload(); }} />}
    </>
  );
}

function DetailModal({ request: r, onClose }: { request: TutRequest; onClose: () => void }) {
  return (
    <Modal title="Detalle de la solicitud" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      <dl className="space-y-3 text-sm">
        <Row label="Estudiante" value={`${r.estudiante.nombre}${r.estudiante.grado ? ` (${r.estudiante.grado})` : ""}`} />
        <Row label="Área" value={r.area.nombre} />
        <Row label="Fecha de solicitud" value={formatDateTime(r.fecha_solicitud)} />
        <Row label="Estado" value={<StatusBadge estado={r.estado} />} />
        <Row label="Motivo" value={r.motivo} />
        <Row label="Descripción" value={<span className="whitespace-pre-wrap">{r.descripcion}</span>} />
        {r.motivo_rechazo && <Row label="Motivo del rechazo" value={r.motivo_rechazo} />}
      </dl>
    </Modal>
  );
}
const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 text-slate-800">{value}</dd></div>
);

const fetchTeachers = () => api.get<User[]>("/users", { params: { rol: "docente" } }).then((r) => r.data);

function ScheduleModal({ request: r, onClose, onDone }: { request: TutRequest; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const teachers = useFetch(fetchTeachers);
  const [form, setForm] = useState({ teacher_id: "", fecha: todayISO(1), hora_inicio: "14:00", hora_fin: "15:00" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.teacher_id) next.teacher_id = "Selecciona un docente";
    if (!form.fecha) next.fecha = "Selecciona la fecha";
    else if (form.fecha < todayISO()) next.fecha = "La fecha no puede ser pasada";
    if (!form.hora_inicio) next.hora_inicio = "Obligatoria";
    if (!form.hora_fin) next.hora_fin = "Obligatoria";
    else if (form.hora_inicio && form.hora_fin <= form.hora_inicio) next.hora_fin = "Debe ser posterior al inicio";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await api.post(`/requests/${r.id}/programar`, { ...form, teacher_id: Number(form.teacher_id) });
      toast.success("Tutoría programada correctamente.");
      onDone();
    } catch (err) {
      setErrors(fieldErrors(err));
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Aprobar y programar tutoría" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="schedule-form" loading={saving}>Guardar programación</Button></>}>
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-medium text-slate-900">{r.estudiante.nombre} · {r.area.nombre}</p>
        <p className="text-slate-600">{r.motivo}</p>
      </div>
      <form id="schedule-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}
        <Field label="Docente tutor" error={errors.teacher_id}>
          <Select value={form.teacher_id} onChange={set("teacher_id")} invalid={!!errors.teacher_id} disabled={teachers.loading}>
            <option value="">{teachers.loading ? "Cargando docentes…" : "Selecciona un docente"}</option>
            {teachers.data?.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Fecha" error={errors.fecha}>
          <Input type="date" min={todayISO()} value={form.fecha} onChange={set("fecha")} invalid={!!errors.fecha} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora de inicio" error={errors.hora_inicio}><Input type="time" value={form.hora_inicio} onChange={set("hora_inicio")} invalid={!!errors.hora_inicio} /></Field>
          <Field label="Hora de finalización" error={errors.hora_fin}><Input type="time" value={form.hora_fin} onChange={set("hora_fin")} invalid={!!errors.hora_fin} /></Field>
        </div>
      </form>
    </Modal>
  );
}

function RejectModal({ request: r, onClose, onDone }: { request: TutRequest; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/requests/${r.id}/rechazar`, { motivo_rechazo: motivo });
      toast.success("Solicitud rechazada.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Rechazar solicitud" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="reject-form" variant="danger" loading={saving}>Rechazar solicitud</Button></>}>
      <form id="reject-form" onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">Vas a rechazar la solicitud de <strong>{r.estudiante.nombre}</strong> ({r.area.nombre}).</p>
        <Field label="Motivo del rechazo (opcional)" hint="El estudiante podrá ver este mensaje.">
          <Textarea rows={3} maxLength={255} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Ya existe un taller grupal sobre este tema." />
        </Field>
      </form>
    </Modal>
  );
}
