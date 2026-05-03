from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.core.firebase import verify_firebase_token, get_user_role, set_user_role
from app.models.staff import Staff
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class TokenRequest(BaseModel):
    id_token: str


class StaffResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    display_name: str | None
    role: str

    model_config = {"from_attributes": True}


class SetRoleRequest(BaseModel):
    uid: str
    role: str


@router.post("/verify", response_model=StaffResponse)
async def verify_and_login(
    body: TokenRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        decoded = verify_firebase_token(body.id_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    role = get_user_role(decoded)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta no tiene un rol autorizado. Contacta al administrador.",
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
        await db.commit()
        await db.refresh(staff)
    else:
        if staff.role != role:
            staff.role = role
            await db.commit()
            await db.refresh(staff)

    return staff


@router.get("/me", response_model=StaffResponse)
async def get_me(current_user: Staff = Depends(get_current_user)):
    return current_user


@router.post("/set-role")
async def set_role(
    body: SetRoleRequest,
    current_user: Staff = Depends(require_admin),
):
    try:
        set_user_role(body.uid, body.role)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": f"Rol '{body.role}' asignado correctamente al usuario {body.uid}"}