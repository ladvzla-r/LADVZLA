-- Seed: seed_admins.sql
-- Insert default admin user Juan with password 2303 and tournament management permission

INSERT INTO admins(username, password, can_manage_tournaments)
VALUES
  ('Juan', '2303', true),
  ('AlfredPWRX', '1423', true)
ON CONFLICT (username) DO UPDATE
  SET password = EXCLUDED.password,
      can_manage_tournaments = EXCLUDED.can_manage_tournaments;
