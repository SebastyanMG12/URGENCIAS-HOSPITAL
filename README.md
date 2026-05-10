# MVP URGENCIAS HOSPITAL
## Hospital de Ubaté

MVP WEB gestión de pacientes en urgencias.

## Tecnologías
- **Backend:** FastAPI, Python 3.12, SQLAlchemy async, PostgreSQL 17
- **Autenticación:** Firebase Auth (Google Sign-In)
- **Frontend:** HTML5, CSS3, JavaScript vanilla

## Instalación

1. Clona el repositorio
2. Copia `backend/.env.example` a `backend/.env` y configura las variables
3. Agrega tu `firebase-service-account.json` en la carpeta `backend/`
4. Instala dependencias:
```bash
   cd backend
   pip install -r requirements.txt
```
5. Ejecuta migraciones:
```bash
   alembic upgrade head
```
6. Inicia el servidor:
```bash
   uvicorn app.main:app --reload --port 8000
```

## Documentación
API disponible en `http://localhost:8000/docs`