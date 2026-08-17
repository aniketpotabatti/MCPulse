import math
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HealthSnapshot, MCPServer
from app.schemas import HealthSnapshotCreate, MCPServerCreate, MCPServerUpdate


def _transport_value(transport) -> str:
    return transport.value if hasattr(transport, "value") else transport


async def get_mcp_servers(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[MCPServer]:
    result = await db.execute(
        select(MCPServer).order_by(MCPServer.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


async def get_mcp_server(db: AsyncSession, server_id: uuid.UUID) -> MCPServer | None:
    result = await db.execute(select(MCPServer).where(MCPServer.id == server_id))
    return result.scalar_one_or_none()


async def create_mcp_server(db: AsyncSession, server: MCPServerCreate) -> MCPServer:
    data = server.model_dump()
    data["transport"] = _transport_value(data["transport"])
    db_server = MCPServer(**data)
    db.add(db_server)
    await db.commit()
    await db.refresh(db_server)
    return db_server


async def update_mcp_server(
    db: AsyncSession, server_id: uuid.UUID, server_update: MCPServerUpdate
) -> MCPServer | None:
    db_server = await get_mcp_server(db, server_id)
    if not db_server:
        return None

    update_data = server_update.model_dump(exclude_unset=True)
    if "transport" in update_data:
        update_data["transport"] = _transport_value(update_data["transport"])

    for field, value in update_data.items():
        setattr(db_server, field, value)

    await db.commit()
    await db.refresh(db_server)
    return db_server


async def delete_mcp_server(db: AsyncSession, server_id: uuid.UUID) -> MCPServer | None:
    db_server = await get_mcp_server(db, server_id)
    if not db_server:
        return None
    await db.delete(db_server)
    await db.commit()
    return db_server


async def create_health_snapshot(
    db: AsyncSession, snapshot: HealthSnapshotCreate
) -> HealthSnapshot:
    db_snapshot = HealthSnapshot(**snapshot.model_dump())
    db.add(db_snapshot)
    await db.commit()
    await db.refresh(db_snapshot)
    return db_snapshot


async def get_latest_snapshot(
    db: AsyncSession, server_id: uuid.UUID
) -> HealthSnapshot | None:
    result = await db.execute(
        select(HealthSnapshot)
        .where(HealthSnapshot.server_id == server_id)
        .order_by(desc(HealthSnapshot.checked_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def count_health_snapshots(db: AsyncSession, server_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(HealthSnapshot)
        .where(HealthSnapshot.server_id == server_id)
    )
    return int(result.scalar_one())


async def get_health_snapshots_by_server_id(
    db: AsyncSession,
    server_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
) -> tuple[list[HealthSnapshot], int]:
    total_result = await db.execute(
        select(func.count())
        .select_from(HealthSnapshot)
        .where(HealthSnapshot.server_id == server_id)
    )
    total = int(total_result.scalar_one())

    result = await db.execute(
        select(HealthSnapshot)
        .where(HealthSnapshot.server_id == server_id)
        .order_by(desc(HealthSnapshot.checked_at))
        .offset(skip)
        .limit(limit)
    )
    return list(result.scalars().all()), total


def build_snapshot_page(
    items: list[HealthSnapshot], total: int, page: int, size: int
) -> dict:
    pages = math.ceil(total / size) if size else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": pages,
    }


async def purge_old_snapshots(db: AsyncSession, retention_days: int) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    result = await db.execute(
        delete(HealthSnapshot).where(HealthSnapshot.checked_at < cutoff)
    )
    await db.commit()
    return result.rowcount or 0
