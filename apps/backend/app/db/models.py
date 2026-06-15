from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class SessionRow(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preview_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_type: Mapped[str] = mapped_column(String(32), nullable=False, default="microphone")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    speakers: Mapped[list["SpeakerRow"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    segments: Mapped[list["SegmentRow"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    jobs: Mapped[list["JobRow"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    artifacts: Mapped[list["SessionArtifactRow"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class SpeakerRow(Base):
    __tablename__ = "speakers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    session: Mapped[SessionRow] = relationship(back_populates="speakers")
    segments: Mapped[list["SegmentRow"]] = relationship(back_populates="speaker")


class SegmentRow(Base):
    __tablename__ = "segments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    speaker_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("speakers.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)

    session: Mapped[SessionRow] = relationship(back_populates="segments")
    speaker: Mapped[SpeakerRow] = relationship(back_populates="segments")


class JobRow(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    segment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("segments.id", ondelete="SET NULL"), nullable=True
    )
    job_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped[SessionRow] = relationship(back_populates="jobs")


class SessionArtifactRow(Base):
    __tablename__ = "session_artifacts"
    __table_args__ = (
        UniqueConstraint("session_id", "artifact_type", name="uq_session_artifact_type"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    artifact_type: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped[SessionRow] = relationship(back_populates="artifacts")
