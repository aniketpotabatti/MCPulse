from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app import crud
from app.collector import scheduler as probe_scheduler
from app.collector.health_check import execute_probe
from app.database import get_db
from app.schemas import (
    HealthSnapshotPage,
    HealthSnapshotRead,
    MCPServerCreate,
    MCPServerRead,
    MCPServerUpdate,
    ServerDetail,
)

router = APIRouter()


@router.get("", response_model=list[MCPServerRead])
async def list_servers(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
) -> list[MCPServerRead]:
    return await crud.get_mcp_servers(db, skip=skip, limit=limit)


@router.post("", response_model=MCPServerRead, status_code=status.HTTP_201_CREATED)
async def create_server(
    server_in: MCPServerCreate,
    db: AsyncSession = Depends(get_db),
) -> MCPServerRead:
    server = await crud.create_mcp_server(db, server_in)
    if server.enabled:
        await probe_scheduler.schedule_server(server.id, server.check_interval)
    return server


@router.get("/{server_id}", response_model=ServerDetail)
async def get_server(
    server_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> ServerDetail:
    server = await crud.get_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    latest = await crud.get_latest_snapshot(db, server_id)
    return ServerDetail(
        **MCPServerRead.model_validate(server).model_dump(),
        latest_snapshot=HealthSnapshotRead.model_validate(latest) if latest else None,
    )


@router.patch("/{server_id}", response_model=MCPServerRead)
async def update_server(
    server_id: UUID,
    server_in: MCPServerUpdate,
    db: AsyncSession = Depends(get_db),
) -> MCPServerRead:
    server = await crud.update_mcp_server(db, server_id, server_in)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    if server.enabled:
        await probe_scheduler.schedule_server(server.id, server.check_interval)
    else:
        probe_scheduler.unschedule_server(server.id)

    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(
    server_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    server = await crud.delete_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    probe_scheduler.unschedule_server(server_id)


@router.post("/{server_id}/probe", response_model=HealthSnapshotRead)
async def probe_server_now(
    server_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> HealthSnapshotRead:
    server = await crud.get_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    snapshot = await execute_probe(server, db)
    return snapshot


@router.get("/{server_id}/history", response_model=HealthSnapshotPage)
async def get_server_history(
    server_id: UUID,
    page: int = 1,
    size: int = 100,
    db: AsyncSession = Depends(get_db),
) -> HealthSnapshotPage:
    if page < 1:
        raise HTTPException(status_code=400, detail="page must be >= 1")
    if size < 1 or size > 500:
        raise HTTPException(status_code=400, detail="size must be between 1 and 500")

    server = await crud.get_mcp_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    skip = (page - 1) * size
    items, total = await crud.get_health_snapshots_by_server_id(
        db, server_id, skip=skip, limit=size
    )
    page_data = crud.build_snapshot_page(items, total, page, size)
    return HealthSnapshotPage(**page_data)
