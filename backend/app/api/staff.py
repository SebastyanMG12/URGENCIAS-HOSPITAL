from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.models.staff import Staff
from app.models.audit import AuditLog
from app.dependencies import require_admin, require_medico

router = APIRouter(prefix="/staff", tags=["staff"])


class StaffResponse(BaseModel):
    id: str
    firebase_uid: str
    email: str
    display_name: str | None
    role: str

    model_config = {"from_attributes": True}


class AuditResponse(BaseModel):
    id: str
    action: str
    patient_id: str | None
    staff_id: str | None
    details: dict | None
    created_at: str

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[StaffResponse])
async def get_all_staff(
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Staff).order_by(Staff.created_at.desc()))
    return result.scalars().all()


@router.get("/audit", response_model=list[AuditResponse])
async def get_audit_logs(
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(500)
    )
    logs = result.scalars().all()
    return [
        AuditResponse(
            id=log.id,
            action=log.action,
            patient_id=log.patient_id,
            staff_id=log.staff_id,
            details=log.details,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]


@router.get("/audit/{patient_id}", response_model=list[AuditResponse])
async def get_audit_by_patient(
    patient_id: str,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.patient_id == patient_id)
        .order_by(AuditLog.created_at.desc())
    )
    logs = result.scalars().all()
    return [
        AuditResponse(
            id=log.id,
            action=log.action,
            patient_id=log.patient_id,
            staff_id=log.staff_id,
            details=log.details,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]