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

// Helper: validate admin credentials sent via headers
async function checkAdminCredentials(req) {
  const username = String(req.headers['x-admin-username'] || '').trim();
  const password = String(req.headers['x-admin-password'] || '').trim();
  if (!username || !password) return false;
  try {
    const { rows } = await pool.query('SELECT can_manage_tournaments FROM admins WHERE username = $1 AND password = $2 LIMIT 1', [username, password]);
    if (!rows.length) return false;
    return !!rows[0].can_manage_tournaments;
  } catch (err) {
    console.error('Admin check error', err);
    return false;
  }
}

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
      `SELECT tr.record, t.id AS tournament_id, g.key_name AS game_key
       FROM tournament_records tr
       JOIN tournaments t ON tr.tournament_id = t.id
       JOIN games g ON t.game_id = g.id
       ORDER BY tr.stored_at DESC`
    );

    const result = [];
    for (const r of rows) {
      const record = { ...r.record, gameId: r.game_key };
      let needsUpdate = false;

      if (!record.id) {
        record.id = `tournament-${r.tournament_id}`;
        needsUpdate = true;
      }

      if (!r.record.gameId || r.record.gameId !== r.game_key) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        try {
          await pool.query('UPDATE tournament_records SET record = $1 WHERE tournament_id = $2', [record, r.tournament_id]);
        } catch (innerErr) {
          console.error('Failed to persist normalized tournament record', innerErr);
        }
      }

      result.push(record);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  // Require admin credentials to add tournaments
  try {
    const allowed = await checkAdminCredentials(req);
    if (!allowed) return res.status(401).json({ error: 'unauthorized' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed' });
  }
  const record = req.body;
  if (!record || !record.gameId || !record.participants || !Array.isArray(record.participants)) {
    return res.status(400).json({ error: 'invalid tournament record' });
  }

  try {
    const gameKey = String(record.gameId).trim();
    let gameRes = await pool.query('SELECT id FROM games WHERE key_name = $1', [gameKey]);
    let gameId = gameRes.rows[0]?.id;

    if (!gameId) {
      const displayName = gameKey
        .replace(/[-_]/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (char) => char.toUpperCase());
      await pool.query('INSERT INTO games(key_name, display_name) VALUES($1, $2) ON CONFLICT (key_name) DO NOTHING', [gameKey, displayName]);
      gameRes = await pool.query('SELECT id FROM games WHERE key_name = $1', [gameKey]);
      gameId = gameRes.rows[0]?.id;
    }

    if (!gameId) return res.status(400).json({ error: 'unknown gameId' });
    const tournamentName = `Torneo ${gameKey} Edición ${record.edition || 1}`;
    const startDate = record.date ? record.date.slice(0, 10) : null;

    const recordId = String(record.id ?? `tournament-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
    const persistedRecord = { ...record, id: recordId };

    const tournamentRes = await pool.query(
      'INSERT INTO tournaments(game_id, name, start_date) VALUES($1, $2, $3) RETURNING id',
      [gameId, tournamentName, startDate]
    );
    const tournamentId = tournamentRes.rows[0].id;

    await pool.query('INSERT INTO tournament_records(tournament_id, record) VALUES($1, $2)', [tournamentId, persistedRecord]);

    const names = persistedRecord.participants;
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

    const stats = persistedRecord.playerStats || {};
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
          persistedRecord.edition ? String(persistedRecord.edition) : null,
          playerStat.w ?? 0,
          playerStat.l ?? 0,
          playerStat.kills ?? 0,
          playerStat.goals ?? 0,
          playerStat.points ?? 0,
          playerStat.blocks ?? 0,
          playerStat.assists ?? 0,
          playerStat.mvps ?? 0,
          persistedRecord.champion === playerName ? 1 : 0,
          1,
          playerStat,
        ]
      );
    }

    res.status(201).json(persistedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.put('/api/tournaments/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id required' });

  try {
    const allowed = await checkAdminCredentials(req);
    if (!allowed) return res.status(401).json({ error: 'unauthorized' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed' });
  }

  const record = req.body;
  if (!record || !record.gameId || !record.participants || !Array.isArray(record.participants)) {
    return res.status(400).json({ error: 'invalid tournament record' });
  }

  try {
    let tournamentId = null;
    let tournamentRes = await pool.query(
      'SELECT tournament_id FROM tournament_records WHERE record->>\'id\' = $1 LIMIT 1',
      [id]
    );
    if (tournamentRes.rows.length) {
      tournamentId = tournamentRes.rows[0].tournament_id;
    } else {
      const parsedId = Number(id);
      if (Number.isInteger(parsedId)) {
        const numericRes = await pool.query('SELECT id FROM tournaments WHERE id = $1 LIMIT 1', [parsedId]);
        if (numericRes.rows.length) tournamentId = numericRes.rows[0].id;
      }
    }

    if (!tournamentId) return res.status(404).json({ error: 'not found' });

    const updatedRecord = { ...record, id };
    const gameKey = String(record.gameId).trim();
    const tournamentName = `Torneo ${gameKey} Edición ${record.edition || 1}`;
    const startDate = record.date ? record.date.slice(0, 10) : null;

    await pool.query(
      'UPDATE tournaments SET name = $1, start_date = $2 WHERE id = $3',
      [tournamentName, startDate, tournamentId]
    );
    await pool.query('UPDATE tournament_records SET record = $1 WHERE tournament_id = $2', [updatedRecord, tournamentId]);

    res.json(updatedRecord);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

app.delete('/api/tournaments/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id required' });

  // Require admin credentials to delete tournaments
  try {
    const allowed = await checkAdminCredentials(req);
    if (!allowed) return res.status(401).json({ error: 'unauthorized' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'failed' });
  }

  try {
    let tournamentId = null;

    const tournamentRes = await pool.query(
      'SELECT id FROM tournaments WHERE id::text = $1 LIMIT 1',
      [id]
    );

    if (tournamentRes.rows.length) {
      tournamentId = tournamentRes.rows[0].id;
    } else {
      const recordRes = await pool.query(
        'SELECT tournament_id FROM tournament_records WHERE record->>\'id\' = $1 LIMIT 1',
        [id]
      );
      if (recordRes.rows.length) {
        tournamentId = recordRes.rows[0].tournament_id;
      }
    }

    if (!tournamentId) {
      return res.status(404).json({ error: 'not found' });
    }

    await pool.query('DELETE FROM tournaments WHERE id = $1', [tournamentId]);
    res.status(204).end();
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
