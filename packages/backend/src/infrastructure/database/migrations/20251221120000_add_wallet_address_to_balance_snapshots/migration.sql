-- Delete existing snapshots (they're invalid aggregated data without wallet context)
DELETE FROM "agent_balance_snapshots";

-- Drop old unique constraint and indexes
DROP INDEX IF EXISTS "agent_balance_snapshots_agent_id_snapshot_timestamp_key";
DROP INDEX IF EXISTS "agent_balance_snapshots_agent_id_snapshot_timestamp_idx";

-- Add wallet_address column
ALTER TABLE "agent_balance_snapshots" ADD COLUMN "wallet_address" VARCHAR(44) NOT NULL;

-- Add foreign key constraint
ALTER TABLE "agent_balance_snapshots" ADD CONSTRAINT "agent_balance_snapshots_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "agent_wallets"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create new unique constraint with wallet_address (shortened name to avoid 63 char limit)
CREATE UNIQUE INDEX "abs_agent_wallet_timestamp_key" ON "agent_balance_snapshots"("agent_id", "wallet_address", "snapshot_timestamp");

-- Create new indexes (shortened names)
CREATE INDEX "abs_agent_wallet_timestamp_idx" ON "agent_balance_snapshots"("agent_id", "wallet_address", "snapshot_timestamp");
CREATE INDEX "abs_wallet_address_idx" ON "agent_balance_snapshots"("wallet_address");
