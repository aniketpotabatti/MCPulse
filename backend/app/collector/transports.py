"""Transport adapters for MCP servers (SSE and stdio)."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from mcp.client.session import ClientSession
from mcp.client.sse import sse_client
from mcp.client.stdio import StdioServerParameters, stdio_client

from app.models import MCPServer


def _parse_args(args: list | str | None) -> list[str]:
    if args is None:
        return []
    if isinstance(args, list):
        return args
    return []


@asynccontextmanager
async def get_mcp_session(server: MCPServer) -> AsyncIterator[ClientSession]:
    """Open an MCP client session based on the server's transport type."""
    if server.transport == "sse":
        if not server.url:
            raise ValueError("SSE transport requires a URL")
        async with sse_client(server.url) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                yield session
    elif server.transport == "stdio":
        if not server.command:
            raise ValueError("stdio transport requires a command")
        server_params = StdioServerParameters(
            command=server.command,
            args=_parse_args(server.args),
            env=None,
        )
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                yield session
    else:
        raise ValueError(f"Unsupported transport type: {server.transport}")
