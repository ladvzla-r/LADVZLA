BEGIN;

CREATE TABLE IF NOT EXISTS tournament_records (
  id SERIAL PRIMARY KEY,
  tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  record JSONB NOT NULL,
  stored_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournament_records_tournament_id ON tournament_records(tournament_id);

COMMIT;
