-- Add is_take_profit column to agent_transactions table
ALTER TABLE "agent_transactions" ADD COLUMN "is_take_profit" BOOLEAN NOT NULL DEFAULT false;
