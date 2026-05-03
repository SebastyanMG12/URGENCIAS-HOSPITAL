from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.core.firebase import verify_firebase_token, get_user_role
from app.models.staff import Staff

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Staff:
    token = credentials.credentials
    try:
        decoded = verify_firebase_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    role = get_user_role(decoded)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no tiene un rol autorizado.",
        )

    firebase_uid = decoded.get("uid") or decoded.get("user_id")

    result = await db.execute(select(Staff).where(Staff.firebase_uid == firebase_uid))
    staff = result.scalar_one_or_none()

    if not staff:
        staff = Staff(
            firebase_uid=firebase_uid,
            email=decoded.get("email", ""),
            display_name=decoded.get("name", ""),
            role=role,
        )
        db.add(staff)
        await db.flush()

    return staff


async def require_admin(current_user: Staff = Depends(get_current_user)) -> Staff:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol de administrador.",
        )
    return current_user


async def require_medico(current_user: Staff = Depends(get_current_user)) -> Staff:
    if current_user.role not in ("medico", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol médico o superior.",
        )
    return current_user