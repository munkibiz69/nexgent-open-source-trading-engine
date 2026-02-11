-- Add realized_profit_sol column to track cumulative profit from take-profit sales
ALTER TABLE "agent_positions" ADD COLUMN "realized_profit_sol" DECIMAL(20,8) NOT NULL DEFAULT 0;
