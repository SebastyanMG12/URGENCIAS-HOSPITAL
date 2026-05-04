# Módulos JavaScript

---

## api.js — Cliente HTTP centralizado
Único módulo que se comunica con el backend. Expone todas las funciones en `window.eseb.api`.

| Función | Descripción |
|---------|-------------|
| `registerPatient(data)` | Registrar nuevo paciente |
| `getAllPatients()` | Obtener lista de pacientes |
| `updatePatient(id, data)` | Actualizar datos del paciente |
| `addProcedure(id, desc, by)` | Agregar procedimiento |
| `getProcedures(id)` | Obtener procedimientos |
| `getPatientByPublicCode(code)` | Buscar por código público |
| `verifyAndLogin(token)` | Verificar sesión en backend |
| `getMe()` | Obtener usuario actual |
| `getAllStaff()` | Listar personal |
| `getAuditLogs()` | Ver logs de auditoría |

---

## auth.js — Gestión de sesión
Maneja la sesión del usuario en el navegador usando `sessionStorage`.

| Función | Descripción |
|---------|-------------|
| `currentSession()` | Retorna sesión activa con rol |
| `saveSessionSnapshot()` | Guarda sesión después del login |
| `clearSession()` | Cierra sesión |

---

## staff-panel.js — Panel médico
Contiene toda la lógica del dashboard médico.

| Función | Descripción |
|---------|-------------|
| `showPatientDetail(id)` | Muestra detalle completo del paciente |
| `openArrivalModal()` | Modal confirmar llegada |
| `openAssignRoomModal()` | Modal asignar habitación/camilla |
| `openAssignDoctorModal()` | Modal asignar médico |
| `openAdmitModal()` | Modal marcar ingreso |
| `openDischargeModal()` | Modal marcar egreso |
| `openCompanionModal()` | Modal datos acompañante |
| `openDiagnosisModal()` | Modal diagnóstico final |

---

## companion.js — Vista acompañante
Consulta el estado del paciente usando el código público.

---

## utils.js — Utilidades
Funciones de uso general en todo el sistema.

| Función | Descripción |
|---------|-------------|
| `escapeHtml(str)` | Previene XSS |
| `uid()` | Genera ID único local |
| `formatDate(date)` | Formatea fechas |