# Estructura del frontend

El frontend es HTML5 + CSS3 + JavaScript vanilla, sin frameworks.

---

## Páginas HTML

| Archivo | Acceso | Descripción |
|---------|--------|-------------|
| `index.html` | Público | Formulario de pre-registro de pacientes |
| `login.html` | Público | Autenticación con Google |
| `dashboard-medico.html` | Médico | Panel de gestión de pacientes |
| `dashboard-admin.html` | Admin | Panel administrativo |
| `companion.html` | Público | Seguimiento por código público |

---

## Módulos JavaScript

| Archivo | Descripción |
|---------|-------------|
| `api.js` | Cliente HTTP centralizado |
| `auth.js` | Gestión de sesión y roles |
| `firebase-config.js` | Configuración Firebase |
| `login.js` | Lógica de autenticación |
| `main.js` | Registro de pacientes |
| `staff-panel.js` | Panel médico completo |
| `companion.js` | Vista del acompañante |
| `modals.js` | Sistema de modales |
| `utils.js` | Utilidades generales |
| `validators.js` | Validación de formularios |
| `storage.js` | Gestión de localStorage |
| `audit.js` | Visualización de auditoría |

---

## Comunicación con el backend

Todo pasa por `api.js`. Ningún otro módulo llama directamente al backend.