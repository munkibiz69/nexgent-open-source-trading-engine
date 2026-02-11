-- AlterTable: Add user_id to trading_signals to scope signals to their creator
ALTER TABLE "trading_signals" ADD COLUMN "user_id" UUID;

-- AddForeignKey
ALTER TABLE "trading_signals" ADD CONSTRAINT "trading_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "trading_signals_user_id_idx" ON "trading_signals"("user_id");
