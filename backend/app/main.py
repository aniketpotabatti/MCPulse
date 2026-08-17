from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import health, servers, stream
from app.collector.scheduler import bootstrap_schedules, shutdown_scheduler, start_scheduler
from app.config import settings
from app.database import init_db
from app.schemas import ProblemDetail
from app.utils.logging import configure_structlog, get_logger

configure_structlog()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup_begin")
    await init_db()
    start_scheduler()
    await bootstrap_schedules()
    logger.info("startup_complete")
    yield
    logger.info("shutdown_begin")
    shutdown_scheduler()
    logger.info("shutdown_complete")


app = FastAPI(
    title="MCP Server Health Monitor",
    description="Datadog-style observability dashboard for MCP servers",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(servers.router, prefix="/api/servers", tags=["servers"])
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(stream.router, tags=["stream"])


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    problem = ProblemDetail(
        title="HTTP Error",
        status=exc.status_code,
        detail=str(exc.detail),
        instance=str(request.url),
    )
    return JSONResponse(status_code=exc.status_code, content=problem.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    problem = ProblemDetail(
        title="Validation Error",
        status=422,
        detail="Request validation failed",
        instance=str(request.url),
        extra={"errors": exc.errors()},
    )
    return JSONResponse(status_code=422, content=problem.model_dump())


@app.get("/")
async def root():
    return {"message": "MCP Server Health Monitor API", "version": "0.1.0"}
