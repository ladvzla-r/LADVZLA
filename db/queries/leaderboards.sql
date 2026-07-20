-- Queries examples: leaderboards and MVPs

-- Top players by wins for a given game key_name
-- Replace :game_key with 'rivals','azure','volley' or 'clash'
SELECT p.id, p.name, SUM(pp.wins) AS total_wins
FROM players p
JOIN player_participations pp ON pp.player_id = p.id
JOIN games g ON pp.game_id = g.id
WHERE g.key_name = :game_key
GROUP BY p.id, p.name
ORDER BY total_wins DESC
LIMIT 50;

-- Top MVPs by count
SELECT p.id, p.name, SUM(pp.mvps) AS total_mvps
FROM players p
JOIN player_participations pp ON pp.player_id = p.id
JOIN games g ON pp.game_id = g.id
WHERE g.key_name = :game_key
GROUP BY p.id, p.name
ORDER BY total_mvps DESC
LIMIT 50;

-- Clash: favorite cards aggregation
SELECT pp.favorite_card, COUNT(*) AS count
FROM player_participations pp
JOIN games g ON pp.game_id = g.id
WHERE g.key_name = 'clash' AND pp.favorite_card IS NOT NULL
GROUP BY pp.favorite_card
ORDER BY count DESC
LIMIT 20;
