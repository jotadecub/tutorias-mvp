# Tutorías y refuerzos académicos — MVP

Aplicación web para gestionar tutorías y refuerzos académicos en una institución educativa de Cimitarra (Santander).
Proyecto académico: la institución, las personas y los datos son **ficticios**.

**Flujo que cubre de principio a fin:** el estudiante solicita una tutoría → el coordinador la aprueba, asigna docente y programa fecha y hora → el docente consulta su agenda y registra la asistencia → el estudiante consulta el estado y el historial.

## Stack

| Capa | Tecnologías |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide React |
| Backend | Python, Flask, Flask-SQLAlchemy, Flask-CORS, Flask-JWT-Extended |
| Base de datos | PostgreSQL |

## Requisitos previos

- Python 3.10 o superior
- Node.js 20 o superior
- PostgreSQL 14 o superior en ejecución

## 1. Base de datos

Crea el usuario y las bases de datos (una para la app y otra para las pruebas):

```bash
psql -U postgres -c "CREATE USER tutorias WITH PASSWORD 'tutorias';"
psql -U postgres -c "CREATE DATABASE tutorias OWNER tutorias;"
psql -U postgres -c "CREATE DATABASE tutorias_test OWNER tutorias;"
```

Si usas otras credenciales, define `DATABASE_URL` (ver `backend/.env.example`).

## 2. Backend (puerto 5000)

```bash
cd backend
python -m venv .venv
# Linux/macOS:  source .venv/bin/activate
# Windows:      .venv\Scripts\activate
pip install -r requirements.txt

flask --app run reset-db     # crea las tablas y carga los datos de demostración
python run.py                # API en http://localhost:5000
```

Comandos de base de datos disponibles:

| Comando | Qué hace |
|---|---|
| `flask --app run init-db` | Crea las tablas si no existen |
| `flask --app run seed` | Carga los datos de demostración (solo si la base está vacía) |
| `flask --app run reset-db` | Borra todo, recrea las tablas y vuelve a cargar los datos |

Variables de entorno opcionales: `DATABASE_URL`, `JWT_SECRET_KEY`, `CORS_ORIGINS`.
Para esta primera versión se inicializa la base con `db.create_all()` (sin migraciones) para no agregar tecnologías fuera del stack.

## 3. Frontend (puerto 5173)

```bash
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

En desarrollo, Vite redirige `/api` al backend en `localhost:5000`. Si despliegas el API en otra URL, define `VITE_API_URL`.

## Credenciales de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Coordinador | `coordinador@demo.edu.co` | `Coord123*` |
| Docente (3) | `docente1@demo.edu.co` a `docente3@demo.edu.co` | `Docente123*` |
| Estudiante (10) | `estudiante1@demo.edu.co` a `estudiante10@demo.edu.co` | `Estudiante123*` |

La pantalla de login incluye botones que rellenan las credenciales de cada rol.

## Guion de demostración (escenario de aceptación)

1. **Estudiante** `estudiante1@demo.edu.co` → *Mis solicitudes* → *Nueva solicitud*: área Matemáticas, motivo y descripción → *Enviar*.
2. Cierra sesión. **Coordinador** → *Solicitudes* → en la nueva solicitud pulsa *Aprobar* y luego *Programar*.
   - Elige a **Laura Mendoza** con los valores por defecto: aparece el error "El docente ya tiene una tutoría en ese horario" (ya tiene una sesión mañana a las 14:00 en los datos de demostración).
   - Elige a **Carlos Peña** y guarda: la solicitud pasa a *Programada*.
3. Cierra sesión. **Docente** `docente2@demo.edu.co` (Carlos Peña) → *Mi agenda* → *Registrar asistencia* → *Asistió* + observaciones → *Guardar*.
4. Cierra sesión. **Estudiante** `estudiante1@demo.edu.co` → *Mis solicitudes* (estado *Finalizada*) y *Historial* (asistencia y observaciones).
5. **Coordinador** → *Asistencias* muestra el registro general.

Las fechas de los datos de demostración son relativas al día en que ejecutes `reset-db`, así que siempre hay tutorías próximas.

## Pruebas

```bash
cd backend
pytest
```

Las 11 pruebas usan la base `tutorias_test` y cubren el flujo completo, los permisos por rol, la validación de cruces de horario (docente y estudiante), las validaciones de entrada y el hash de contraseñas.
El frontend se verifica con `npm run build` (comprobación de tipos de TypeScript + compilación).

## Estructura

```
backend/
  app/
    __init__.py        # fábrica de la app, manejo de errores JSON
    config.py          # configuración (variables de entorno)
    models.py          # Role, User, AcademicArea, TutoringRequest, TutoringSession, Attendance
    auth.py            # decorador roles_required
    validation.py      # validaciones de entrada
    seed.py, cli.py    # datos de demostración y comandos init-db / seed / reset-db
    routes/            # auth, catalog, requests, sessions, dashboard
  tests/
  run.py
frontend/
  src/
    api.ts, auth.tsx, toast.tsx, hooks.ts, types.ts, utils.ts
    components/        # ui, Layout (sidebar + barra superior), ProtectedRoute, SessionsTable
    pages/             # Login, coordinador/, docente/, estudiante/
```

## Modelo de datos

`roles` 1—N `users` · `users` (estudiante) 1—N `tutoring_requests` N—1 `academic_areas` · `tutoring_requests` 1—1 `tutoring_sessions` (docente + estudiante + fecha + horas) 1—1 `attendance_records`.

Restricciones: correo único, `hora_fin > hora_inicio`, estados válidos con `CHECK`, una sesión por solicitud y una asistencia por sesión.

## API (resumen)

| Método y ruta | Rol |
|---|---|
| `POST /api/auth/login`, `GET /api/auth/me` | todos |
| `GET /api/dashboard`, `GET /api/areas` | todos |
| `GET /api/users?rol=docente\|estudiante` | coordinador |
| `GET /api/requests` | coordinador (todas), estudiante (propias) |
| `POST/PUT/DELETE /api/requests` | estudiante (solo solicitudes propias pendientes) |
| `PATCH /api/requests/:id/aprobar`, `PATCH /api/requests/:id/rechazar`, `POST /api/requests/:id/programar` | coordinador |
| `GET /api/sessions?estado=` | según rol |
| `POST /api/sessions/:id/attendance` | docente (solo sus tutorías) |
| `GET /api/attendance` | coordinador |

## Decisiones y límites del MVP

- **Autenticación:** JWT de 8 horas guardado en `localStorage`. Es suficiente para una demo; en producción convendría usar cookies `HttpOnly`.
- **Permisos:** se validan en el servidor en cada endpoint; el frontend solo oculta rutas.
- **Cruces de horario:** se bloquean para el docente y para el estudiante (se permiten sesiones contiguas, p. ej. 10:00–11:00 y 11:00–12:00). La solicitud se bloquea con `SELECT … FOR UPDATE` al programar.
- **Fuera de alcance:** correos, WhatsApp, apps móviles, recuperación de contraseña, reportes PDF, gráficos, calificaciones, pagos e integraciones.
