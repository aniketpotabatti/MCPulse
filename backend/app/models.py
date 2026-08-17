import uuid
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TransportType(str, PyEnum):
    sse = "sse"
    stdio = "stdio"


class MCPServer(Base):
    __tablename__ = "mcpservers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    transport: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String, nullable=True)
    command: Mapped[str | None] = mapped_column(String, nullable=True)
    args: Mapped[list | None] = mapped_column(JSON, nullable=True)
    check_interval: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    snapshots: Mapped[list["HealthSnapshot"]] = relationship(
        "HealthSnapshot", back_populates="server", cascade="all, delete-orphan"
    )


class HealthSnapshot(Base):
    __tablename__ = "healthsnapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    server_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("mcpservers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    checked_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    is_online: Mapped[bool] = mapped_column(Boolean, nullable=False)
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    tool_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tool_names: Mapped[list | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    handshake_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    ping_ok: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    server: Mapped["MCPServer"] = relationship("MCPServer", back_populates="snapshots")
