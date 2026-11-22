import { Navigate, Outlet } from "react-router-dom";
import { HOME_BY_ROLE, useAuth } from "../auth";
import type { Rol } from "../types";
import { Loading } from "./ui";

export default function ProtectedRoute({ role }: { role: Rol }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.rol !== role) return <Navigate to={HOME_BY_ROLE[user.rol]} replace />;
  return <Outlet />;
}
