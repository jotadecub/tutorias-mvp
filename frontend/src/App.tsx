import { Navigate, Route, Routes } from "react-router-dom";
import { HOME_BY_ROLE, useAuth } from "./auth";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { Loading } from "./components/ui";
import Login from "./pages/Login";
import CoordAttendance from "./pages/coordinador/Attendance";
import CoordDashboard from "./pages/coordinador/Dashboard";
import CoordPeople from "./pages/coordinador/People";
import CoordRequests from "./pages/coordinador/Requests";
import CoordSessions from "./pages/coordinador/Sessions";
import TeacherAgenda from "./pages/docente/Agenda";
import TeacherDashboard from "./pages/docente/Dashboard";
import StudentDashboard from "./pages/estudiante/Dashboard";
import StudentHistory from "./pages/estudiante/History";
import StudentRequests from "./pages/estudiante/Requests";
import StudentSessions from "./pages/estudiante/Sessions";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={user ? HOME_BY_ROLE[user.rol] : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />

      <Route element={<ProtectedRoute role="coordinador" />}>
        <Route path="/coordinador" element={<Layout />}>
          <Route index element={<CoordDashboard />} />
          <Route path="solicitudes" element={<CoordRequests />} />
          <Route path="tutorias" element={<CoordSessions />} />
          <Route path="asistencias" element={<CoordAttendance />} />
          <Route path="personas" element={<CoordPeople />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="docente" />}>
        <Route path="/docente" element={<Layout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="agenda" element={<TeacherAgenda />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="estudiante" />}>
        <Route path="/estudiante" element={<Layout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="solicitudes" element={<StudentRequests />} />
          <Route path="tutorias" element={<StudentSessions />} />
          <Route path="historial" element={<StudentHistory />} />
        </Route>
      </Route>

      <Route path="*" element={<Home />} />
    </Routes>
  );
}
