-- Seed: games
INSERT INTO games (key_name, display_name) VALUES
  ('rivals', 'Rivals'),
  ('azure', 'Azure'),
  ('volley', 'Volley'),
  ('clash', 'Clash')
ON CONFLICT (key_name) DO NOTHING;
