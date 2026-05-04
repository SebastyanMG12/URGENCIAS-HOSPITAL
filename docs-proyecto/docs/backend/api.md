# API Endpoints

Documentación interactiva completa disponible en `http://localhost:8000/docs`

---

## Autenticación

Todos los endpoints protegidos requieren header:

`Authorization: Bearer {firebase_id_token}`

---

## Pacientes `/patients`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/patients/register` | Público | Registrar nuevo paciente |
| GET | `/patients/` | Médico/Admin | Listar todos los pacientes |
| GET | `/patients/{id}` | Médico/Admin | Obtener paciente por ID |
| PATCH | `/patients/{id}` | Médico/Admin | Actualizar datos del paciente |
| GET | `/patients/companion/{code}` | Público | Consultar por código público |
| POST | `/patients/{id}/procedures` | Médico/Admin | Agregar procedimiento |
| GET | `/patients/{id}/procedures` | Médico/Admin | Listar procedimientos |

---

## Autenticación `/auth`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| POST | `/auth/verify` | Público | Verificar token Firebase |
| GET | `/auth/me` | Autenticado | Obtener usuario actual |
| POST | `/auth/set-role` | Admin | Asignar rol a usuario |

---

## Staff `/staff`

| Método | Endpoint | Acceso | Descripción |
|--------|----------|--------|-------------|
| GET | `/staff/` | Admin | Listar personal |
| GET | `/staff/audit` | Admin | Ver logs de auditoría |
| GET | `/staff/audit/{patient_id}` | Admin | Logs por paciente |

---

## Códigos de respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Creado correctamente |
| 400 | Error en los datos enviados |
| 401 | Sin autenticación |
| 403 | Sin permisos suficientes |
| 404 | Recurso no encontrado |
| 422 | Error de validación Pydantic |
| 500 | Error interno del servidor |