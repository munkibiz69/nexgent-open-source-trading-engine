-- Add automated_trading column to agents table
-- Default is true to maintain existing agent behavior
ALTER TABLE "agents" 
ADD COLUMN "automated_trading" BOOLEAN NOT NULL DEFAULT true;

-- Add index for potential filtering queries
CREATE INDEX "agents_automated_trading_idx" ON "agents"("automated_trading");


