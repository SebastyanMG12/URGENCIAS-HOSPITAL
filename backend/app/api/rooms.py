from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.db import get_db
from app.models.rooms import Room, Bed
from app.models.audit import AuditLog
from app.dependencies import require_medico, require_admin, get_current_user
from app.models.staff import Staff

router = APIRouter(prefix="/rooms", tags=["rooms"])


class RoomCreate(BaseModel):
    room_label: str


class BedCreate(BaseModel):
    label: str


class BedResponse(BaseModel):
    id: str
    room_id: str
    label: str
    occupied_by: str | None
    active: bool

    model_config = {"from_attributes": True}


class RoomResponse(BaseModel):
    id: str
    room_label: str
    active: bool
    beds: list[BedResponse]

    model_config = {"from_attributes": True}


@router.get("/", response_model=list[RoomResponse])
async def get_rooms(
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Room).where(Room.active == True).order_by(Room.room_label)
    )
    rooms = result.scalars().all()
    for room in rooms:
        await db.refresh(room, ["beds"])
    return rooms


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    body: RoomCreate,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    room = Room(room_label=body.room_label)
    db.add(room)
    await db.commit()
    await db.refresh(room)
    await db.refresh(room, ["beds"])
    log = AuditLog(action="create_room", staff_id=current_user.id, details={"room_label": body.room_label})
    db.add(log)
    await db.commit()
    return room


@router.post("/{room_id}/beds", response_model=BedResponse, status_code=status.HTTP_201_CREATED)
async def add_bed(
    room_id: str,
    body: BedCreate,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada.")
    bed = Bed(room_id=room_id, label=body.label)
    db.add(bed)
    await db.commit()
    await db.refresh(bed)
    return bed


@router.patch("/beds/{bed_id}/assign", response_model=BedResponse)
async def assign_bed(
    bed_id: str,
    patient_id: str,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    # Liberar cualquier cama que tenga ese paciente
    result = await db.execute(select(Bed).where(Bed.occupied_by == patient_id))
    existing = result.scalars().all()
    for b in existing:
        b.occupied_by = None

    result = await db.execute(select(Bed).where(Bed.id == bed_id))
    bed = result.scalar_one_or_none()
    if not bed:
        raise HTTPException(status_code=404, detail="Camilla no encontrada.")
    if bed.occupied_by and bed.occupied_by != patient_id:
        raise HTTPException(status_code=400, detail="Camilla ya ocupada por otro paciente.")

    bed.occupied_by = patient_id
    log = AuditLog(action="assign_bed", staff_id=current_user.id, details={"bed_id": bed_id, "patient_id": patient_id})
    db.add(log)
    await db.commit()
    await db.refresh(bed)
    return bed


@router.patch("/beds/{bed_id}/release", response_model=BedResponse)
async def release_bed(
    bed_id: str,
    current_user: Staff = Depends(require_medico),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Bed).where(Bed.id == bed_id))
    bed = result.scalar_one_or_none()
    if not bed:
        raise HTTPException(status_code=404, detail="Camilla no encontrada.")
    bed.occupied_by = None
    log = AuditLog(action="release_bed", staff_id=current_user.id, details={"bed_id": bed_id})
    db.add(log)
    await db.commit()
    await db.refresh(bed)
    return bed


@router.delete("/{room_id}")
async def deactivate_room(
    room_id: str,
    current_user: Staff = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(status_code=404, detail="Habitación no encontrada.")

    # Desactivar la habitación
    room.active = False

    # Desactivar todas las camas de esa habitación
    beds_result = await db.execute(select(Bed).where(Bed.room_id == room_id))
    beds = beds_result.scalars().all()
    for bed in beds:
        bed.active = False
        bed.occupied_by = None  # Liberar cama si estaba ocupada

    log = AuditLog(
        action="deactivate_room",
        staff_id=current_user.id,
        details={"room_id": room_id, "room_label": room.room_label, "beds_deactivated": len(beds)}
    )
    db.add(log)
    await db.commit()
    return {"message": f"Habitación desactivada correctamente. {len(beds)} cama(s) desactivadas."}