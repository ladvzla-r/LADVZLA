import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import path from 'path';

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(process.cwd(), 'dist')));

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ladvzla' });

app.get('/api/players', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, photo_url FROM players ORDER BY name');
    res.json(rows.map((r) => ({ id: r.id, name: r.name, avatar: r.photo_url })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/players', async (req, res) => {
  const { name, avatar } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  try {
    const photoUrl = avatar && avatar.startsWith('data:') ? avatar : null;
    const q = 'INSERT INTO players(name, nickname, photo_url) VALUES($1, $2, $3) RETURNING id, name, photo_url';
    const vals = [name.trim(), name.trim(), photoUrl];
    const { rows } = await pool.query(q, vals);
    const r = rows[0];
    res.status(201).json({ id: r.id, name: r.name, avatar: r.photo_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.put('/api/players/:id', async (req, res) => {
  const { id } = req.params;
  const { name, avatar } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  try {
    const photoUrl = avatar && avatar.startsWith('data:') ? avatar : null;
    const { rows } = await pool.query(
      'UPDATE players SET name = $1, photo_url = $2 WHERE id = $3 RETURNING id, name, photo_url',
      [name.trim(), photoUrl, id],
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    const r = rows[0];
    res.json({ id: r.id, name: r.name, avatar: r.photo_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/players/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM player_participations WHERE player_id = $1', [id]);
    await pool.query('DELETE FROM players WHERE id = $1', [id]);
    await pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/players', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query('SELECT id FROM players WHERE name = $1', [name]);
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    const playerId = rows[0].id;
    await pool.query('BEGIN');
    await pool.query('DELETE FROM player_participations WHERE player_id = $1', [playerId]);
    await pool.query('DELETE FROM players WHERE id = $1', [playerId]);
    await pool.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT tr.record, t.id AS tournament_id
       FROM tournament_records tr
       JOIN tournaments t ON tr.tournament_id = t.id
       ORDER BY tr.stored_at DESC`
    );
    res.json(rows.map((r) => ({ ...r.record, id: r.record.id ?? `tournament-${r.tournament_id}` })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  const record = req.body;
  if (!record || !record.gameId || !record.participants || !Array.isArray(record.participants)) {
    return res.status(400).json({ error: 'invalid tournament record' });
  }

  try {
    const gameRes = await pool.query('SELECT id FROM games WHERE key_name = $1', [record.gameId]);
    if (!gameRes.rows.length) return res.status(400).json({ error: 'unknown gameId' });
    const gameId = gameRes.rows[0].id;
    const tournamentName = `Torneo ${record.gameId} Edición ${record.edition || 1}`;
    const startDate = record.date ? record.date.slice(0, 10) : null;

    const tournamentRes = await pool.query(
      'INSERT INTO tournaments(game_id, name, start_date) VALUES($1, $2, $3) RETURNING id',
      [gameId, tournamentName, startDate]
    );
    const tournamentId = tournamentRes.rows[0].id;

    await pool.query('INSERT INTO tournament_records(tournament_id, record) VALUES($1, $2)', [tournamentId, record]);

    const names = record.participants;
    const { rows: existingPlayers } = await pool.query('SELECT id, name FROM players WHERE name = ANY($1)', [names]);
    const playerMap = new Map(existingPlayers.map((row) => [row.name, row.id]));
    for (const playerName of names) {
      if (!playerMap.has(playerName)) {
        const insertPlayer = await pool.query(
          'INSERT INTO players(name, nickname) VALUES($1, $2) RETURNING id',
          [playerName, playerName]
        );
        playerMap.set(playerName, insertPlayer.rows[0].id);
      }
    }

    const stats = record.playerStats || {};
    for (const playerName of names) {
      const playerId = playerMap.get(playerName);
      if (!playerId) continue;
      const playerStat = stats[playerName] || {};
      await pool.query(
        `INSERT INTO player_participations(
          player_id, tournament_id, game_id, season, wins, losses, kills, goals, pts, blocks, assists, mvps, cups_count, tournaments_participations, stats)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          playerId,
          tournamentId,
          gameId,
          record.edition ? String(record.edition) : null,
          playerStat.w ?? 0,
          playerStat.l ?? 0,
          playerStat.kills ?? 0,
          playerStat.goals ?? 0,
          playerStat.points ?? 0,
          playerStat.blocks ?? 0,
          playerStat.assists ?? 0,
          playerStat.mvps ?? 0,
          record.champion === playerName ? 1 : 0,
          1,
          playerStat,
        ]
      );
    }

    res.status(201).json({ ...record, id: tournamentId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const port = process.env.PORT || 5175;
app.listen(port, () => console.log(`API server listening on ${port}`));
