from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.db import get_db
from app.models.doctor import Doctor
from app.models.patient import Patient
from app.models.audit import AuditLog
from app.dependencies import require_medico, require_admin
from app.models.staff import Staff

router = APIRouter(prefix="/doctors", tags=["doctors"])


class DoctorCreate(BaseModel):
    name: str


class DoctorResponse(BaseModel):
    id: str
    name: str
    active: bool
    patient_count: int = 0

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[DoctorResponse])
async def get_doctors(
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Doctor).where(Doctor.active == True).order_by(Doctor.name)
    )
    doctors = result.scalars().all()

    response = []
    for doc in doctors:
        count_result = await db.execute(
            select(func.count(Patient.id)).where(
                Patient.attending_id == doc.id,
                Patient.discharged_at.is_(None)
            )
        )
        count = count_result.scalar() or 0
        response.append(DoctorResponse(
            id=doc.id,
            name=doc.name,
            active=doc.active,
            patient_count=count
        ))
    return response


@router.post("/", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    body: DoctorCreate,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    doctor = Doctor(name=body.name)
    db.add(doctor)
    await db.commit()
    await db.refresh(doctor)
    log = AuditLog(action="create_doctor", staff_id=current_user.id, details={"name": body.name})
    db.add(log)
    await db.commit()
    return DoctorResponse(id=doctor.id, name=doctor.name, active=doctor.active, patient_count=0)


@router.delete("/{doctor_id}")
async def deactivate_doctor(
    doctor_id: str,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor no encontrado.")
    doctor.active = False
    await db.commit()
    return {"message": "Doctor desactivado correctamente."}