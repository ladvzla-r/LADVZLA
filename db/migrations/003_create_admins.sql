-- Migration: 003_create_admins.sql
-- Create admins table to store admin credentials and permissions

BEGIN;

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  can_manage_tournaments BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMIT;
