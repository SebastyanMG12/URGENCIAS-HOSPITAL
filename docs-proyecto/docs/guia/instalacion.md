# Instalación y configuración

## Requisitos previos

- Python 3.12
- PostgreSQL 17
- Node.js (opcional, para Live Server)
- Cuenta de Firebase con proyecto configurado

---

## Instalación del backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

---

## Configuración de variables de entorno

Crea el archivo `.env` en la carpeta `backend/`:
DATABASE_URL=postgresql+asyncpg://usuario:contraseña@localhost:5432/hospital_eseb
DATABASE_URL_SYNC=postgresql+psycopg2://usuario:contraseña@localhost:5432/hospital_eseb
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
SECRET_KEY=clave_secreta_segura
ALLOWED_ORIGINS=["http://localhost:5500","http://127.0.0.1:5500"]

---

## Creación de la base de datos

```bash
psql -U postgres
CREATE DATABASE hospital_eseb;
CREATE USER eseb_user WITH PASSWORD 'tu_contraseña';
GRANT ALL PRIVILEGES ON DATABASE hospital_eseb TO eseb_user;
\q
```

---

## Migraciones

```bash
alembic upgrade head
```

---

## Iniciar el servidor

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Iniciar el frontend

Abre `frontend/index.html` con Live Server en VS Code o cualquier servidor estático en el puerto 5500.