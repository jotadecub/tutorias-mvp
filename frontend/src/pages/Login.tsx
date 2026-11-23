import { GraduationCap, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../api";
import { HOME_BY_ROLE, useAuth } from "../auth";
import { Button, Field, Input } from "../components/ui";

const DEMO = [
  { rol: "Coordinador", email: "coordinador@demo.edu.co", password: "Coord123*" },
  { rol: "Secretaria", email: "secretaria@demo.edu.co", password: "Secretaria123*" },
  { rol: "Docente", email: "docente1@demo.edu.co", password: "Docente123*" },
  { rol: "Estudiante", email: "estudiante1@demo.edu.co", password: "Estudiante123*" },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={HOME_BY_ROLE[user.rol]} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Ingresa un correo válido";
    if (!password) next.password = "Ingresa tu contraseña";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const u = await login(email.trim(), password);
      navigate(HOME_BY_ROLE[u.rol], { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><GraduationCap className="h-6 w-6" /></div>
          <h1 className="text-2xl font-semibold text-slate-900">Tutorías y refuerzos académicos</h1>
          <p className="mt-1 text-sm text-slate-500">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{formError}</div>}
          <Field label="Correo electrónico" error={errors.email}>
            <Input type="email" autoComplete="username" placeholder="tu.correo@institucion.edu.co" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
          </Field>
          <Field label="Contraseña" error={errors.password}>
            <Input type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
          </Field>
          <Button type="submit" loading={loading} className="w-full"><LogIn className="h-4 w-4" /> Iniciar sesión</Button>
        </form>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Cuentas de demostración</p>
          <div className="space-y-1.5">
            {DEMO.map((d) => (
              <button key={d.rol} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); setErrors({}); setFormError(""); }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100">
                <span className="font-medium text-slate-700">{d.rol}</span>
                <span className="text-xs text-slate-500">{d.email}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">Haz clic para rellenar el formulario. Datos ficticios.</p>
        </div>
      </div>
    </div>
  );
}
