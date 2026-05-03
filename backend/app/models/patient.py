import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base


def utcnow():
    return datetime.now(timezone.utc)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    internal_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    public_code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    doc_tipo: Mapped[str | None] = mapped_column(String(10), nullable=True)
    doc_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    allergies: Mapped[str | None] = mapped_column(String(300), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(5), nullable=True)
    triage_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    data_consent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    consent_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    companion_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    companion_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    companion_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    arrived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    admitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    discharged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    assigned_room: Mapped[str | None] = mapped_column(String(20), nullable=True)
    assigned_bed: Mapped[str | None] = mapped_column(String(20), nullable=True)
    attending_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    attending_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    share_with_companion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    final_diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    share_diagnosis: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    procedures: Mapped[list["Procedure"]] = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan", order_by="Procedure.created_at.desc()")
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="patient", cascade="all, delete-orphan")