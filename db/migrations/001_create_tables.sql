-- Migration: 001_create_tables.sql
-- PostgreSQL schema for players, games, tournaments and participations

BEGIN;

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  photo_url TEXT,
  email TEXT,
  -- ensure nickname uniqueness for admin-added players
  CONSTRAINT players_nickname_unique UNIQUE (nickname),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  key_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE
);

CREATE TABLE IF NOT EXISTS player_participations (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id INT REFERENCES tournaments(id) ON DELETE SET NULL,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  season TEXT,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  kills INT DEFAULT 0,
  goals INT DEFAULT 0,
  pts INT DEFAULT 0,
  blocks INT DEFAULT 0,
  assists INT DEFAULT 0,
  mvps INT DEFAULT 0,
  cups_count INT DEFAULT 0,
  favorite_card TEXT,
  tournaments_participations INT DEFAULT 1,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional aggregates table (cache)
CREATE TABLE IF NOT EXISTS player_aggregates (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id INT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  -- Global ranking fields (only wins and losses, plus MVPs and tournaments)
  total_wins INT DEFAULT 0,
  total_losses INT DEFAULT 0,
  total_mvps INT DEFAULT 0,
  total_tournaments INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-game specific statistics tables
CREATE TABLE IF NOT EXISTS stats_rivales (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id INT REFERENCES tournaments(id) ON DELETE SET NULL,
  kills INT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stats_azure (
  id SERIAL PRIMARY KEY,
  player_id INT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tournament_id INT REFERENCES tournaments(id) ON DELETE SET NULL,
  goals INT DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pp_player ON player_participations(player_id);
CREATE INDEX IF NOT EXISTS idx_pp_game ON player_participations(game_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON tournaments(game_id);

COMMIT;
