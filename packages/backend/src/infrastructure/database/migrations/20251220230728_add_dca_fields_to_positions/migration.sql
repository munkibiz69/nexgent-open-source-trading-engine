-- AlterTable: Add DCA tracking fields to agent_positions
ALTER TABLE "agent_positions" ADD COLUMN     "dca_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dca_transaction_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "last_dca_time" TIMESTAMPTZ,
ADD COLUMN     "lowest_price" DECIMAL(30,18),
ADD COLUMN     "total_invested_sol" DECIMAL(20,8) NOT NULL DEFAULT 0;

-- Backfill: Calculate total_invested_sol from existing positions
-- total_invested_sol = purchase_price * purchase_amount (SOL per token * token amount = total SOL)
UPDATE "agent_positions" 
SET 
  "total_invested_sol" = "purchase_price" * "purchase_amount",
  "lowest_price" = "purchase_price"
WHERE "total_invested_sol" = 0;
