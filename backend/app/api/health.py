from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import MCPServer

router = APIRouter()


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)) -> dict:
    """App-level liveness endpoint."""
    try:
        await db.execute(select(func.count()).select_from(MCPServer))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "error", "database": "disconnected", "detail": str(exc)}
