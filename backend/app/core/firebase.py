import firebase_admin
from firebase_admin import credentials, auth
from app.core.settings import settings
import os


def init_firebase() -> None:
    if not firebase_admin._apps:
        cred_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "firebase-service-account.json"
        )
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)


def verify_firebase_token(id_token: str) -> dict:
    init_firebase()
    try:
        decoded = auth.verify_id_token(id_token, check_revoked=True)
        return decoded
    except auth.RevokedIdTokenError:
        raise ValueError("Token revocado. El usuario debe iniciar sesión nuevamente.")
    except auth.ExpiredIdTokenError:
        raise ValueError("Token expirado. El usuario debe iniciar sesión nuevamente.")
    except auth.InvalidIdTokenError:
        raise ValueError("Token inválido.")
    except Exception as e:
        raise ValueError(f"Error verificando token: {str(e)}")


def get_user_role(decoded_token: dict) -> str | None:
    if decoded_token.get("role") == "admin" or decoded_token.get("admin") is True:
        return "admin"
    if decoded_token.get("role") == "medico" or decoded_token.get("medico") is True:
        return "medico"
    if decoded_token.get("role") == "enfermero":
        return "medico"
    return None


def set_user_role(uid: str, role: str) -> None:
    init_firebase()
    if role not in ("admin", "medico"):
        raise ValueError("Rol inválido. Solo se permite 'admin' o 'medico'.")
    auth.set_custom_user_claims(uid, {"role": role})