import asyncio
import sys
from pathlib import Path

# Ensure root backend dir is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal, init_db
from app.schemas import MCPServerCreate, TransportType
from app import crud

DEMO_SERVERS = [
    MCPServerCreate(
        name="Memory Store MCP Server",
        transport=TransportType.sse,
        url="http://localhost:8001/sse",
        check_interval=15,
        enabled=True,
    ),
    MCPServerCreate(
        name="GitHub Tools MCP Server",
        transport=TransportType.sse,
        url="http://localhost:8002/sse",
        check_interval=30,
        enabled=True,
    ),
    MCPServerCreate(
        name="Local Filesystem MCP Server (Mock)",
        transport=TransportType.stdio,
        command="npx",
        args=["-y", "@modelcontextprotocol/server-filesystem", "."],
        check_interval=60,
        enabled=False,
    ),
]

async def seed():
    print("Initializing database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        existing = await crud.get_mcp_servers(db, limit=10)
        if existing:
            print(f"Database already contains {len(existing)} server(s). Skipping seed.")
            return

        print("Seeding demo MCP servers...")
        for srv_in in DEMO_SERVERS:
            created = await crud.create_mcp_server(db, srv_in)
            print(f"  - Registered: {created.name} ({created.transport})")

        print("Seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
