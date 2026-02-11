-- Add take-profit tracking fields to agent_positions table
-- These fields track partial take-profit sales and moon bag status

-- Tokens remaining after partial take-profit sales (null = full purchaseAmount)
ALTER TABLE "agent_positions" ADD COLUMN "remaining_amount" DECIMAL(30, 18);

-- Number of take-profit levels that have been executed
ALTER TABLE "agent_positions" ADD COLUMN "take_profit_levels_hit" INTEGER NOT NULL DEFAULT 0;

-- Transaction IDs for take-profit partial sales
ALTER TABLE "agent_positions" ADD COLUMN "take_profit_transaction_ids" TEXT[] NOT NULL DEFAULT '{}';

-- Timestamp of last take-profit execution
ALTER TABLE "agent_positions" ADD COLUMN "last_take_profit_time" TIMESTAMPTZ;

-- Whether moon bag has been activated (set aside)
ALTER TABLE "agent_positions" ADD COLUMN "moon_bag_activated" BOOLEAN NOT NULL DEFAULT false;

-- Amount of tokens set aside as moon bag
ALTER TABLE "agent_positions" ADD COLUMN "moon_bag_amount" DECIMAL(30, 18);
