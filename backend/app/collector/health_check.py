import asyncio
import time
import traceback
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.api import stream
from app.collector.transports import get_mcp_session
from app.config import settings
from app.models import HealthSnapshot, MCPServer
from app.schemas import HealthSnapshotCreate
from app.utils.logging import get_logger

logger = get_logger(__name__)

_probe_semaphore = asyncio.Semaphore(settings.PROBE_CONCURRENCY)
MAX_PROBE_TIMEOUT = 30
MAX_RETRIES = 2
RETRY_BACKOFF_SECONDS = 1


async def _perform_mcp_checks(session) -> tuple[bool, bool, int, list[str]]:
    """Layer 2 (handshake) and Layer 3 (functional) MCP checks."""
    await session.initialize()
    handshake_ok = True

    await session.send_ping()
    ping_ok = True

    tools_result = await session.list_tools()
    tool_count = len(tools_result.tools)
    tool_names = [tool.name for tool in tools_result.tools]

    return handshake_ok, ping_ok, tool_count, tool_names


async def _probe_with_retries(server: MCPServer) -> HealthSnapshotCreate:
    """Run the three-layer probe with timeout and retry logic."""
    start_time = time.monotonic()
    timeout = min(settings.PROBE_TIMEOUT_SECONDS, MAX_PROBE_TIMEOUT)

    error_message: str | None = None
    is_online = False
    latency_ms: float | None = None
    tool_count: int | None = None
    tool_names: list[str] | None = None
    handshake_ok = False
    ping_ok = False

    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with _probe_semaphore:
                async with asyncio.timeout(timeout):
                    async with get_mcp_session(server) as session:
                        handshake_ok, ping_ok, tool_count, tool_names = await _perform_mcp_checks(
                            session
                        )

            is_online = True
            latency_ms = (time.monotonic() - start_time) * 1000
            last_error = None
            break

        except ConnectionRefusedError as exc:
            last_error = exc
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS)
                continue
            error_message = str(exc)

        except TimeoutError:
            last_error = TimeoutError(f"Probe timed out after {timeout}s")
            error_message = str(last_error)
            break

        except Exception as exc:
            last_error = exc
            if isinstance(exc, ConnectionRefusedError) and attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_BACKOFF_SECONDS)
                continue
            error_message = str(exc)
            break

    if last_error and not error_message:
        error_message = str(last_error)

    if last_error:
        logger.error(
            "probe_failed",
            server_id=str(server.id),
            server_name=server.name,
            error_type=type(last_error).__name__,
            error_message=str(last_error),
            traceback=traceback.format_exc(),
        )

    return HealthSnapshotCreate(
        server_id=server.id,
        checked_at=datetime.now(timezone.utc),
        is_online=is_online,
        latency_ms=latency_ms,
        tool_count=tool_count,
        tool_names=tool_names,
        error_message=error_message,
        handshake_ok=handshake_ok,
        ping_ok=ping_ok,
    )


async def probe_server(server: MCPServer) -> HealthSnapshotCreate:
    """Probe an MCP server and return snapshot data (no DB persistence)."""
    return await _probe_with_retries(server)


async def execute_probe(server: MCPServer, db: AsyncSession) -> HealthSnapshot:
    """Probe a server, persist the snapshot, and broadcast via SSE."""
    snapshot_data = await probe_server(server)
    from app import crud

    db_snapshot = await crud.create_health_snapshot(db, snapshot_data)
    await stream.broadcast_snapshot(db_snapshot)
    return db_snapshot


async def execute_probe_by_id(server_id: UUID, db: AsyncSession) -> HealthSnapshot | None:
    """Load a server by ID and run a probe."""
    from app import crud

    server = await crud.get_mcp_server(db, server_id)
    if not server:
        return None
    return await execute_probe(server, db)
