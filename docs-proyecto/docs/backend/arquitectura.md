# Arquitectura del backend

El backend sigue una arquitectura en capas basada en FastAPI con Python 3.12.

---

## Estructura de carpetas

    backend/
    ├── app/
    │   ├── main.py          — Punto de entrada, CORS, registro de routers
    │   ├── db.py            — Conexión async a PostgreSQL
    │   ├── dependencies.py  — Autenticación y control de roles
    │   ├── api/
    │   │   ├── patients.py  — Endpoints de pacientes
    │   │   ├── auth.py      — Endpoints de autenticación
    │   │   └── staff.py     — Endpoints de personal y auditoría
    │   └── models/
    │       ├── patient.py   — Modelo Patient y Procedure
    │       ├── staff.py     — Modelo Staff
    │       └── audit.py     — Modelo AuditLog
    ├── alembic/             — Migraciones de base de datos
    ├── .env                 — Variables de entorno
    └── requirements.txt     — Dependencias Python

---

## Flujo de una petición autenticada

1. El frontend envía `Authorization: Bearer {token}` en el header
2. `dependencies.py` valida el token con Firebase Admin SDK
3. Busca el usuario en la tabla `staff` de PostgreSQL
4. Verifica que el rol sea suficiente (`medico` o `admin`)
5. Ejecuta el endpoint y guarda un registro en `audit_logs`
6. Retorna la respuesta al frontend

---

## Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión async a PostgreSQL |
| `DATABASE_URL_SYNC` | URL de conexión sync para Alembic |
| `FIREBASE_CREDENTIALS_PATH` | Ruta al archivo de credenciales Firebase |
| `SECRET_KEY` | Clave secreta de la aplicación |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS |