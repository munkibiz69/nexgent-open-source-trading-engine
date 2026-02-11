-- Split automated_trading into mode-specific columns
-- This allows independent pause/resume for simulation and live trading modes

-- Drop the old index first
DROP INDEX IF EXISTS "agents_automated_trading_idx";

-- Drop the old column
ALTER TABLE "agents" DROP COLUMN IF EXISTS "automated_trading";

-- Add mode-specific columns (both default to true)
ALTER TABLE "agents" 
ADD COLUMN "automated_trading_simulation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "automated_trading_live" BOOLEAN NOT NULL DEFAULT true;

-- Add indexes for potential filtering queries
CREATE INDEX "agents_automated_trading_simulation_idx" ON "agents"("automated_trading_simulation");
CREATE INDEX "agents_automated_trading_live_idx" ON "agents"("automated_trading_live");

