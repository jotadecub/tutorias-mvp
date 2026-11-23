import { CalendarCheck, CalendarDays, ClipboardList, GraduationCap, History, LayoutDashboard, LogOut, Menu, Users, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ComponentType } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { Rol } from "../types";
import { initials } from "../utils";
import { cx } from "./ui";

interface NavItem { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean }

const NAV: Record<Rol, NavItem[]> = {
  coordinador: [
    { to: "/coordinador", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/coordinador/solicitudes", label: "Solicitudes", icon: ClipboardList },
    { to: "/coordinador/tutorias", label: "Tutorías programadas", icon: CalendarDays },
    { to: "/coordinador/asistencias", label: "Asistencias", icon: CalendarCheck },
    { to: "/coordinador/personas", label: "Estudiantes y docentes", icon: Users },
  ],
  docente: [
    { to: "/docente", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/docente/agenda", label: "Mi agenda", icon: CalendarDays },
  ],
  estudiante: [
    { to: "/estudiante", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/estudiante/solicitudes", label: "Mis solicitudes", icon: ClipboardList },
    { to: "/estudiante/tutorias", label: "Mis tutorías", icon: CalendarDays },
    { to: "/estudiante/historial", label: "Historial", icon: History },
  ],
};

const ROLE_LABEL: Record<Rol, string> = { coordinador: "Coordinador", docente: "Docente tutor", estudiante: "Estudiante" };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  if (!user) return null;

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-center gap-2.5 border-b border-slate-100 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
          <GraduationCap className="h-5 w-5" />
        </div>

        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">Tutorías</p>
            <p className="text-xs text-slate-500">Refuerzo académico</p>
          </div>
        )}

      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV[user.rol].map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cx(
                "flex items-center rounded-lg py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />

            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      {/* Acciones inferiores */}
      <div className="border-t border-slate-100 p-3 space-y-1">

        {/* Botón colapsar menú */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className={cx(
            "flex w-full items-center rounded-lg py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
          )}

          {!collapsed && <span>Colapsar menú</span>}
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cx(
            "flex w-full items-center rounded-lg py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>

      </div>
    </div>
  );

  return (
    <div className="flex h-full">
      <aside
        className={cx(
          "hidden shrink-0 border-r border-slate-200 transition-all duration-300 lg:block",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Abrir menú">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-slate-900">{user.nombre}</p>
              <p className="text-xs text-slate-500">{ROLE_LABEL[user.rol]}{user.grado ? ` · ${user.grado}` : ""}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{initials(user.nombre)}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
