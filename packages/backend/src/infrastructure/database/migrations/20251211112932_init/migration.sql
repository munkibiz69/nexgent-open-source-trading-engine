-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'SWAP', 'BURN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "trading_mode" VARCHAR(20) NOT NULL DEFAULT 'simulation',
    "trading_config" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_balances" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "wallet_address" VARCHAR(44) NOT NULL,
    "token_address" VARCHAR(255) NOT NULL,
    "token_symbol" VARCHAR(20) NOT NULL,
    "balance" TEXT NOT NULL,
    "last_updated" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_signals" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "token_address" VARCHAR(255) NOT NULL,
    "symbol" VARCHAR(50),
    "price_sol" DECIMAL(20,8),
    "signal_type" VARCHAR(50) NOT NULL,
    "activation_reason" TEXT,
    "signal_strength" INTEGER NOT NULL,
    "source" VARCHAR(100),

    CONSTRAINT "trading_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signal_executions" (
    "id" UUID NOT NULL,
    "signal_id" INTEGER NOT NULL,
    "agent_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "transaction_id" UUID,
    "error" TEXT,
    "executed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signal_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_transactions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "wallet_address" VARCHAR(44),
    "transaction_type" "TransactionType" NOT NULL,
    "transaction_value_usd" DECIMAL(20,8) NOT NULL,
    "transaction_time" TIMESTAMPTZ NOT NULL,
    "destination_address" VARCHAR(255),
    "signal_id" INTEGER,
    "fees" DECIMAL(20,8),
    "routes" JSONB,
    "input_mint" VARCHAR(255),
    "input_symbol" VARCHAR(20),
    "input_amount" DECIMAL(20,8),
    "input_price" DECIMAL(20,8),
    "output_mint" VARCHAR(255),
    "output_symbol" VARCHAR(20),
    "output_amount" DECIMAL(20,8),
    "output_price" DECIMAL(20,8),
    "slippage" DECIMAL(10,4),
    "price_impact" DECIMAL(10,4),
    "is_dca" BOOLEAN NOT NULL DEFAULT false,
    "transaction_hash" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_historical_swaps" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "wallet_address" VARCHAR(44),
    "token_address" VARCHAR(255) NOT NULL,
    "token_symbol" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "purchase_price" DECIMAL(20,8) NOT NULL,
    "sale_price" DECIMAL(20,8) NOT NULL,
    "change_percent" DECIMAL(10,4) NOT NULL,
    "profit_loss_usd" DECIMAL(20,8) NOT NULL,
    "profit_loss_sol" DECIMAL(20,8) NOT NULL,
    "purchase_time" TIMESTAMPTZ NOT NULL,
    "sale_time" TIMESTAMPTZ NOT NULL,
    "purchase_transaction_id" UUID,
    "sale_transaction_id" UUID,
    "signal_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_historical_swaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_wallets" (
    "wallet_address" VARCHAR(44) NOT NULL,
    "agent_id" UUID NOT NULL,
    "wallet_type" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_wallets_pkey" PRIMARY KEY ("wallet_address")
);

-- CreateTable
CREATE TABLE "agent_positions" (
    "id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "wallet_address" VARCHAR(44) NOT NULL,
    "token_address" VARCHAR(255) NOT NULL,
    "token_symbol" VARCHAR(20) NOT NULL,
    "purchase_transaction_id" UUID NOT NULL,
    "purchase_price" DECIMAL(20,8) NOT NULL,
    "purchase_amount" DECIMAL(20,8) NOT NULL,
    "current_stop_loss_percentage" DECIMAL(5,2),
    "peak_price" DECIMAL(20,8),
    "last_stop_loss_update" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "agent_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "agents_user_id_idx" ON "agents"("user_id");

-- CreateIndex
CREATE INDEX "agent_balances_agent_id_idx" ON "agent_balances"("agent_id");

-- CreateIndex
CREATE INDEX "agent_balances_wallet_address_idx" ON "agent_balances"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_balances_agent_id_wallet_address_idx" ON "agent_balances"("agent_id", "wallet_address");

-- CreateIndex
CREATE INDEX "agent_balances_token_address_idx" ON "agent_balances"("token_address");

-- CreateIndex
CREATE UNIQUE INDEX "agent_balances_wallet_address_token_address_key" ON "agent_balances"("wallet_address", "token_address");

-- CreateIndex
CREATE INDEX "trading_signals_token_address_idx" ON "trading_signals"("token_address");

-- CreateIndex
CREATE INDEX "trading_signals_signal_type_idx" ON "trading_signals"("signal_type");

-- CreateIndex
CREATE INDEX "trading_signals_created_at_idx" ON "trading_signals"("created_at");

-- CreateIndex
CREATE INDEX "signal_executions_signal_id_idx" ON "signal_executions"("signal_id");

-- CreateIndex
CREATE INDEX "signal_executions_agent_id_idx" ON "signal_executions"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "signal_executions_signal_id_agent_id_key" ON "signal_executions"("signal_id", "agent_id");

-- CreateIndex
CREATE INDEX "agent_transactions_agent_id_idx" ON "agent_transactions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_transactions_wallet_address_idx" ON "agent_transactions"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_transactions_agent_id_wallet_address_idx" ON "agent_transactions"("agent_id", "wallet_address");

-- CreateIndex
CREATE INDEX "agent_transactions_transaction_type_idx" ON "agent_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "agent_transactions_transaction_time_idx" ON "agent_transactions"("transaction_time");

-- CreateIndex
CREATE INDEX "agent_transactions_signal_id_idx" ON "agent_transactions"("signal_id");

-- CreateIndex
CREATE INDEX "agent_transactions_agent_id_transaction_time_idx" ON "agent_transactions"("agent_id", "transaction_time");

-- CreateIndex
CREATE INDEX "agent_transactions_agent_id_transaction_type_idx" ON "agent_transactions"("agent_id", "transaction_type");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_idx" ON "agent_historical_swaps"("agent_id");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_wallet_address_idx" ON "agent_historical_swaps"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_wallet_address_idx" ON "agent_historical_swaps"("agent_id", "wallet_address");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_token_address_idx" ON "agent_historical_swaps"("token_address");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_signal_id_idx" ON "agent_historical_swaps"("signal_id");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_purchase_transaction_id_idx" ON "agent_historical_swaps"("purchase_transaction_id");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_sale_transaction_id_idx" ON "agent_historical_swaps"("sale_transaction_id");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_purchase_time_idx" ON "agent_historical_swaps"("purchase_time");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_sale_time_idx" ON "agent_historical_swaps"("sale_time");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_token_address_idx" ON "agent_historical_swaps"("agent_id", "token_address");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_purchase_time_idx" ON "agent_historical_swaps"("agent_id", "purchase_time");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_sale_time_idx" ON "agent_historical_swaps"("agent_id", "sale_time");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_created_at_idx" ON "agent_historical_swaps"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "agent_historical_swaps_agent_id_signal_id_idx" ON "agent_historical_swaps"("agent_id", "signal_id");

-- CreateIndex
CREATE INDEX "agent_wallets_agent_id_idx" ON "agent_wallets"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallets_agent_id_wallet_type_key" ON "agent_wallets"("agent_id", "wallet_type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_positions_purchase_transaction_id_key" ON "agent_positions"("purchase_transaction_id");

-- CreateIndex
CREATE INDEX "agent_positions_agent_id_wallet_address_idx" ON "agent_positions"("agent_id", "wallet_address");

-- CreateIndex
CREATE INDEX "agent_positions_token_address_idx" ON "agent_positions"("token_address");

-- CreateIndex
CREATE INDEX "agent_positions_agent_id_idx" ON "agent_positions"("agent_id");

-- CreateIndex
CREATE INDEX "agent_positions_purchase_transaction_id_idx" ON "agent_positions"("purchase_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_positions_agent_id_wallet_address_token_address_key" ON "agent_positions"("agent_id", "wallet_address", "token_address");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_balances" ADD CONSTRAINT "agent_balances_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_balances" ADD CONSTRAINT "agent_balances_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "agent_wallets"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_executions" ADD CONSTRAINT "signal_executions_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "trading_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_executions" ADD CONSTRAINT "signal_executions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signal_executions" ADD CONSTRAINT "signal_executions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "agent_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "agent_wallets"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "trading_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_historical_swaps" ADD CONSTRAINT "agent_historical_swaps_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_historical_swaps" ADD CONSTRAINT "agent_historical_swaps_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "agent_wallets"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_historical_swaps" ADD CONSTRAINT "agent_historical_swaps_purchase_transaction_id_fkey" FOREIGN KEY ("purchase_transaction_id") REFERENCES "agent_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_historical_swaps" ADD CONSTRAINT "agent_historical_swaps_sale_transaction_id_fkey" FOREIGN KEY ("sale_transaction_id") REFERENCES "agent_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_historical_swaps" ADD CONSTRAINT "agent_historical_swaps_signal_id_fkey" FOREIGN KEY ("signal_id") REFERENCES "trading_signals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_wallets" ADD CONSTRAINT "agent_wallets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_positions" ADD CONSTRAINT "agent_positions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_positions" ADD CONSTRAINT "agent_positions_wallet_address_fkey" FOREIGN KEY ("wallet_address") REFERENCES "agent_wallets"("wallet_address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_positions" ADD CONSTRAINT "agent_positions_purchase_transaction_id_fkey" FOREIGN KEY ("purchase_transaction_id") REFERENCES "agent_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
