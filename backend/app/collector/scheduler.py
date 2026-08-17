import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.collector.health_check import execute_probe_by_id
from app.config import settings
from app.database import AsyncSessionLocal
from app.utils.logging import get_logger

logger = get_logger(__name__)

scheduler = AsyncIOScheduler()


async def _run_scheduled_probe(server_id: str) -> None:
    async with AsyncSessionLocal() as db:
        from app import crud

        server = await crud.get_mcp_server(db, uuid.UUID(server_id))
        if not server or not server.enabled:
            return

        try:
            await execute_probe_by_id(uuid.UUID(server_id), db)
        except Exception as exc:
            logger.error(
                "scheduled_probe_failed",
                server_id=server_id,
                error_type=type(exc).__name__,
                error_message=str(exc),
            )


async def _purge_old_snapshots() -> None:
    async with AsyncSessionLocal() as db:
        from app import crud

        deleted = await crud.purge_old_snapshots(db, settings.HISTORY_RETENTION_DAYS)
        if deleted:
            logger.info(
                "purged_old_snapshots",
                deleted_count=deleted,
                retention_days=settings.HISTORY_RETENTION_DAYS,
            )


async def schedule_server(server_id: uuid.UUID, check_interval: int) -> None:
    job_id = f"probe-{server_id}"
    scheduler.add_job(
        _run_scheduled_probe,
        IntervalTrigger(seconds=check_interval),
        args=[str(server_id)],
        id=job_id,
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )


def unschedule_server(server_id: uuid.UUID) -> None:
    job_id = f"probe-{server_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


async def refresh_all_schedules() -> None:
    async with AsyncSessionLocal() as db:
        from app import crud

        servers = await crud.get_mcp_servers(db, limit=1000)

    active_ids = {str(server.id) for server in servers if server.enabled}

    for job in scheduler.get_jobs():
        if job.id.startswith("probe-"):
            server_id = job.id.removeprefix("probe-")
            if server_id not in active_ids:
                scheduler.remove_job(job.id)

    for server in servers:
        if server.enabled:
            await schedule_server(server.id, server.check_interval)
        else:
            unschedule_server(server.id)


def start_scheduler() -> None:
    if scheduler.running:
        return

    scheduler.add_job(
        _purge_old_snapshots,
        CronTrigger(hour=3, minute=0),
        id="purge-old-snapshots",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("scheduler_started")


async def bootstrap_schedules() -> None:
    await refresh_all_schedules()
    logger.info("probe_schedules_initialized")


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("scheduler_stopped")
