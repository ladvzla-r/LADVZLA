BEGIN;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS stats_overrides JSONB DEFAULT '{}'::jsonb;

COMMIT;
