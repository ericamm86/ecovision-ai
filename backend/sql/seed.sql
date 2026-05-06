INSERT INTO reports (title, description, location, category, severity)
VALUES
  ('Queimada proxima a reserva', 'Fumaca intensa e foco de incendio avancando pela mata.', 'Zona Norte', 'Queimada', 'alta'),
  ('Descarte irregular de lixo', 'Grande volume de entulho ao lado de um corrego.', 'Centro', 'Residuos', 'media'),
  ('Esgoto a ceu aberto', 'Moradores relatam odor forte e agua contaminada na rua.', 'Bairro Verde', 'Saneamento', 'media')
ON CONFLICT DO NOTHING;
