# Sistema de Gestión Hospitalaria MVP
## Hospital de Ubaté

MVP web para la gestión de pacientes en urgencias, desarrollado con FastAPI + PostgreSQL en el backend y HTML/JavaScript en el frontend.

---

## Tecnologías utilizadas

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI, Python 3.12, SQLAlchemy async |
| Base de datos | PostgreSQL 17, Alembic |
| Autenticación | Firebase Auth, Google Sign-In |
| Frontend | HTML5, CSS3, JavaScript vanilla |
| Servidor | Uvicorn |

---

## Módulos del sistema

- **Pre-registro de pacientes** — formulario público sin autenticación
- **Panel médico** — gestión completa del paciente en urgencias
- **Panel administrativo** — gestión de usuarios y logs de auditoría  
- **Módulo acompañante** — seguimiento en tiempo real por código público

---

## Inicio rápido

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```

API disponible en `http://localhost:8000`  
Documentación interactiva en `http://localhost:8000/docs`