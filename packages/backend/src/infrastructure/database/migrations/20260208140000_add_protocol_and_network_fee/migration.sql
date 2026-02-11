-- AlterTable
ALTER TABLE "agent_transactions" ADD COLUMN "protocol_fee_sol" DECIMAL(20,8),
ADD COLUMN "network_fee_sol" DECIMAL(20,8);
