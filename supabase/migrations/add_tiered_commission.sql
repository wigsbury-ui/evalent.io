ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS override_commission_value_subsequent NUMERIC,
  ADD COLUMN IF NOT EXISTS override_commission_tiered_years     INTEGER DEFAULT 1;
