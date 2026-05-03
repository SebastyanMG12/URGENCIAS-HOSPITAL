import secrets
import string
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.models.patient import Patient
from app.models.audit import AuditLog, Procedure
from app.dependencies import get_current_user, require_medico
from app.models.staff import Staff

router = APIRouter(prefix="/patients", tags=["patients"])


def utcnow():
    return datetime.now(timezone.utc)


def generate_public_code() -> str:
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(chars) for _ in range(8))


def generate_internal_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "PINT-" + "".join(secrets.choice(chars) for _ in range(7))


class PatientCreate(BaseModel):
    name: str
    doc_tipo: str | None = None
    doc_number: str | None = None
    phone: str | None = None
    reason: str
    notes: str | None = None
    allergies: str | None = None
    blood_type: str | None = None
    triage_level: str | None = None
    data_consent: bool = False
    companion_name: str | None = None
    companion_phone: str | None = None
    companion_relation: str | None = None


class PatientUpdate(BaseModel):
    arrived: bool | None = None
    arrived_at: datetime | None = None
    admitted_at: datetime | None = None
    discharged_at: datetime | None = None
    assigned_room: str | None = None
    assigned_bed: str | None = None
    attending_id: str | None = None
    attending_name: str | None = None
    share_with_companion: bool | None = None
    final_diagnosis: str | None = None
    share_diagnosis: bool | None = None
    companion_name: str | None = None
    companion_phone: str | None = None
    companion_relation: str | None = None


class ProcedureCreate(BaseModel):
    description: str
    performed_by: str | None = None


class PatientResponse(BaseModel):
    id: str
    internal_id: str
    public_code: str
    name: str
    doc_tipo: str | None
    doc_number: str | None
    phone: str | None
    reason: str
    notes: str | None
    allergies: str | None
    blood_type: str | None
    triage_level: str | None
    data_consent: bool
    companion_name: str | None
    companion_phone: str | None
    companion_relation: str | None
    arrived: bool
    arrived_at: datetime | None
    admitted_at: datetime | None
    discharged_at: datetime | None
    assigned_room: str | None
    assigned_bed: str | None
    attending_id: str | None
    attending_name: str | None
    share_with_companion: bool
    final_diagnosis: str | None
    share_diagnosis: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ProcedureResponse(BaseModel):
    id: str
    patient_id: str
    description: str
    performed_by: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CompanionResponse(BaseModel):
    name: str
    public_code: str
    reason: str
    phone: str | None
    arrived: bool
    arrived_at: datetime | None
    assigned_room: str | None
    assigned_bed: str | None
    attending_name: str | None
    discharged_at: datetime | None
    companion_name: str | None
    companion_phone: str | None
    companion_relation: str | None
    share_with_companion: bool
    final_diagnosis: str | None
    share_diagnosis: bool
    procedures: list[ProcedureResponse]

    model_config = {"from_attributes": True}


@router.post("/register", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def register_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
):
    if not body.data_consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Se requiere consentimiento de datos (Ley 1581 de 2012).",
        )

    patient = Patient(
        internal_id=generate_internal_id(),
        public_code=generate_public_code(),
        name=body.name,
        doc_tipo=body.doc_tipo,
        doc_number=body.doc_number,
        phone=body.phone,
        reason=body.reason,
        notes=body.notes,
        allergies=body.allergies,
        blood_type=body.blood_type,
        triage_level=body.triage_level,
        data_consent=body.data_consent,
        consent_date=utcnow() if body.data_consent else None,
        companion_name=body.companion_name,
        companion_phone=body.companion_phone,
        companion_relation=body.companion_relation,
    )
    db.add(patient)
    await db.commit()
    await db.refresh(patient)

    log = AuditLog(
        action="create_patient",
        patient_id=patient.id,
        details={"name": patient.name},
    )
    db.add(log)
    await db.commit()

    return patient


@router.get("/companion/{public_code}", response_model=CompanionResponse)
async def get_patient_by_public_code(
    public_code: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Patient).where(Patient.public_code == public_code.upper())
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Código no encontrado.",
        )

    procedures_result = await db.execute(
        select(Procedure)
        .where(Procedure.patient_id == patient.id)
        .order_by(Procedure.created_at.desc())
    )
    procedures = procedures_result.scalars().all()

    response = CompanionResponse(
        name=patient.name,
        public_code=patient.public_code,
        reason=patient.reason,
        phone=patient.phone,
        arrived=patient.arrived,
        arrived_at=patient.arrived_at,
        assigned_room=patient.assigned_room,
        assigned_bed=patient.assigned_bed,
        attending_name=patient.attending_name,
        discharged_at=patient.discharged_at,
        companion_name=patient.companion_name,
        companion_phone=patient.companion_phone,
        companion_relation=patient.companion_relation,
        share_with_companion=patient.share_with_companion,
        final_diagnosis=patient.final_diagnosis if patient.share_diagnosis else None,
        share_diagnosis=patient.share_diagnosis,
        procedures=procedures if patient.share_with_companion else [],
    )
    return response


@router.get("/", response_model=list[PatientResponse])
async def get_all_patients(
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).order_by(Patient.created_at.desc()))
    return result.scalars().all()


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: str,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado.")
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: str,
    body: PatientUpdate,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado.")

    if patient.discharged_at and current_user.role == "medico":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se puede modificar un paciente egresado.",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    log = AuditLog(
        action="update_patient",
        patient_id=patient.id,
        staff_id=current_user.id,
        details=update_data,
    )
    db.add(log)
    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/{patient_id}/procedures", response_model=ProcedureResponse, status_code=status.HTTP_201_CREATED)
async def add_procedure(
    patient_id: str,
    body: ProcedureCreate,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado.")

    if patient.discharged_at and current_user.role == "medico":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pueden agregar procedimientos a un paciente egresado.",
        )

    procedure = Procedure(
        patient_id=patient_id,
        description=body.description,
        performed_by=body.performed_by or current_user.display_name or current_user.email,
    )
    db.add(procedure)

    log = AuditLog(
        action="add_procedure",
        patient_id=patient_id,
        staff_id=current_user.id,
        details={"description": body.description},
    )
    db.add(log)
    await db.commit()
    await db.refresh(procedure)
    return procedure


@router.get("/{patient_id}/procedures", response_model=list[ProcedureResponse])
async def get_procedures(
    patient_id: str,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Procedure)
        .where(Procedure.patient_id == patient_id)
        .order_by(Procedure.created_at.desc())
    )
    return result.scalars().all()