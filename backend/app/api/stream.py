import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.models import HealthSnapshot
from app.schemas import HealthSnapshotRead, SSEHealthEvent

router = APIRouter()

_listeners: set[asyncio.Queue[str]] = set()


async def event_generator(request: Request) -> AsyncGenerator[str, None]:
    queue: asyncio.Queue[str] = asyncio.Queue(maxsize=100)
    _listeners.add(queue)

    try:
        yield ": connected\n\n"
        while True:
            if await request.is_disconnected():
                break
            try:
                payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                yield f"data: {payload}\n\n"
            except asyncio.TimeoutError:
                yield ": keepalive\n\n"
    finally:
        _listeners.discard(queue)


@router.get("/events")
async def sse_endpoint(request: Request) -> StreamingResponse:
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def broadcast_snapshot(snapshot: HealthSnapshot) -> None:
    event = SSEHealthEvent(
        snapshot=HealthSnapshotRead.model_validate(snapshot)
    )
    payload = json.dumps(event.model_dump(mode="json"))

    dead_listeners: set[asyncio.Queue[str]] = set()
    for queue in _listeners:
        try:
            queue.put_nowait(payload)
        except asyncio.QueueFull:
            dead_listeners.add(queue)

    _listeners.difference_update(dead_listeners)
