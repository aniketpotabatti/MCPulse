"""Initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-08-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "mcpservers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("transport", sa.String(), nullable=False),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("command", sa.String(), nullable=True),
        sa.Column("args", sa.JSON(), nullable=True),
        sa.Column("check_interval", sa.Integer(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "healthsnapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("server_id", sa.Uuid(), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=True),
        sa.Column("is_online", sa.Boolean(), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("tool_count", sa.Integer(), nullable=True),
        sa.Column("tool_names", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("handshake_ok", sa.Boolean(), nullable=False),
        sa.Column("ping_ok", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["server_id"], ["mcpservers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_healthsnapshots_checked_at"), "healthsnapshots", ["checked_at"], unique=False)
    op.create_index(op.f("ix_healthsnapshots_server_id"), "healthsnapshots", ["server_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_healthsnapshots_server_id"), table_name="healthsnapshots")
    op.drop_index(op.f("ix_healthsnapshots_checked_at"), table_name="healthsnapshots")
    op.drop_table("healthsnapshots")
    op.drop_table("mcpservers")
