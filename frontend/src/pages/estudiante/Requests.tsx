import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "../../api";
import { Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, StatusBadge, Table, Td, Textarea } from "../../components/ui";
import { useFetch } from "../../hooks";
import { useToast } from "../../toast";
import type { Area, TutRequest } from "../../types";
import { formatDateTime } from "../../utils";

const fetchRequests = () => api.get<TutRequest[]>("/requests").then((r) => r.data);

export default function StudentRequests() {
  const { data, loading, error, reload } = useFetch(fetchRequests);
  const toast = useToast();
  const [form, setForm] = useState<{ editing: TutRequest | null } | null>(null);
  const [toCancel, setToCancel] = useState<TutRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar tus solicitudes."} onRetry={reload} />;

  async function cancel() {
    if (!toCancel) return;
    setCancelling(true);
    try {
      await api.delete(`/requests/${toCancel.id}`);
      toast.success("Solicitud cancelada.");
      setToCancel(null);
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <PageHeader title="Mis solicitudes" description="Solicita una tutoría y consulta el estado de tus solicitudes."
        action={<Button onClick={() => setForm({ editing: null })}><Plus className="h-4 w-4" /> Nueva solicitud</Button>} />
      <Card padded={false}>
        {data.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Aún no has hecho solicitudes" description="Crea tu primera solicitud de tutoría con el botón “Nueva solicitud”." />
        ) : (
          <Table head={["Fecha", "Área", "Motivo", "Estado", "Acciones"]}>
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <Td className="whitespace-nowrap">{formatDateTime(r.fecha_solicitud)}</Td>
                <Td>{r.area.nombre}</Td>
                <Td className="max-w-sm">
                  <p className="font-medium text-slate-900">{r.motivo}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{r.descripcion}</p>
                </Td>
                <Td>
                  <StatusBadge estado={r.estado} />
                  {r.estado === "rechazada" && r.motivo_rechazo && <p className="mt-1 max-w-[14rem] text-xs text-rose-600">{r.motivo_rechazo}</p>}
                </Td>
                <Td>
                  {r.estado === "pendiente" ? (
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => setForm({ editing: r })}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => setToCancel(r)}><Trash2 className="h-3.5 w-3.5" /> Cancelar</Button>
                    </div>
                  ) : <span className="text-slate-400">—</span>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {form && <RequestModal editing={form.editing} onClose={() => setForm(null)} onDone={() => { setForm(null); void reload(); }} />}
      {toCancel && (
        <Modal title="Cancelar solicitud" onClose={() => setToCancel(null)}
          footer={<><Button variant="secondary" onClick={() => setToCancel(null)}>Volver</Button><Button variant="danger" loading={cancelling} onClick={cancel}>Sí, cancelar solicitud</Button></>}>
          <p className="text-sm text-slate-600">Se eliminará tu solicitud de <strong>{toCancel.area.nombre}</strong> ({toCancel.motivo}). Esta acción no se puede deshacer.</p>
        </Modal>
      )}
    </>
  );
}

const fetchAreas = () => api.get<Area[]>("/areas").then((r) => r.data);

function RequestModal({ editing, onClose, onDone }: { editing: TutRequest | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const areas = useFetch(fetchAreas);
  const [form, setForm] = useState({ area_id: editing ? String(editing.area.id) : "", motivo: editing?.motivo ?? "", descripcion: editing?.descripcion ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.area_id) next.area_id = "Selecciona un área académica";
    if (form.motivo.trim().length < 5) next.motivo = "Escribe un motivo de al menos 5 caracteres";
    if (form.descripcion.trim().length < 10) next.descripcion = "Describe tu dificultad (mínimo 10 caracteres)";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    const payload = { ...form, area_id: Number(form.area_id) };
    try {
      if (editing) await api.put(`/requests/${editing.id}`, payload);
      else await api.post("/requests", payload);
      toast.success(editing ? "Solicitud actualizada." : "Solicitud enviada. El coordinador la revisará pronto.");
      onDone();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Editar solicitud" : "Nueva solicitud de tutoría"} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="request-form" loading={saving}>{editing ? "Guardar cambios" : "Enviar solicitud"}</Button></>}>
      <form id="request-form" onSubmit={submit} noValidate className="space-y-4">
        <Field label="Área académica" error={errors.area_id}>
          <Select value={form.area_id} onChange={set("area_id")} invalid={!!errors.area_id} disabled={areas.loading}>
            <option value="">{areas.loading ? "Cargando áreas…" : "Selecciona un área"}</option>
            {areas.data?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Motivo de la solicitud" error={errors.motivo}>
          <Input maxLength={150} placeholder="Ej. Dificultad con ecuaciones lineales" value={form.motivo} onChange={set("motivo")} invalid={!!errors.motivo} />
        </Field>
        <Field label="Descripción del problema o dificultad" error={errors.descripcion}>
          <Textarea rows={4} maxLength={1000} placeholder="Cuéntanos qué temas no entiendes o en qué necesitas apoyo." value={form.descripcion} onChange={set("descripcion")} invalid={!!errors.descripcion} />
        </Field>
      </form>
    </Modal>
  );
}
