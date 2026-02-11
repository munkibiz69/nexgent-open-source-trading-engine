-- Add TP batch fields for DCA + Take-Profit append-levels model

-- TP level at which the current batch started (set on DCA for append-levels model)
ALTER TABLE "agent_positions" ADD COLUMN "tp_batch_start_level" INTEGER NOT NULL DEFAULT 0;

-- Total TP levels including appended batches from DCA (null = use config.levels.length)
ALTER TABLE "agent_positions" ADD COLUMN "total_take_profit_levels" INTEGER;
