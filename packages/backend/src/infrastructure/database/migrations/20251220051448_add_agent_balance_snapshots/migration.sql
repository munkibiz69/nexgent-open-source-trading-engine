-- CreateTable
CREATE TABLE "agent_balance_snapshots" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "snapshot_timestamp" TIMESTAMPTZ NOT NULL,
    "portfolio_balance_sol" DECIMAL(20,8) NOT NULL,
    "sol_balance" DECIMAL(20,8) NOT NULL,
    "positions_value_sol" DECIMAL(20,8) NOT NULL,
    "unrealized_pnl_sol" DECIMAL(20,8) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_balance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_balance_snapshots_agent_id_snapshot_timestamp_idx" ON "agent_balance_snapshots"("agent_id", "snapshot_timestamp");

-- CreateIndex
CREATE INDEX "agent_balance_snapshots_snapshot_timestamp_idx" ON "agent_balance_snapshots"("snapshot_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "agent_balance_snapshots_agent_id_snapshot_timestamp_key" ON "agent_balance_snapshots"("agent_id", "snapshot_timestamp");

-- AddForeignKey
ALTER TABLE "agent_balance_snapshots" ADD CONSTRAINT "agent_balance_snapshots_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
