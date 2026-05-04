# Base de datos

Motor: PostgreSQL 17. Migraciones manejadas con Alembic.

---

## Tablas

### patients
Tabla principal del sistema. Almacena todos los datos del paciente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | VARCHAR (UUID) | Identificador único |
| internal_id | VARCHAR | ID interno formato PINT-XXXXXXX |
| public_code | VARCHAR | Código público para acompañante |
| name | VARCHAR | Nombre completo |
| doc_tipo | VARCHAR | Tipo de documento |
| doc_number | VARCHAR | Número de documento |
| phone | VARCHAR | Teléfono |
| reason | TEXT | Motivo de consulta |
| notes | TEXT | Notas adicionales |
| allergies | TEXT | Alergias conocidas |
| blood_type | VARCHAR | Tipo de sangre |
| triage_level | VARCHAR | Nivel de triage |
| data_consent | BOOLEAN | Consentimiento Ley 1581 |
| arrived | BOOLEAN | Confirmación de llegada |
| arrived_at | TIMESTAMP | Hora de llegada |
| admitted_at | TIMESTAMP | Hora de ingreso |
| discharged_at | TIMESTAMP | Hora de egreso |
| assigned_room | VARCHAR | Habitación asignada |
| assigned_bed | VARCHAR | Camilla asignada |
| attending_name | VARCHAR | Médico tratante |
| share_with_companion | BOOLEAN | Compartir historial |
| final_diagnosis | TEXT | Diagnóstico final |
| share_diagnosis | BOOLEAN | Compartir diagnóstico |
| created_at | TIMESTAMP | Fecha de registro |

---

### staff
Personal médico y administrativo con acceso al sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | VARCHAR (UUID) | Identificador único |
| firebase_uid | VARCHAR | UID de Firebase Auth |
| email | VARCHAR | Correo electrónico |
| display_name | VARCHAR | Nombre para mostrar |
| role | VARCHAR | Rol: `medico` o `admin` |
| created_at | TIMESTAMP | Fecha de registro |

---

### procedures
Procedimientos realizados a cada paciente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | VARCHAR (UUID) | Identificador único |
| patient_id | VARCHAR (FK) | Referencia a patients.id |
| description | TEXT | Descripción del procedimiento |
| performed_by | VARCHAR | Nombre del médico |
| created_at | TIMESTAMP | Fecha y hora |

---

### audit_logs
Registro de todas las acciones realizadas en el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | VARCHAR (UUID) | Identificador único |
| action | VARCHAR | Acción realizada |
| patient_id | VARCHAR (FK) | Paciente afectado |
| staff_id | VARCHAR (FK) | Usuario que realizó la acción |
| details | JSON | Campos modificados |
| created_at | TIMESTAMP | Fecha y hora |

---

## Relaciones

- `procedures.patient_id` → `patients.id`
- `audit_logs.patient_id` → `patients.id`
- `audit_logs.staff_id` → `staff.id`