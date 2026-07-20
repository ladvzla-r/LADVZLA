Base de datos

Archivos:
- migrations/001_create_tables.sql : migración principal (Postgres)
- seeds/seed_games.sql : inserta las filas iniciales de `games`
- queries/leaderboards.sql : consultas de ejemplo (leaderboards, MVPs, cards)

Uso rápido (Postgres):

1) Crear la base de datos (ejemplo):

```bash
createdb ladvzla_db
```

2) Ejecutar la migración:

```bash
psql -d ladvzla_db -f db/migrations/001_create_tables.sql
```

3) Cargar seeds:

```bash
psql -d ladvzla_db -f db/seeds/seed_games.sql
```

Notas:
- El esquema usa `JSONB` en `player_participations.stats` para métricas adicionales.
- Ajustar tipos si usas otro motor (SQLite no soporta JSONB nativo sin extensiones).
