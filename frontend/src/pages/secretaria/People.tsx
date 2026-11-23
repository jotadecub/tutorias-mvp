import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, errorMessage, fieldErrors } from "../../api";
import { Button, Card, EmptyState, ErrorBox, Field, Input, Loading, Modal, PageHeader, Table, Td, cx } from "../../components/ui";
import { useFetch } from "../../hooks";
import { useToast } from "../../toast";
import type { User } from "../../types";

type ManagedRole = "estudiante" | "docente";
const fetchPeople = () => api.get<User[]>("/users").then((r) => r.data);

type UserForm = { nombre: string; email: string; grado: string; password: string };

export default function SecretaryPeople() {
  const { data, loading, error, reload } = useFetch(fetchPeople);
  const toast = useToast();
  const [role, setRole] = useState<ManagedRole>("estudiante");
  const [modal, setModal] = useState<{ role: ManagedRole; user: User | null } | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "No se pudieron cargar las personas."} onRetry={reload} />;

  const rows = data.filter((user) => user.rol === role);
  const count = (filter: ManagedRole) => data.filter((user) => user.rol === filter).length;

  return (
    <>
      <PageHeader
        title="Gestión de estudiantes y docentes"
        description="Consulta, registra y actualiza las cuentas de estudiantes y docentes."
        action={<Button onClick={() => setModal({ role, user: null })}><Plus className="h-4 w-4" /> Nuevo {role}</Button>}
      />
      <div className="mb-4 inline-flex rounded-lg bg-slate-100 p-1">
        {(["estudiante", "docente"] as const).map((item) => (
          <button
            key={item}
            onClick={() => setRole(item)}
            className={cx("rounded-md px-4 py-1.5 text-sm font-medium", role === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}
          >
            {item === "estudiante" ? "Estudiantes" : "Docentes"} ({count(item)})
          </button>
        ))}
      </div>
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title={`No hay ${role === "estudiante" ? "estudiantes" : "docentes"} registrados`} />
        ) : (
          <Table head={role === "estudiante" ? ["Nombre", "Correo", "Grado", "Acciones"] : ["Nombre", "Correo", "Acciones"]}>
            {rows.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/60">
                <Td className="font-medium text-slate-900">{user.nombre}</Td>
                <Td>{user.email}</Td>
                {role === "estudiante" && <Td>{user.grado ?? "—"}</Td>}
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setModal({ role, user })}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(user)}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {modal && (
        <PersonModal
          role={modal.role}
          user={modal.user}
          onClose={() => setModal(null)}
          onDone={() => { setModal(null); void reload(); }}
        />
      )}
      {deleting && (
        <Modal
          title={`Eliminar ${deleting.rol}`}
          onClose={() => setDeleting(null)}
          footer={<>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api.delete(`/users/${deleting.id}`);
                  toast.success(`${deleting.rol === "estudiante" ? "Estudiante" : "Docente"} eliminado.`);
                  setDeleting(null);
                  await reload();
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Eliminar
            </Button>
          </>}
        >
          <p className="text-sm text-slate-600">
            ¿Eliminar a <strong>{deleting.nombre}</strong>? Su cuenta se desactivará y no podrá iniciar sesión; el historial asociado se conservará.
          </p>
        </Modal>
      )}
    </>
  );
}

function PersonModal({ role, user, onClose, onDone }: { role: ManagedRole; user: User | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<UserForm>({
    nombre: user?.nombre ?? "",
    email: user?.email ?? "",
    grado: user?.grado ?? "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (key: keyof UserForm) => (e: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.nombre.trim()) next.nombre = "El nombre es obligatorio";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Ingresa un correo válido";
    if (role === "estudiante" && !form.grado.trim()) next.grado = "El grado es obligatorio";
    if ((!user || form.password) && form.password.length < 8) next.password = "La contraseña debe tener al menos 8 caracteres";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    const payload: Record<string, string> = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
    };
    if (role === "estudiante") payload.grado = form.grado.trim();
    if (form.password) payload.password = form.password;

    setSaving(true);
    try {
      if (user) {
        await api.put(`/users/${user.id}`, payload);
        toast.success(`${role === "estudiante" ? "Estudiante" : "Docente"} actualizado.`);
      } else {
        await api.post("/users", { ...payload, password: form.password, rol: role });
        toast.success(`${role === "estudiante" ? "Estudiante" : "Docente"} creado.`);
      }
      onDone();
    } catch (e) {
      setErrors(fieldErrors(e));
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  const label = role === "estudiante" ? "estudiante" : "docente";
  return (
    <Modal
      title={user ? `Editar ${label}` : `Nuevo ${label}`}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="person-form" loading={saving}>{user ? "Guardar cambios" : `Crear ${label}`}</Button>
      </>}
    >
      <form id="person-form" onSubmit={submit} noValidate className="space-y-4">
        {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}
        <Field label="Nombre completo" error={errors.nombre}>
          <Input maxLength={120} value={form.nombre} onChange={set("nombre")} invalid={!!errors.nombre} />
        </Field>
        <Field label="Correo electrónico" error={errors.email}>
          <Input type="email" maxLength={150} value={form.email} onChange={set("email")} invalid={!!errors.email} />
        </Field>
        {role === "estudiante" && (
          <Field label="Grado" error={errors.grado}>
            <Input maxLength={20} placeholder="Ej. 9°" value={form.grado} onChange={set("grado")} invalid={!!errors.grado} />
          </Field>
        )}
        <Field
          label={user ? "Nueva contraseña (opcional)" : "Contraseña"}
          error={errors.password}
          hint={user ? "Déjala vacía para conservar la contraseña actual." : "Mínimo 8 caracteres."}
        >
          <Input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!errors.password} />
        </Field>
      </form>
    </Modal>
  );
}
