from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TransportType(str, Enum):
    sse = "sse"
    stdio = "stdio"


class MCPServerBase(BaseModel):
    name: str
    transport: TransportType
    url: str | None = None
    command: str | None = None
    args: list[str] | None = None
    check_interval: int = Field(default=30, ge=5)
    enabled: bool = True

    @model_validator(mode="after")
    def validate_transport_fields(self) -> "MCPServerBase":
        if self.transport == TransportType.sse and not self.url:
            raise ValueError("SSE transport requires a URL")
        if self.transport == TransportType.stdio and not self.command:
            raise ValueError("stdio transport requires a command")
        return self


class MCPServerCreate(MCPServerBase):
    pass


class MCPServerUpdate(BaseModel):
    name: str | None = None
    transport: TransportType | None = None
    url: str | None = None
    command: str | None = None
    args: list[str] | None = None
    check_interval: int | None = Field(default=None, ge=5)
    enabled: bool | None = None


class MCPServerRead(MCPServerBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime


class HealthSnapshotBase(BaseModel):
    server_id: UUID
    checked_at: datetime
    is_online: bool
    latency_ms: float | None = None
    tool_count: int | None = None
    tool_names: list[str] | None = None
    error_message: str | None = None
    handshake_ok: bool = False
    ping_ok: bool = False


class HealthSnapshotCreate(HealthSnapshotBase):
    pass


class HealthSnapshotRead(HealthSnapshotBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID


class ServerDetail(MCPServerRead):
    latest_snapshot: HealthSnapshotRead | None = None


class HealthSnapshotPage(BaseModel):
    items: list[HealthSnapshotRead]
    total: int
    page: int
    size: int
    pages: int


class SSEHealthEvent(BaseModel):
    type: str = "health_update"
    snapshot: HealthSnapshotRead


class ProblemDetail(BaseModel):
    type: str = "about:blank"
    title: str
    status: int
    detail: str | None = None
    instance: str | None = None
    extra: dict[str, Any] | None = None
