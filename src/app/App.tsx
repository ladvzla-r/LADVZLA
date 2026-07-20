import { useState, useRef, useCallback, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "menu" | "tablas" | "jugadores" | "reglas" | "admin" | "torneo" | "historial";

interface PlayerStat {
  player: string;
  w: number;
  l: number;
  streak: number;
  mvp: number;
  tournamentsWon: number;
  goals?: number;
  trophies?: number;
  kills?: number;
  points?: number;
  assists?: number;
  blocks?: number;
  cups?: number;
}

interface Player {
  id?: number;
  name: string;
  avatar?: string;
  totalKills?: number;
  participations?: number;
  tournamentsWon?: number;
  mvps?: number;
}

interface GameRules {
  format: string;
  matchFormat: string;
  scoring: string;
  advancement: string;
  extra: string;
  sections?: { title: string; lines: string[] }[];
}

interface TournamentDef {
  id: string;
  name: string;
  tag: string;
  color: string;
  glow: string;
  border: string;
  textColor: string;
  bgStripe: string;
  icon: string;
  extraCols: Array<{ label: string; key: keyof PlayerStat }>;
  stats: PlayerStat[];
  rules: GameRules;
}

interface TournamentPlayerStats {
  w: number;
  l: number;
  played: number;
  kills: number;
  titles: number;
  mvps: number;
  participations: number;
  goals?: number;
  points?: number;
  assists?: number;
  blocks?: number;
  cups?: number;
}

type TournamentRecord = {
  id?: string;
  gameId: string;
  date: string;
  participants: string[];
  champion: string;
  runnerUp?: string | null;
  mvp: string | null;
  kills: Record<string, number>;
  playerStats?: Record<string, TournamentPlayerStats>;
  liguillaResults?: Record<string, string>;
  format: "liguilla" | "liguilla+elim";
  teamScores?: Record<string, { home: number | null; away: number | null }>;
  finalMatch?: {
    home: string | null;
    away: string | null;
    series: { home: number | null; away: number | null }[];
  };
  azureCharacters?: Record<string, string>;
  edition?: number;
  managedBy?: string | null;
  hidden?: boolean;
};

interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const INITIAL_PLAYERS: Player[] = [];

const TOURNAMENTS: TournamentDef[] = [
  {
    id: "rivals",
    name: "Rivals",
    tag: "ROBLOX",
    color: "#ff4d6d",
    glow: "rgba(255,77,109,0.22)",
    border: "rgba(255,77,109,0.3)",
    textColor: "#ff8fa3",
    bgStripe: "rgba(255,77,109,0.04)",
    icon: "⚔️",
    extraCols: [{ label: "Kills", key: "kills" }],
    stats: [
      { player: "Zektro",    w: 18, l: 6,  streak: 3,  mvp: 5, tournamentsWon: 2 },
      { player: "Drakken",   w: 15, l: 9,  streak: -2, mvp: 4, tournamentsWon: 1 },
      { player: "NovaSky",   w: 14, l: 10, streak: 1,  mvp: 2, tournamentsWon: 1 },
      { player: "Vortex",    w: 12, l: 12, streak: 0,  mvp: 3, tournamentsWon: 0 },
      { player: "Pixelate",  w: 10, l: 14, streak: -1, mvp: 1, tournamentsWon: 0 },
      { player: "Lumix",     w: 8,  l: 16, streak: -3, mvp: 1, tournamentsWon: 0 },
      { player: "CrashWave", w: 7,  l: 17, streak: -2, mvp: 0, tournamentsWon: 0 },
    ],
    rules: {
      format: "Liguilla 2v2 + Final Mejor de 5",
      matchFormat: "Partido único en liguilla; final mejor de 5 en servidor E.E.U.U.",
      scoring: "Victoria: 3 pts · Derrota: 0 pts",
      advancement: "Top 4 avanzan a semis. Semis: 1°vs4°, 2°vs3°. Final mejor de 5.",
      extra: "Triple empate se define por diferencia de rondas; si persiste, decide el enfrentamiento entre 2° y 3°.",
      sections: [
        {
          title: "Fase de liguilla",
          lines: [
            "Partido único cada enfrentamiento de dúos vs dúos.",
            "La posición inicial de los equipos la definirá la ruleta.",
            "En caso de triple empate, se definirá por diferencia de rondas.",
            "En caso de empate en rondas, se definirá en enfrentamiento entre el 2do y el 3ero.",
          ],
        },
        {
          title: "Fase final",
          lines: [
            "Se jugará entre finalistas un mejor de 5 en servidor de estados unidos.",
          ],
        },
        {
          title: "Reglas básicas",
          lines: [
            "Partidas en servidor neutral (E.E.U.U.).",
            "Los equipos los decide la ruleta.",
            "No usar armas prohibidas.",
            "Respetar el orden de enfrentamientos (decide la ruleta).",
            "En caso de tocar el mismo equipo en 2 torneos seguidos, al siguiente no podrían tocar juntos.",
            "Tiempo infinito.",
            "Solo jugar con las armas desbloqueadas (excepción de armas explosivas).",
          ],
        },
        {
          title: "En caso de haber 7 jugadores",
          lines: [
            "En 2 vs 1, el equipo dúo deberá llegar 1x1 sin objeción.",
            "El solitario tiene opción a botiquín si así lo desea (sin importar si lo tienen o no).",
            "El jugador que toque solo lo decidirá la ruleta.",
          ],
        },
        {
          title: "Armas y especiales prohibidas",
          lines: [
            "Lanzacohetes.",
            "Lanzagranadas.",
            "Botiquín (dúo).",
            "Minas y C4.",
            "Minigun y armas exóticas como las de laser.",
          ],
        },
      ],
    },
  },
  {
    id: "azure",
    name: "Azure Latch",
    tag: "ROBLOX",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.18)",
    border: "rgba(0,212,255,0.3)",
    textColor: "#67e8f9",
    bgStripe: "rgba(0,212,255,0.04)",
    icon: "🔵",
    extraCols: [{ label: "Goles", key: "goals" }],
    stats: [
      { player: "Pixelate",  w: 20, l: 4,  streak: 5,  mvp: 7, tournamentsWon: 2, goals: 18 },
      { player: "NovaSky",   w: 17, l: 7,  streak: 2,  mvp: 4, tournamentsWon: 1, goals: 15 },
      { player: "CrashWave", w: 14, l: 10, streak: 1,  mvp: 3, tournamentsWon: 1, goals: 12 },
      { player: "Lumix",     w: 13, l: 11, streak: -1, mvp: 2, tournamentsWon: 0, goals: 11 },
      { player: "Zektro",    w: 11, l: 13, streak: -2, mvp: 2, tournamentsWon: 0, goals: 9 },
      { player: "Vortex",    w: 9,  l: 15, streak: -1, mvp: 1, tournamentsWon: 0, goals: 7 },
      { player: "Drakken",   w: 6,  l: 18, streak: -4, mvp: 0, tournamentsWon: 0, goals: 5 },
    ],
    rules: {
      format: "Liguilla ida y vuelta + Final ida y vuelta",
      matchFormat: "Fase de liga 2v2 a ida y vuelta. Final ida y vuelta con desempate por diferencia de goles.",
      scoring: "Victoria: 3 pts · Empate: 1 pt · Derrota: 0 pts",
      advancement: "Clasifican los 2 mejores dúos. Si la final queda 1-1, se define por diferencia de goles; si sigue igual, juego extra.",
      extra: "La ruleta define los duelos y personajes. No se cambian después de que arranca la fase. Si falta un personaje, debe haber prueba; de lo contrario, derrota automática.",
      sections: [
        {
          title: "Fase de liga",
          lines: [
            "Partidos 2v2 de ida y vuelta.",
            "Clasifican los 2 mejores dúos.",
            "El desempate en tabla es por diferencia de goles.",
            "Si el desempate sigue igual, se define por duelo directo entre 2° y 3°.",
            "La posición inicial la define la ruleta.",
          ],
        },
        {
          title: "Fase final",
          lines: [
            "Final a ida y vuelta.",
            "Si queda 1-1, se usa la diferencia de goles.",
            "Si sigue empatado, se juega un extra definitorio.",
          ],
        },
        {
          title: "Reglas básicas",
          lines: [
            "Servidor de E.E.U.U. salvo el caso de dúos del sur.",
            "La ruleta decide los dúos y los personajes.",
            "No se cambian personajes una vez iniciada la fase.",
            "Si un equipo repite en dos torneos seguidos, no puede volver a coincidir en el siguiente.",
            "Si no hay pruebas de un personaje no disponible, se declara derrota automática.",
          ],
        },
        {
          title: "Sanciones",
          lines: [
            "Usar personaje distinto al asignado suma 3 goles al rival.",
            "Equipo incompleto: 1 minuto fuera y balón para el rival.",
            "No cumplir con la cuarta sanción suma 2 goles al rival.",
            "Demora: 30 segundos sin habilidades.",
            "Las sanciones pueden revisarse con VAR.",
          ],
        },
      ],
    },
  },
  {
    id: "volley",
    name: "Volley",
    tag: "ROBLOX",
    color: "#a3e635",
    glow: "rgba(163,230,53,0.18)",
    border: "rgba(163,230,53,0.3)",
    textColor: "#bef264",
    bgStripe: "rgba(163,230,53,0.04)",
    icon: "🏐",
    extraCols: [
      { label: "Pts", key: "points" },
      { label: "Asistencias", key: "assists" },
      { label: "Bloqueos", key: "blocks" },
    ],
    stats: [
      { player: "Vortex",    w: 16, l: 6,  streak: 4,  mvp: 4, tournamentsWon: 2, points: 42, assists: 18, blocks: 11 },
      { player: "CrashWave", w: 14, l: 8,  streak: 2,  mvp: 3, tournamentsWon: 1, points: 37, assists: 14, blocks: 9 },
      { player: "Lumix",     w: 13, l: 9,  streak: 1,  mvp: 3, tournamentsWon: 1, points: 31, assists: 12, blocks: 8 },
      { player: "Drakken",   w: 12, l: 10, streak: -1, mvp: 2, tournamentsWon: 0, points: 28, assists: 10, blocks: 7 },
      { player: "Zektro",    w: 10, l: 12, streak: 0,  mvp: 2, tournamentsWon: 0, points: 24, assists: 9, blocks: 6 },
      { player: "NovaSky",   w: 8,  l: 14, streak: -2, mvp: 1, tournamentsWon: 0, points: 19, assists: 8, blocks: 5 },
      { player: "Pixelate",  w: 5,  l: 17, streak: -5, mvp: 0, tournamentsWon: 0, points: 11, assists: 4, blocks: 3 },
    ],
    rules: {
      format: "Liguilla + Eliminación",
      matchFormat: "Partido a 25 puntos · Final mejor de 5",
      scoring: "Victoria: W · Derrota: L · Empate de W se define por PF/PA",
      advancement: "Top 4 avanzan. Semis: 1°vs4°, 2°vs3°. Final mejor de 5.",
      extra: "Se posiciona por W/L; si hay empate de W se toma en cuenta los puntos a favor y en contra.",
    },
  },
  {
    id: "clashroyale",
    name: "Clash Royale",
    tag: "MOBILE",
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.18)",
    border: "rgba(245,158,11,0.3)",
    textColor: "#fcd34d",
    bgStripe: "rgba(245,158,11,0.04)",
    icon: "👑",
    extraCols: [{ label: "Copas", key: "cups" }],
    stats: [
      { player: "NovaSky",   w: 22, l: 5,  streak: 6,  mvp: 0, tournamentsWon: 3, trophies: 8340 },
      { player: "Zektro",    w: 19, l: 8,  streak: 2,  mvp: 0, tournamentsWon: 1, trophies: 7810 },
      { player: "Lumix",     w: 17, l: 10, streak: 1,  mvp: 0, tournamentsWon: 1, trophies: 7200 },
      { player: "Vortex",    w: 14, l: 13, streak: -1, mvp: 0, tournamentsWon: 0, trophies: 6650 },
      { player: "Pixelate",  w: 12, l: 15, streak: -2, mvp: 0, tournamentsWon: 0, trophies: 6120 },
      { player: "Drakken",   w: 9,  l: 18, streak: -3, mvp: 0, tournamentsWon: 0, trophies: 5480 },
      { player: "CrashWave", w: 7,  l: 20, streak: -4, mvp: 0, tournamentsWon: 0, trophies: 4990 },
    ],
    rules: {
      format: "Liga de mazos + Semis/Final mejor de 3",
      matchFormat: "Fase de liga a partido único; semis y final al mejor de 5 (primero a 3).",
      scoring: "Victoria por coronas: 3 puntos · Derrota: 0 puntos",
      advancement: "Los primeros 4 clasifican directo a semis. El quinto puede retar con wildcard.",
      extra: "Top 1 obtiene ventaja en semis. No se repiten mazos exactos en fases finales.",
      sections: [
        {
          title: "Fase de liga",
          lines: [
            "Enfrentamientos a partido único.",
            "Jugar con al menos 4 mazos diferentes entre los 6 duelos posibles.",
            "Se permite repetir un mazo una sola vez, pero no de forma consecutiva.",
            "Todos los partidos se juegan en simultáneo.",
            "Cada mazo debe tener al menos 5 cartas diferentes respecto al último mazo usado.",
            "Clasifican los primeros 4 jugadores.",
            "El jugador que quede 5° obtiene opción a wildcard.",
            "Si clasifica con wildcard, puede retar al top 4 en un duelo extra.",
            "Si el top 4 gana 1 duelo, clasifica directo a semis.",
            "El top 5 debe ganar 2 duelos para clasificar.",
            "Top 1 obtiene ventaja en semis.",
            "Ninguna carta puede ser baneada.",
          ],
        },
        {
          title: "Fase final",
          lines: [
            "Los emparejamientos se basan en la posición de la fase de liga: 1 vs 4 y 2 vs 3.",
            "El top 1 puede repetir hasta 4 cartas del mazo que desee solo en semis contra el top 4.",
            "Semis y final se juegan al mejor de 3.",
            "No se pueden repetir mazos exactos en fases finales.",
            "Cada mazo debe tener al menos 5 cartas diferentes del último mazo usado en fases finales.",
            "Los mazos se reinician al inicio de semis y también al inicio de la final.",
            "Puedes usar en fases finales los mazos de la fase de liga sin importar el rival.",
          ],
        },
        {
          title: "Sanciones",
          lines: [
            "Infringir una norma en la liguilla te baneará de usar 3 cartas en los próximos 4 duelos, decididas por los restantes.",
            "Infringir más de una norma en la liguilla elimina automáticamente del torneo.",
            "Infringir una norma en fase final da la victoria automática al rival.",
            "Infringir más de una norma en fase final elimina automáticamente del torneo.",
            "Cada infracción involuntaria puede ser corregida por los espectadores (VAR).",
          ],
        },
      ],
    },
  },
];

const AZURE_CHARACTERS = [
  "Isagi","Gagamaru","Chigiri","Nagi","Sae","Barou","Aiku","Yukimiya","Kunigami","Kiyora","Karasu","Otoya","Bachira","Kurona","Kaiser","Don Lorenzo","Rin","Reo","Shidou"
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const wr = (w: number, l: number) => {
  const t = w + l;
  return t === 0 ? 0 : Math.round((w / t) * 100);
};

const medal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}°`;
};

interface TeamInfo {
  team: string;
  players: string[];
}

interface TeamInfo {
  team: string;
  players: string[];
}

function generateRoundRobin(players: string[]) {
  const list = players.length % 2 === 1 ? [...players, "BYE"] : [...players];
  const rounds: { round: number; matches: [string, string][] }[] = [];
  for (let r = 0; r < list.length - 1; r++) {
    const matches: [string, string][] = [];
    for (let i = 0; i < list.length / 2; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home !== "BYE" && away !== "BYE") matches.push([home, away]);
    }
    rounds.push({ round: r + 1, matches });
    const last = list[list.length - 1];
    for (let i = list.length - 1; i > 1; i--) list[i] = list[i - 1];
    list[1] = last;
  }
  return rounds;
}

function generateDoubleRoundRobin(players: string[]) {
  const firstLeg = generateRoundRobin(players);
  const secondLeg = firstLeg.map((round) => ({
    round: round.round + firstLeg.length,
    matches: round.matches.map(([home, away]) => [away, home] as [string, string]),
  }));
  return [...firstLeg, ...secondLeg];
}

function buildRivalsTeams(players: string[]): TeamInfo[] {
  const teams: TeamInfo[] = [];
  const copy = [...players];
  while (copy.length >= 2) {
    const first = copy.shift()!;
    const second = copy.shift()!;
    teams.push({ team: `${first} + ${second}`, players: [first, second] });
  }
  if (copy.length === 1) {
    teams.push({ team: `Solo ${copy[0]}`, players: [copy[0]] });
  }
  return teams;
}

function isValidRivalsScore(score: { home: number | null; away: number | null }) {
  const { home, away } = score;
  return home !== null && away !== null && ((home === 5 && away >= 0 && away < 5) || (away === 5 && home >= 0 && home < 5));
}

function getRivalsMatchWinner(score: { home: number | null; away: number | null }, home: string, away: string) {
  if (!isValidRivalsScore(score)) return null;
  return score.home === 5 ? home : away;
}

function isValidVolleyScore(score: { home: number | null; away: number | null }) {
  const { home, away } = score;
  if (home === null || away === null) return false;
  const homeWins = home >= 25 && home > away;
  const awayWins = away >= 25 && away > home;
  return homeWins || awayWins;
}

function getVolleyMatchWinner(score: { home: number | null; away: number | null }, home: string, away: string) {
  if (!isValidVolleyScore(score)) return null;
  return score.home && score.home > score.away ? home : away;
}

function isValidClashRoyaleScore(score: { home: number | null; away: number | null }) {
  const { home, away } = score;
  const validHome = home !== null && Number.isInteger(home) && home >= 0 && home <= 3;
  const validAway = away !== null && Number.isInteger(away) && away >= 0 && away <= 3;
  return validHome && validAway && home !== away;
}

function getClashRoyaleMatchWinner(score: { home: number | null; away: number | null }, home: string, away: string) {
  if (!isValidClashRoyaleScore(score)) return null;
  if (score.home > score.away) return home;
  if (score.away > score.home) return away;
  return null;
}

function computeClashRoyaleStandings(
  players: string[],
  rounds: { round: number; matches: [string, string][] }[],
  scores: Record<string, { home: number; away: number }>
) {
  const s: Record<string, { w: number; l: number; played: number; crownsFor: number; crownsAgainst: number; crownDiff: number }> = {};
  for (const player of players) s[player] = { w: 0, l: 0, played: 0, crownsFor: 0, crownsAgainst: 0, crownDiff: 0 };
  for (const round of rounds) {
    for (const [home, away] of round.matches) {
      const key = `${round.round}|${home}|${away}`;
      const score = scores[key];
      if (!score) continue;
      s[home].played += 1;
      s[away].played += 1;
      s[home].crownsFor += score.home;
      s[home].crownsAgainst += score.away;
      s[away].crownsFor += score.away;
      s[away].crownsAgainst += score.home;
      s[home].crownDiff = s[home].crownsFor - s[home].crownsAgainst;
      s[away].crownDiff = s[away].crownsFor - s[away].crownsAgainst;

      const winner = getClashRoyaleMatchWinner(score, home, away);
      if (!winner) continue;
      const loser = winner === home ? away : home;
      s[winner].w += 1;
      s[loser].l += 1;
    }
  }
  return Object.entries(s)
    .map(([player, data]) => ({ player, ...data }))
    .sort((a, b) => b.w - a.w || b.crownDiff - a.crownDiff || b.crownsFor - a.crownsFor || a.player.localeCompare(b.player));
}

function computeRivalsStandings(
  teams: string[],
  rounds: { round: number; matches: [string, string][] }[],
  scores: Record<string, { home: number; away: number }>
) {
  const s: Record<string, { w: number; l: number; pts: number; rndFor: number; rndAgainst: number }> = {};
  for (const team of teams) s[team] = { w: 0, l: 0, pts: 0, rndFor: 0, rndAgainst: 0 };
  for (const round of rounds) {
    for (const [home, away] of round.matches) {
      const key = `${round.round}|${home}|${away}`;
      const score = scores[key];
      if (!score) continue;
      const winner = getRivalsMatchWinner(score, home, away);
      if (!winner) continue;
      const loser = winner === home ? away : home;
      s[winner].w += 1;
      s[loser].l += 1;
      s[winner].pts += 3;
      s[home].rndFor += score.home;
      s[home].rndAgainst += score.away;
      s[away].rndFor += score.away;
      s[away].rndAgainst += score.home;
    }
  }
  return Object.entries(s)
    .map(([team, data]) => ({
      player: team,
      ...data,
      played: data.w + data.l,
      rndDiff: data.rndFor - data.rndAgainst,
    }))
    .sort((a, b) => b.pts - a.pts || b.rndDiff - a.rndDiff || b.w - a.w);
}

function computeAzureStandings(
  teams: string[],
  rounds: { round: number; matches: [string, string][] }[],
  scores: Record<string, { home: number; away: number }>
) {
  const s: Record<string, { w: number; l: number; d: number; pts: number; gf: number; ga: number; played: number }> = {};
  for (const team of teams) s[team] = { w: 0, l: 0, d: 0, pts: 0, gf: 0, ga: 0, played: 0 };
  for (const round of rounds) {
    for (const [home, away] of round.matches) {
      const key = `${round.round}|${home}|${away}`;
      const score = scores[key];
      if (!score) continue;
      const homeGoals = score.home;
      const awayGoals = score.away;
      s[home].played += 1;
      s[away].played += 1;
      s[home].gf += homeGoals;
      s[home].ga += awayGoals;
      s[away].gf += awayGoals;
      s[away].ga += homeGoals;
      if (homeGoals > awayGoals) {
        s[home].w += 1;
        s[home].pts += 3;
        s[away].l += 1;
      } else if (awayGoals > homeGoals) {
        s[away].w += 1;
        s[away].pts += 3;
        s[home].l += 1;
      } else {
        s[home].d += 1;
        s[away].d += 1;
        s[home].pts += 1;
        s[away].pts += 1;
      }
    }
  }
  return Object.entries(s)
    .map(([player, data]) => ({ player, ...data, gd: data.gf - data.ga }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || b.w - a.w || a.player.localeCompare(b.player));
}

function computeVolleyStandings(
  players: string[],
  rounds: { round: number; matches: [string, string][] }[],
  scores: Record<string, { home: number; away: number }>
) {
  const s: Record<string, { w: number; l: number; pf: number; pa: number; diff: number }> = {};
  for (const p of players) s[p] = { w: 0, l: 0, pf: 0, pa: 0, diff: 0 };
  for (const round of rounds) {
    for (const [home, away] of round.matches) {
      const key = `${round.round}|${home}|${away}`;
      const score = scores[key];
      if (!score) continue;
      const winner = getVolleyMatchWinner(score, home, away);
      if (!winner) continue;
      const loser = winner === home ? away : home;
      s[winner].w += 1;
      s[loser].l += 1;
      s[home].pf += score.home;
      s[home].pa += score.away;
      s[away].pf += score.away;
      s[away].pa += score.home;
    }
  }
  return Object.entries(s)
    .map(([player, data]) => ({ player, ...data, played: data.w + data.l, diff: data.pf - data.pa }))
    .sort((a, b) => b.w - a.w || b.diff - a.diff || b.pf - a.pf || a.player.localeCompare(b.player));
}

function computeStandings(
  players: string[],
  rounds: { round: number; matches: [string, string][] }[],
  results: Record<string, string>
) {
  const s: Record<string, { w: number; l: number; pts: number }> = {};
  for (const p of players) s[p] = { w: 0, l: 0, pts: 0 };
  for (const round of rounds) {
    for (const [home, away] of round.matches) {
      const key = `${round.round}|${home}|${away}`;
      const winner = results[key];
      if (winner) {
        const loser = winner === home ? away : home;
        s[winner].w++; s[winner].pts += 3;
        s[loser].l++;
      }
    }
  }
  return Object.entries(s)
    .map(([player, data]) => ({ player, ...data, played: data.w + data.l }))
    .sort((a, b) => b.pts - a.pts || b.w - a.w);
}

function getRecordPlayerStats(record: TournamentRecord, playerName: string, gameId?: string): TournamentPlayerStats {
  const participates = record.participants.includes(playerName);
  const titleCount = record.champion === playerName ? 1 : 0;
  const mvpCount = record.mvp === playerName ? 1 : 0;
  const base = record.playerStats?.[playerName];
  const extraStats = Object.fromEntries(
    (TOURNAMENTS.find((t) => t.id === gameId)?.extraCols ?? []).map((col) => [col.key, (base as Record<string, number | undefined> | undefined)?.[col.key] ?? 0])
  );
  if (base) {
    return {
      w: base.w,
      l: base.l,
      played: base.played,
      kills: record.kills[playerName] ?? base.kills,
      titles: base.titles ?? titleCount,
      mvps: base.mvps ?? mvpCount,
      participations: base.participations ?? (participates ? 1 : 0),
      ...extraStats,
    };
  }
  return {
    w: 0,
    l: 0,
    played: 0,
    kills: record.kills[playerName] ?? 0,
    titles: titleCount,
    mvps: mvpCount,
    participations: participates ? 1 : 0,
    ...Object.fromEntries((TOURNAMENTS.find((t) => t.id === gameId)?.extraCols ?? []).map((col) => [col.key, 0])),
  };
}

function buildGameStats(gameId: string, players: Player[], history: TournamentRecord[]) {
  const gameDef = TOURNAMENTS.find((t) => t.id === gameId);
  const extraKeys = gameDef?.extraCols.map((col) => col.key) ?? [];
  const stats: Record<string, TournamentPlayerStats & Record<string, number | undefined>> = Object.fromEntries(
    players.map((p) => [p.name, { w: 0, l: 0, played: 0, kills: 0, titles: 0, mvps: 0, participations: 0, ...Object.fromEntries(extraKeys.map((key) => [key, 0])) }])
  );

  for (const player of players) {
    const seed = gameDef?.stats.find((s) => s.player === player.name);
    if (seed) {
      stats[player.name].kills += seed.kills ?? 0;
      for (const key of extraKeys) {
        const seedValue = (seed as Record<string, number | undefined>)[key];
        if (typeof seedValue === "number") {
          stats[player.name][key] = seedValue;
        }
      }
    }
  }

  for (const record of history.filter((r) => r.gameId === gameId)) {
    for (const player of players) {
      const rec = getRecordPlayerStats(record, player.name, gameId);
      stats[player.name].w += rec.w;
      stats[player.name].l += rec.l;
      stats[player.name].played += rec.played;
      stats[player.name].kills += rec.kills;
      stats[player.name].titles += rec.titles;
      stats[player.name].mvps += rec.mvps;
      stats[player.name].participations += rec.participations;
      for (const key of extraKeys) {
        const value = (rec as Record<string, number | undefined>)[key];
        if (typeof value === "number") {
          stats[player.name][key] = (stats[player.name][key] ?? 0) + value;
        }
      }
    }
  }

  return players.map((player) => ({
    player: player.name,
    ...stats[player.name],
    winRate: wr(stats[player.name].w, stats[player.name].l),
  }));
}

function buildGlobalStats(players: Player[], history: TournamentRecord[]) {
  const stats: Record<string, TournamentPlayerStats> = Object.fromEntries(
    players.map((p) => [p.name, { w: 0, l: 0, played: 0, kills: 0, titles: 0, mvps: 0, participations: 0 }])
  );

  for (const record of history) {
    for (const player of players) {
      const rec = getRecordPlayerStats(record, player.name);
      stats[player.name].w += rec.w;
      stats[player.name].l += rec.l;
      stats[player.name].played += rec.played;
      stats[player.name].kills += rec.kills;
      stats[player.name].titles += rec.titles;
      stats[player.name].mvps += rec.mvps;
      stats[player.name].participations += rec.participations;
    }
  }

  return players.map((player) => ({
    player: player.name,
    ...stats[player.name],
    winRate: wr(stats[player.name].w, stats[player.name].l),
  }));
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function useRipple(duration = 550) {
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const nextId = useRef(0);
  const trigger = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2.2;
    const id = nextId.current++;
    setRipples((p) => [...p, { id, x: e.clientX - rect.left, y: e.clientY - rect.top, size }]);
    setTimeout(() => setRipples((p) => p.filter((r) => r.id !== id)), duration + 100);
  }, [duration]);
  return { ripples, trigger, duration };
}

function Ripple({ color = "rgba(255,255,255,0.18)", duration = 550, children, className = "", onClick, style }: {
  color?: string; duration?: number; children?: React.ReactNode;
  className?: string; onClick?: () => void; style?: React.CSSProperties;
}) {
  const { ripples, trigger } = useRipple(duration);
  return (
    <div
      className={`relative overflow-hidden cursor-pointer select-none ${className}`}
      style={style}
      onMouseDown={(e) => { trigger(e); onClick?.(); }}
    >
      {children}
      {ripples.map((r) => (
        <span key={r.id} style={{
          position: "absolute", left: r.x - r.size / 2, top: r.y - r.size / 2,
          width: r.size, height: r.size, borderRadius: "50%", background: color,
          transform: "scale(0)", pointerEvents: "none",
          animation: `ripple-expand ${duration}ms cubic-bezier(0.4,0,0.2,1) forwards`,
        }} />
      ))}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Ripple
      onClick={onClick}
      color="rgba(255,255,255,0.1)"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mb-8 transition-colors"
      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#a0a0b8", fontFamily: "'Barlow', sans-serif" }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      MENÚ
    </Ripple>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return <span style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace", fontSize: "12px" }}>—</span>;
  const win = streak > 0;
  return (
    <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{
      fontFamily: "JetBrains Mono,monospace",
      background: win ? "rgba(163,230,53,0.15)" : "rgba(239,68,68,0.15)",
      color: win ? "#a3e635" : "#f87171",
    }}>
      {win ? `W${streak}` : `L${Math.abs(streak)}`}
    </span>
  );
}

function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-4xl font-extrabold tracking-tight leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#e8e8f0" }}>{children}</h2>
      {sub && <p className="mt-1.5 text-sm" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{sub}</p>}
    </div>
  );
}

// ─── Home Menu ────────────────────────────────────────────────────────────────

const MENU_ITEMS: { id: View; icon: string; label: string; desc: string; color: string; glow: string; border: string; adminOnly?: boolean }[] = [
  { id: "tablas",    icon: "📊", label: "TABLAS",         desc: "Estadísticas W/L, MVPs y títulos por torneo",      color: "#7c3aed", glow: "rgba(124,58,237,0.3)",  border: "rgba(124,58,237,0.35)" },
  { id: "jugadores", icon: "🎮", label: "JUGADORES",      desc: "Perfiles individuales con stats acumuladas",        color: "#00d4ff", glow: "rgba(0,212,255,0.25)",  border: "rgba(0,212,255,0.3)"  },
  { id: "historial", icon: "🗂️", label: "HISTORIAL",      desc: "Ver torneos jugados y resultados por categoría",     color: "#f472b6", glow: "rgba(244,114,182,0.25)", border: "rgba(244,114,182,0.35)" },
  { id: "reglas",    icon: "📋", label: "REGLAS",         desc: "Formatos y reglamento de cada torneo",              color: "#a3e635", glow: "rgba(163,230,53,0.22)", border: "rgba(163,230,53,0.3)" },
  
  { id: "torneo",    icon: "🏆", label: "NUEVO TORNEO",   desc: "Genera liguilla y cuadro de eliminación",          color: "#f59e0b", glow: "rgba(245,158,11,0.25)", border: "rgba(245,158,11,0.3)" },
  { id: "admin",     icon: "🔐", label: "ADMIN",          desc: "Gestionar jugadores — acceso restringido",         color: "#ff4d6d", glow: "rgba(255,77,109,0.25)", border: "rgba(255,77,109,0.3)", adminOnly: true },
];

function HomeMenu({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div style={{ position: "absolute", top: "10%", left: "15%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 65%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "800px", height: "800px", background: "radial-gradient(circle, rgba(245,158,11,0.03) 0%, transparent 60%)", borderRadius: "50%" }} />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>
            Torneos de Amigos · 2025
          </p>
          <h1 className="text-6xl sm:text-7xl font-extrabold leading-none tracking-tight mb-4" style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            background: "linear-gradient(135deg, #ffffff 0%, #a0a0b8 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            TOURNAMENT HUB
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>
            <span>7 JUGADORES</span>
            <span className="w-1 h-1 rounded-full" style={{ background: "#3a3a50", display: "inline-block" }} />
            <span>4 JUEGOS</span>
            <span className="w-1 h-1 rounded-full" style={{ background: "#3a3a50", display: "inline-block" }} />
            <span>TEMPORADA ACTIVA</span>
          </div>
        </div>

        {/* Menu grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MENU_ITEMS.map((item) => (
            <Ripple
              key={item.id}
              color={`${item.color}25`}
              onClick={() => onNavigate(item.id)}
              className="rounded-2xl p-6 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(145deg, #0f0f1a, #09090f)",
                border: `1px solid ${item.border}`,
                boxShadow: `0 0 40px ${item.glow}`,
              }}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl leading-none">{item.icon}</span>
                {item.adminOnly && (
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(255,77,109,0.15)", color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace", border: "1px solid rgba(255,77,109,0.25)" }}>
                    ADMIN
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-wide leading-none mb-1.5" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: item.color }}>
                  {item.label}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "#6b6b88" }}>{item.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold mt-auto" style={{ fontFamily: "JetBrains Mono,monospace", color: item.color }}>
                ENTRAR
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </Ripple>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tablas View ──────────────────────────────────────────────────────────────

function TournamentTable({ t, sortKey, setSortKey, players, history }: {
  t: TournamentDef;
  sortKey: string;
  setSortKey: (k: string) => void;
  players: Player[];
  history: TournamentRecord[];
}) {
  const filteredStats = buildGameStats(t.id, players, history);
  const sorted = [...filteredStats].sort((a, b) => {
    if (sortKey === "wr" || sortKey === "rank") return b.winRate - a.winRate || b.w - a.w;
    if (sortKey === "w") return b.w - a.w;
    if (sortKey === "l") return a.l - b.l;
    if (sortKey === "titles") return b.titles - a.titles;
    const metricKey = t.extraCols.find((col) => col.key === sortKey)?.key;
    if (metricKey) {
      const av = (a as Record<string, number | undefined>)[metricKey] ?? 0;
      const bv = (b as Record<string, number | undefined>)[metricKey] ?? 0;
      return (bv as number) - (av as number);
    }
    return 0;
  });
  const totalMatches = filteredStats.reduce((acc, s) => acc + s.played, 0);

  return (
    <section className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}`, background: "linear-gradient(160deg, #0f0f1a 0%, #09090f 100%)", boxShadow: `0 0 60px ${t.glow}` }}>
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${t.border}`, background: t.bgStripe }}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{t.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-extrabold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: t.color, textShadow: `0 0 20px ${t.glow}` }}>{t.name.toUpperCase()}</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ fontFamily: "JetBrains Mono,monospace", background: `${t.color}18`, color: t.textColor, border: `1px solid ${t.border}` }}>{t.tag}</span>
            </div>
            <p className="text-xs mt-1" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>{filteredStats.filter((s) => s.participations > 0).length} jugadores · {totalMatches} partidas totales</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-2.5 flex items-center gap-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[10px] mr-1" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>ORDEN:</span>
        {([['rank', 'RANKING'], ['w', 'W'], ['l', 'L'], ['wr', 'WIN%'], ['titles', 'TÍTULOS'], ...t.extraCols.map((col) => [col.key, col.label.toUpperCase()] as const)] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSortKey(k)}
            className="text-[10px] px-2.5 py-1 rounded-lg transition-all"
            style={{ fontFamily: "JetBrains Mono,monospace", background: sortKey === k ? `${t.color}20` : "transparent", color: sortKey === k ? t.textColor : "#6b6b88", border: sortKey === k ? `1px solid ${t.border}` : "1px solid transparent" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {['#', 'JUGADOR', 'W', 'L', 'PARTIDAS', 'WIN%', 'TÍTULOS', 'MVPs', 'PARTIC.', ...t.extraCols.map((col) => col.label.toUpperCase()), ''].map((h, i) => (
                <th key={i} className={`py-3 text-[10px] font-medium ${i === 0 ? "pl-6 pr-2 text-left w-10" : i === 1 ? "px-2 text-left" : i === 9 + t.extraCols.length ? "px-6 text-right" : "px-4 text-center"}`}
                  style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const rate = wr(s.w, s.l);
              const isTop = i === 0;
              return (
                <tr key={s.player}
                  className="transition-colors"
                  style={{ background: isTop ? `${t.color}07` : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${t.color}0e`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isTop ? `${t.color}07` : "transparent"; }}
                >
                  <td className="py-3.5 pl-6 pr-2 text-sm font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: i < 3 ? t.color : "#6b6b88" }}>{medal(i + 1)}</td>
                  <td className="py-3.5 px-2">
                    <div className="flex items-center gap-2.5">
                      <div>
                        {(() => {
                          const pObj = players.find((p) => p.name === s.player);
                          return (
                            <Avatar className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: isTop ? `${t.color}22` : "rgba(255,255,255,0.05)", border: isTop ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.06)", color: isTop ? t.color : "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px" }}>
                              {pObj?.avatar ? <AvatarImage src={pObj.avatar} alt={s.player} /> : <AvatarFallback className="text-xs font-bold">{s.player.slice(0, 2).toUpperCase()}</AvatarFallback>}
                            </Avatar>
                          );
                        })()}
                      </div>
                      <span className="font-semibold text-sm" style={{ fontFamily: "'Barlow', sans-serif", color: isTop ? "#f0f0f8" : "#c8c8d8" }}>{s.player}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{s.w}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{s.l}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#c8c8d8" }}>{s.played}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: rate >= 60 ? t.color : rate >= 45 ? "#e8e8f0" : "#6b6b88" }}>{rate}%</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#fcd34d" }}>{s.titles}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a78bfa" }}>{s.mvps}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>{s.participations}</td>
                  {t.extraCols.map((col) => {
                    const value = (s as Record<string, number | undefined>)[col.key] ?? 0;
                    return (
                      <td key={col.key} className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: t.textColor }}>
                        {value}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-6">
                    <div style={{ width: "60px", height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${rate}%`, background: `linear-gradient(90deg, ${t.color}70, ${t.color})`, borderRadius: "99px" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HistorialView({ tournaments, history, onBack, onDeleteTournament, onUpdateTournament }: { tournaments: TournamentDef[]; history: TournamentRecord[]; onBack: () => void; onDeleteTournament: (id: string) => void; onUpdateTournament: (record: TournamentRecord) => void; }) {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [expandedRecords, setExpandedRecords] = useState<Record<string, boolean>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editChampion, setEditChampion] = useState("");
  const [editRunnerUp, setEditRunnerUp] = useState("");
  const [editError, setEditError] = useState("");
  const selectedGame = selectedGameId ? tournaments.find((t) => t.id === selectedGameId) : null;
  const filteredHistory = selectedGameId
    ? history.filter((record) => record.gameId === selectedGameId)
    : [];
  const toggleRecord = (id: string) => setExpandedRecords((prev) => ({ ...prev, [id]: !prev[id] }));

  const tryAdminPin = () => {
    const adminName = ADMIN_PINS[adminPin];
    if (adminName) {
      setIsAdmin(true);
      setAdminPinError(false);
      setAdminPin("");
      if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_SESSION_KEY, adminName);
    } else {
      setAdminPinError(true);
      setAdminPin("");
    }
  };

  const startEditingRecord = (recordId: string, record: TournamentRecord) => {
    setEditingRecordId(recordId);
    setEditChampion(record.champion);
    setEditRunnerUp(record.runnerUp ?? "");
    setEditError("");
  };

  const saveRecordEdits = (recordId: string, record: TournamentRecord) => {
    const championValue = editChampion.trim();
    if (!championValue) {
      setEditError("El nombre del campeón no puede quedar vacío.");
      return;
    }
    onUpdateTournament({
      ...record,
      champion: championValue,
      runnerUp: editRunnerUp.trim() || null,
    });
    setEditingRecordId(null);
    setEditError("");
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <BackButton onClick={onBack} />
        <SectionTitle sub="Selecciona una categoría de torneo para ver los resultados">HISTORIAL DE TORNEOS</SectionTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((t) => (
            <Ripple
              key={t.id}
              color={`${t.color}15`}
              onClick={() => setSelectedGameId(t.id)}
              className="rounded-2xl p-5 transition-all"
              style={{
                background: selectedGameId === t.id ? `${t.color}20` : "rgba(255,255,255,0.04)",
                border: selectedGameId === t.id ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{t.icon}</span>
                <div>
                  <h3 className="text-lg font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: t.color }}>{t.name}</h3>
                  <p className="text-[11px]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{t.tag}</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#c8c8d8" }}>{t.rules.format}</p>
            </Ripple>
          ))}
        </div>

        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {!selectedGame ? (
            <div className="text-center py-20">
              <p className="text-sm font-semibold" style={{ color: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif" }}>Selecciona primero una categoría de torneo.</p>
              <p className="text-xs mt-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Aquí verás todos los torneos jugados con su fecha, campeón, MVP y detalles.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedGame.icon}</span>
                    <div>
                      <h2 className="text-3xl font-extrabold" style={{ color: selectedGame.color, fontFamily: "'Barlow Condensed', sans-serif" }}>{selectedGame.name}</h2>
                      <p className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{filteredHistory.length} torneos jugados</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>{selectedGame.rules.matchFormat}</p>
              </div>

              <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {!isAdmin ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Desbloquear edición</p>
                      <input
                        type="password"
                        value={adminPin}
                        onChange={(e) => { setAdminPin(e.target.value); setAdminPinError(false); }}
                        onKeyDown={(e) => e.key === "Enter" && tryAdminPin()}
                        placeholder="PIN administrador"
                        className="w-full rounded-2xl px-4 py-3 text-sm"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace" }}
                      />
                      {adminPinError && <p className="text-xs mt-2" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>PIN incorrecto.</p>}
                    </div>
                    <button onClick={tryAdminPin} className="rounded-2xl px-5 py-3 text-sm font-semibold" style={{ background: "rgba(255,77,109,0.15)", color: "#ff9aa3", border: "1px solid rgba(255,77,109,0.2)", fontFamily: "JetBrains Mono,monospace" }}>
                      INGRESAR ADMIN
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm font-semibold" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>Modo administrador activo. Solo el admin puede editar los resultados guardados.</p>
                    <button onClick={() => { setIsAdmin(false); setEditingRecordId(null); }} className="rounded-2xl px-5 py-3 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono,monospace" }}>
                      SALIR ADMIN
                    </button>
                  </div>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm font-semibold" style={{ color: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif" }}>No hay torneos guardados para esta categoría.</p>
                  <p className="text-xs mt-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Crea un nuevo torneo y guarda los resultados para que aparezcan aquí.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHistory.slice().reverse().map((record, index) => {
                    const recordId = record.id ?? `${record.date}-${index}`;
                    const expanded = expandedRecords[recordId];
                    return (
                      <div key={recordId} className="rounded-3xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${selectedGame.border}` }}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                  <div>
                                      <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{formatDate(record.date)}</p>
                                      <p className="text-sm" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>{selectedGame?.name ?? record.gameId} · Edición {record.edition ?? 1}</p>
                                      <p className="text-sm" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Gestionado por Admin: {record.managedBy ?? "Rikardo"}</p>
                                      <h3 className="text-xl font-extrabold" style={{ color: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif" }}>Campeón: {record.champion}</h3>
                                      {record.runnerUp && (
                                        <p className="text-sm mt-1" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>Subcampeón: {record.runnerUp}</p>
                                      )}
                                    </div>
                          <div className="flex flex-col sm:items-end gap-3">
                            <div className="text-right">
                              <p className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Formato</p>
                              <p className="text-sm font-semibold" style={{ color: selectedGame.color }}>{record.format}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <button onClick={() => toggleRecord(recordId)} className="rounded-full px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#fbbf24", fontFamily: "JetBrains Mono,monospace", border: "1px solid rgba(255,255,255,0.1)" }}>
                                {expanded ? "Ocultar detalles" : "Ver detalles"}
                              </button>
                              {isAdmin && (
                                <>
                                  <button onClick={() => startEditingRecord(recordId, record)} className="rounded-full px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(99,102,241,0.15)", color: "#c7d2fe", fontFamily: "JetBrains Mono,monospace", border: "1px solid rgba(99,102,241,0.2)" }}>
                                    Editar
                                  </button>
                                  <button onClick={() => onDeleteTournament(recordId)} className="rounded-full px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(255,77,109,0.15)", color: "#ff9aa3", fontFamily: "JetBrains Mono,monospace", border: "1px solid rgba(255,77,109,0.2)" }}>
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`transition-all duration-300 overflow-hidden ${expanded ? "max-h-[1200px]" : "max-h-0"}`}>
                          {expanded && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                {record.gameId === "clashroyale" ? (
                                  <>
                                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Coronas</p>
                                      <div className="text-sm space-y-2 max-h-52 overflow-y-auto" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                        {(() => {
                                          const crowns: Record<string, number> = {};
                                          if (record.teamScores) {
                                            Object.entries(record.teamScores).forEach(([match, sc]: any) => {
                                              const parts = String(match).split("|");
                                              const home = parts[1] ?? parts[0];
                                              const away = parts[2] ?? parts[1];
                                              crowns[home] = (crowns[home] ?? 0) + (sc?.home ?? 0);
                                              crowns[away] = (crowns[away] ?? 0) + (sc?.away ?? 0);
                                            });
                                          }
                                          return (Object.entries(crowns).length ? Object.entries(crowns) : (record.participants || []).map((p: string) => [p, 0])).sort((a: any, b: any) => b[1] - a[1]).map(([player, val]: any) => (
                                            <div key={player} className="flex justify-between gap-2"><span>{player}</span><span>{val}</span></div>
                                          ));
                                        })()}
                                      </div>
                                    </div>
                                    <div className="lg:col-span-2 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Participantes</p>
                                      <div className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>{record.participants.join(" · ")}</div>
                                    </div>
                                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: "160px" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Victorias</p>
                                      <div className="text-sm space-y-2 max-h-52 overflow-y-auto" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                        {Object.entries(record.playerStats || {}).map(([player, stats]) => (
                                          <div key={player} className="flex justify-between gap-2"><span>{player}</span><span>{(stats as any).w ?? 0}</span></div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>MVP</p>
                                      <p className="text-sm font-semibold" style={{ color: "#fcd34d", fontFamily: "'Barlow Condensed', sans-serif" }}>{record.mvp ?? "N/A"}</p>
                                    </div>
                                    <div className="lg:col-span-2 rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Participantes</p>
                                      <div className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>{record.participants.join(" · ")}</div>
                                    </div>
                                    <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", minHeight: "160px" }}>
                                      <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{record.gameId === "azure" ? "Goles" : "Kills"}</p>
                                      <div className="text-sm space-y-2 max-h-52 overflow-y-auto" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                        {record.participants
                                          .map((player) => [player, record.kills[player] ?? 0] as [string, number])
                                          .sort((a, b) => b[1] - a[1])
                                          .map(([player, kills]) => (
                                            <div key={player} className="flex justify-between gap-2">
                                              <span>{player}</span>
                                              <span>{kills}</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>

                              {isAdmin && editingRecordId === recordId && (
                                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.2)" }}>
                                  <p className="text-[10px] uppercase mb-3" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Editar resultados</p>
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                      Campeón
                                      <input
                                        value={editChampion}
                                        onChange={(e) => setEditChampion(e.target.value)}
                                        className="w-full mt-2 rounded-2xl px-4 py-3 text-sm"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace" }}
                                      />
                                    </label>
                                    <label className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                      Subcampeón
                                      <input
                                        value={editRunnerUp}
                                        onChange={(e) => setEditRunnerUp(e.target.value)}
                                        className="w-full mt-2 rounded-2xl px-4 py-3 text-sm"
                                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace" }}
                                      />
                                    </label>
                                  </div>
                                  {editError && <p className="text-xs mt-2" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>{editError}</p>}
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button onClick={() => saveRecordEdits(recordId, record)} className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(99,102,241,0.15)", color: "#c7d2fe", border: "1px solid rgba(99,102,241,0.2)", fontFamily: "JetBrains Mono,monospace" }}>
                                      Guardar cambios
                                    </button>
                                    <button onClick={() => setEditingRecordId(null)} className="rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", border: "1px solid rgba(255,255,255,0.1)", fontFamily: "JetBrains Mono,monospace" }}>
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}

                              {record.teamScores && (
                                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Marcadores</p>
                                  <div className="grid grid-cols-1 gap-2 text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                    {Object.entries(record.teamScores).map(([match, score]) => (
                                      <div key={match} className="flex justify-between gap-2">
                                        <span>{match}</span>
                                        <span>{score.home} - {score.away}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {record.finalMatch && record.finalMatch.series.some((game) => game.home !== null && game.away !== null) && (
                                <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  <p className="text-[10px] uppercase mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Marcador de la final</p>
                                  <div className="text-sm" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                                    <div className="flex items-center justify-between mb-3">
                                      <span>{record.finalMatch.home ?? "A"}</span>
                                      <span className="font-semibold">{
                                        (() => {
                                          const series = record.finalMatch?.series || [];
                                          const totals = series.reduce((acc: number[], g: any) => {
                                            if (g.home == null || g.away == null) return acc;
                                            acc[0] = (acc[0] || 0) + g.home;
                                            acc[1] = (acc[1] || 0) + g.away;
                                            return acc;
                                          }, [0, 0]);
                                          const hasPlayed = totals[0] > 0 || totals[1] > 0;
                                          return hasPlayed ? `${totals[0]} - ${totals[1]}` : "Serie final";
                                        })()
                                      }</span>
                                      <span>{record.finalMatch.away ?? "B"}</span>
                                    </div>
                                    <div className="grid gap-2">
                                      {record.finalMatch.series.map((game, index) => {
                                        if (game.home === null || game.away === null) return null;
                                        return (
                                          <div key={index} className="flex justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                            <span className="text-[11px]" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>Juego {index + 1}</span>
                                            <span>{game.home} - {game.away}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GlobalTable({ players, history }: { players: Player[]; history: TournamentRecord[] }) {
  const scores = buildGlobalStats(players, history).sort((a, b) => b.winRate - a.winRate || b.w - a.w || b.titles - a.titles);

  return (
    <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.35)", background: "linear-gradient(160deg, #0f0f1a 0%, #09090f 100%)", boxShadow: "0 0 80px rgba(124,58,237,0.18)" }}>
      <div className="px-6 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(124,58,237,0.2)", background: "rgba(124,58,237,0.04)" }}>
        <span className="text-3xl">🏆</span>
        <div>
          <h2 className="text-2xl font-extrabold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#a78bfa", textShadow: "0 0 24px rgba(124,58,237,0.5)" }}>RANKING GLOBAL</h2>
          <p className="text-xs mt-1" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>Acumulado en {history.length} torneos guardados</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["#", "JUGADOR", "W", "L", "PARTIDAS", "WIN%", "TÍTULOS", "MVPs", "PARTIC.", ""].map((h, i) => (
                <th key={i} className={`py-3 text-[10px] font-medium ${i === 0 ? "pl-6 pr-2 text-left w-10" : i === 1 ? "px-2 text-left" : i === 8 ? "px-6 text-right" : "px-4 text-center"}`}
                  style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => {
              const isTop = i === 0;
              return (
                <tr key={s.player} className="transition-colors"
                  style={{ background: isTop ? "rgba(124,58,237,0.07)" : "transparent", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.1)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isTop ? "rgba(124,58,237,0.07)" : "transparent"; }}
                >
                  <td className="py-3.5 pl-6 pr-2 text-sm font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: i < 3 ? "#a78bfa" : "#6b6b88" }}>{medal(i + 1)}</td>
                  <td className="py-3.5 px-2">
                      <div className="flex items-center gap-2.5">
                        <div>
                          {(() => {
                            const pObj = players.find((p) => p.name === s.player);
                            return (
                              <Avatar className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: isTop ? "rgba(124,58,237,0.22)" : "rgba(255,255,255,0.05)", border: isTop ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)", color: isTop ? "#a78bfa" : "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px" }}>
                                {pObj?.avatar ? <AvatarImage src={pObj.avatar} alt={s.player} /> : <AvatarFallback className="text-xs font-bold">{s.player.slice(0, 2).toUpperCase()}</AvatarFallback>}
                              </Avatar>
                            );
                          })()}
                        </div>
                        <span className="font-semibold text-sm" style={{ fontFamily: "'Barlow', sans-serif", color: isTop ? "#f0f0f8" : "#c8c8d8" }}>{s.player}</span>
                      </div>
                    </td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{s.w}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{s.l}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#c8c8d8" }}>{s.played}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: s.winRate >= 60 ? "#a78bfa" : s.winRate >= 45 ? "#e8e8f0" : "#6b6b88" }}>{s.winRate}%</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#fcd34d" }}>{s.titles}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a78bfa" }}>{s.mvps}</td>
                  <td className="py-3.5 px-4 text-center text-sm font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>{s.participations}</td>
                  <td className="py-3.5 px-6">
                    <div style={{ width: "60px", height: "5px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${s.winRate}%`, background: "linear-gradient(90deg, #7c3aed80, #a78bfa)", borderRadius: "99px" }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}



function TablasView({ players, history, onBack }: { players: Player[]; history: TournamentRecord[]; onBack: () => void }) {
  const [sortKey, setSortKey] = useState("rank");
  const [filter, setFilter] = useState<string | null>(null);
  const visible = filter ? TOURNAMENTS.filter((t) => t.id === filter) : TOURNAMENTS;

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <BackButton onClick={onBack} />
        <SectionTitle sub={`${players.length} jugadores · ${history.length} torneos guardados`}>TABLAS DE POSICIONES</SectionTitle>

        <nav className="flex flex-wrap gap-2">
          <button onClick={() => setFilter(null)} className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "14px", background: !filter ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)", color: !filter ? "#a78bfa" : "#6b6b88", border: !filter ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.07)" }}>
            TODOS
          </button>
          {TOURNAMENTS.map((t) => (
            <button key={t.id} onClick={() => setFilter(filter === t.id ? null : t.id)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: "14px", background: filter === t.id ? `${t.color}20` : "rgba(255,255,255,0.04)", color: filter === t.id ? t.textColor : "#6b6b88", border: filter === t.id ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.07)" }}>
              {t.icon} {t.name.toUpperCase()}
            </button>
          ))}
        </nav>

        {!filter && <GlobalTable players={players} history={history} />}
        {visible.map((t) => <TournamentTable key={t.id} t={t} players={players} history={history} sortKey={sortKey} setSortKey={setSortKey} />)}
      </div>
    </div>
  );
}

// ─── Jugadores View ───────────────────────────────────────────────────────────

function JugadoresView({ players, history, onPlayers, onDeletePlayer, onBack }: { players: Player[]; history: TournamentRecord[]; onPlayers: (players: Player[]) => void; onDeletePlayer: (name: string) => void; onBack: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const profileData = (player: string) => {
    const games = TOURNAMENTS.map((t) => {
      const historyStats = buildGameStats(t.id, players, history).find((x) => x.player === player);
      const fallback = t.stats.find((x) => x.player === player);
      const hasHistoryStats = historyStats && (historyStats.played > 0 || historyStats.participations > 0);
      const stat = hasHistoryStats
        ? historyStats
        : fallback
          ? {
              player: fallback.player,
              w: fallback.w,
              l: fallback.l,
              played: fallback.w + fallback.l,
              kills: 0,
              titles: fallback.tournamentsWon ?? 0,
              mvps: fallback.mvp ?? 0,
              participations: fallback.w + fallback.l > 0 ? 1 : 0,
              winRate: wr(fallback.w, fallback.l),
            }
          : null;

      if (!stat) return null;

      return {
        ...stat,
        mvp: stat.mvps ?? 0,
        tournamentsWon: stat.titles ?? 0,
        t,
      };
    }).filter(Boolean) as Array<ReturnType<typeof buildGameStats>[number] & { t: TournamentDef; mvp: number; tournamentsWon: number }>;

    const totalW = games.reduce((a, g) => a + g.w, 0);
    const totalL = games.reduce((a, g) => a + g.l, 0);
    const totalMVP = games.reduce((a, g) => a + g.mvp, 0);
    const totalTitles = games.reduce((a, g) => a + g.tournamentsWon, 0);
    const rate = wr(totalW, totalL);
    const bestGame = games.length ? games.reduce((best, g) => (g.winRate ?? wr(g.w, g.l)) > (best.winRate ?? wr(best.w, best.l)) ? g : best) : null;
    return { games, totalW, totalL, totalMVP, totalTitles, rate, bestGame };
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (saved) setIsAdmin(true);
  }, []);

  const tryPin = () => {
    const adminName = ADMIN_PINS[pin];
    if (adminName) {
      setIsAdmin(true);
      if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_SESSION_KEY, adminName);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  const addPlayer = async () => {
    const name = newName.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNameError("Ese jugador ya existe.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/players`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (!res.ok) throw new Error('api');
      const created = await res.json();
      onPlayers([...players, created]);
      setNewName("");
      setNameError("");
    } catch (err) {
      console.error(err);
      setNameError('No se pudo agregar en el servidor.');
    }
  };

  const uploadAvatar = async (name: string, avatar: string) => {
    const currentPlayer = players.find((p) => p.name === name);
    if (!currentPlayer) return;
    if (currentPlayer.id) {
      try {
        const res = await fetch(`${API_BASE}/api/players/${currentPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentPlayer.name, avatar }),
        });
        if (!res.ok) throw new Error('api');
        const updated = await res.json();
        onPlayers(players.map((p) => p.name === name ? { ...p, id: updated.id, avatar: updated.avatar ?? avatar } : p));
        return;
      } catch (err) {
        console.error(err);
      }
    }
    onPlayers(players.map((p) => p.name === name ? { ...p, avatar } : p));
  };

  const removePlayer = (name: string) => {
    onDeletePlayer(name);
    setConfirmDelete(null);
    if (selected === name) setSelected(null);
  };

  const updatePlayer = async (name: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      setNameError("El nombre no puede estar vacío.");
      return;
    }
    if (players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase() && p.name !== name)) {
      setNameError("Ya existe otro jugador con ese nombre.");
      return;
    }
    const currentPlayer = players.find((p) => p.name === name);
    const updatedPlayers = players.map((p) => p.name === name ? { ...p, name: trimmed } : p);
    try {
      if (currentPlayer?.id) {
        const res = await fetch(`${API_BASE}/api/players/${currentPlayer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, avatar: currentPlayer.avatar }),
        });
        if (!res.ok) throw new Error('api');
        const updated = await res.json();
        onPlayers(updatedPlayers.map((p) => p.name === trimmed ? { ...p, id: updated.id, avatar: updated.avatar ?? p.avatar } : p));
      } else {
        onPlayers(updatedPlayers);
      }
    } catch (err) {
      console.error(err);
      onPlayers(updatedPlayers);
    }
    if (selected === name) setSelected(trimmed);
    setEditing(null);
    setEditValue("");
    setNameError("");
  };

  const openAvatarPicker = (name: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string | null;
          if (dataUrl) {
            await uploadAvatar(name, dataUrl);
          }
        };
        reader.readAsDataURL(f);
      }
    };
    input.click();
  };

  if (selected) {
    const d = profileData(selected);
    return (
      <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mb-8 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#a0a0b8" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            JUGADORES
          </button>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.3)", background: "linear-gradient(160deg, #0f0f1a, #09090f)", boxShadow: "0 0 60px rgba(124,58,237,0.15)" }}>
            <div className="px-8 py-8 flex items-center gap-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold flex-shrink-0">
                {(() => {
                  const pObj = players.find((p) => p.name === selected);
                  return pObj?.avatar ? (
                    <Avatar className="w-20 h-20 rounded-2xl">
                      <AvatarImage src={pObj.avatar} alt={pObj.name} />
                    </Avatar>
                  ) : (
                    <div style={{ background: "rgba(124,58,237,0.2)", border: "2px solid rgba(124,58,237,0.4)", color: "#a78bfa", fontFamily: "'Barlow Condensed', sans-serif" }} className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold flex-shrink-0">
                      {selected.slice(0, 2).toUpperCase()}
                    </div>
                  );
                })()}
              </div>
              <div>
                <h2 className="text-4xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "#e8e8f0" }}>{selected.toUpperCase()}</h2>
                {d.bestGame && <p className="text-sm mt-1" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Mejor juego: {d.bestGame.t.name} ({wr(d.bestGame.w, d.bestGame.l)}% WR)</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: "rgba(255,255,255,0.05)" }}>
              {[
                { label: "WIN RATE", value: `${d.rate}%`, color: d.rate >= 55 ? "#a78bfa" : d.rate >= 45 ? "#e8e8f0" : "#f87171" },
                { label: "W / L", value: `${d.totalW} / ${d.totalL}`, color: "#e8e8f0" },
                { label: "MVPs", value: d.totalMVP, color: "#fcd34d" },
                { label: "TÍTULOS", value: d.totalTitles, color: "#fcd34d" },
              ].map(({ label, value, color }) => (
                <div key={label} className="px-6 py-5" style={{ background: "#0f0f1a" }}>
                  <p className="text-[10px] mb-1" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{label}</p>
                  <p className="text-2xl font-extrabold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="px-8 py-6 flex flex-col gap-4">
              <p className="text-xs font-semibold tracking-widest" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>POR JUEGO</p>
              {d.games.map((g) => {
                const rate = wr(g.w, g.l);
                return (
                  <div key={g.t.id} className="flex items-center gap-4 py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${g.t.border}` }}>
                    <span className="text-xl">{g.t.icon}</span>
                    <span className="font-semibold text-sm w-28 flex-shrink-0" style={{ color: g.t.color, fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px" }}>{g.t.name.toUpperCase()}</span>
                    <div className="flex items-center gap-3 flex-1 flex-wrap text-xs" style={{ fontFamily: "JetBrains Mono,monospace" }}>
                      <span style={{ color: "#a3e635" }}>W {g.w}</span>
                      <span style={{ color: "#f87171" }}>L {g.l}</span>
                      <span style={{ color: rate >= 55 ? g.t.color : "#6b6b88" }}>{rate}%</span>
                      {g.mvp > 0 && <span style={{ color: "#fcd34d" }}>⭐ {g.mvp} MVP</span>}
                      {g.tournamentsWon > 0 && <span style={{ color: "#fcd34d" }}>🏆 ×{g.tournamentsWon}</span>}
                    </div>
                    <div style={{ width: "64px", height: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0 }}>
                      <div style={{ height: "100%", width: `${rate}%`, background: `linear-gradient(90deg, ${g.t.color}60, ${g.t.color})`, borderRadius: "99px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="max-w-5xl mx-auto">
        <BackButton onClick={onBack} />
        <SectionTitle sub={`${players.length} participantes registrados`}>JUGADORES</SectionTitle>

        <div className="rounded-2xl p-6 mb-8" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 0 30px rgba(255,255,255,0.05)" }}>
          {isAdmin ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1 min-w-0">
                  <p className="text-xs tracking-widest font-semibold" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>AGREGAR JUGADOR</p>
                  <input
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                    placeholder="Nombre del jugador..."
                    className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}
                  />
                  {nameError && <p className="text-xs mt-2" style={{ color: "#f87171", fontFamily: "JetBrains Mono,monospace" }}>{nameError}</p>}
                </div>
                <Ripple onClick={addPlayer} color="rgba(255,255,255,0.15)"
                  className="px-5 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(163,230,53,0.2)", border: "1px solid rgba(163,230,53,0.35)", color: "#bef264", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>
                  + AGREGAR
                </Ripple>
                <Ripple onClick={() => setIsAdmin(false)} color="rgba(255,255,255,0.12)"
                  className="px-5 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", color: "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>
                  SALIR ADMIN
                </Ripple>
              </div>
              <p className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Solo el administrador puede agregar, editar o eliminar jugadores desde esta vista.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-center">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>Gestión de jugadores</p>
                <p className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Inicia sesión como administrador para modificar datos, agregar y eliminar jugadores.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && tryPin()}
                  placeholder="PIN"
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ background: pinError ? "rgba(255,77,109,0.1)" : "rgba(255,255,255,0.04)", border: pinError ? "1px solid rgba(255,77,109,0.5)" : "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace", width: "120px" }}
                />
                <Ripple onClick={tryPin} color="rgba(255,255,255,0.15)"
                  className="px-5 py-3 rounded-xl font-bold text-sm"
                  style={{ background: "rgba(255,77,109,0.2)", border: "1px solid rgba(255,77,109,0.35)", color: "#ff8fa3", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.05em" }}>
                  ADMIN
                </Ripple>
              </div>
              {pinError && <p className="text-xs text-right" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>PIN incorrecto.</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => {
            const d = profileData(player.name);
            return (
              <div key={player.name} className="rounded-2xl p-5 flex flex-col gap-4 transition-transform hover:-translate-y-0.5"
                style={{ background: "linear-gradient(145deg, #0f0f1a, #09090f)", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 0 30px rgba(124,58,237,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      {player.avatar ? (
                        <Avatar className="w-12 h-12 rounded-xl flex-shrink-0">
                          <AvatarImage src={player.avatar} alt={player.name} />
                        </Avatar>
                      ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold flex-shrink-0"
                          style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)", color: "#a78bfa", fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: "#e8e8f0" }}>{player.name}</p>
                      <p className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{d.totalW + d.totalL} partidas jugadas</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Ripple onClick={() => setSelected(player.name)} color="rgba(255,255,255,0.12)"
                      className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                      VER
                    </Ripple>
                    {isAdmin && (
                      <Ripple onClick={() => { setEditing(player.name); setEditValue(player.name); }} color="rgba(163,230,53,0.15)"
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(163,230,53,0.12)", border: "1px solid rgba(163,230,53,0.25)", color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>
                        EDITAR
                      </Ripple>
                    )}
                  </div>
                </div>

                {editing === player.name && (
                  <div className="flex flex-col gap-3">
                    <input
                      value={editValue}
                      onChange={(e) => { setEditValue(e.target.value); setNameError(""); }}
                      placeholder="Nuevo nombre"
                      className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Ripple onClick={() => updatePlayer(player.name, editValue)} color="rgba(163,230,53,0.15)"
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(163,230,53,0.15)", border: "1px solid rgba(163,230,53,0.25)", color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>
                        GUARDAR
                      </Ripple>
                      <Ripple onClick={() => { setEditing(null); setEditValue(""); setNameError(""); }} color="rgba(255,255,255,0.08)"
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                        CANCELAR
                      </Ripple>
                    </div>
                    {nameError && <p className="text-xs" style={{ color: "#f87171", fontFamily: "JetBrains Mono,monospace" }}>{nameError}</p>}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "WR", value: `${d.rate}%`, color: d.rate >= 55 ? "#a78bfa" : "#e8e8f0" },
                    { label: "MVPs", value: d.totalMVP, color: "#fcd34d" },
                    { label: "🏆", value: d.totalTitles, color: "#fcd34d" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[10px]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{label}</p>
                      <p className="text-base font-bold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {TOURNAMENTS.map((t) => {
                    const s = t.stats.find((x) => x.player === player.name);
                    if (!s) return null;
                    const r = wr(s.w, s.l);
                    return (
                      <span key={t.id} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${t.color}15`, color: t.textColor, border: `1px solid ${t.border}`, fontFamily: "JetBrains Mono,monospace" }}>
                        {t.icon} {r}%
                      </span>
                    );
                  })}
                </div>

                {isAdmin && (
                  <div className="flex flex-wrap gap-2">
                    <Ripple onClick={() => openAvatarPicker(player.name)} color="rgba(255,255,255,0.12)"
                      className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                      SUBIR FOTO
                    </Ripple>
                    <Ripple onClick={() => setConfirmDelete(player.name)} color="rgba(255,77,109,0.15)"
                      className="px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: "rgba(255,77,109,0.12)", border: "1px solid rgba(255,77,109,0.25)", color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>
                      ELIMINAR
                    </Ripple>
                  </div>
                )}

                {confirmDelete === player.name && (
                  <div className="flex flex-col gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,77,109,0.06)", border: "1px solid rgba(255,77,109,0.18)" }}>
                    <p className="text-xs" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>¿Eliminar jugador? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-2 flex-wrap">
                      <Ripple onClick={() => removePlayer(player.name)} color="rgba(255,77,109,0.2)"
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(255,77,109,0.15)", border: "1px solid rgba(255,77,109,0.35)", color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>
                        CONFIRMAR
                      </Ripple>
                      <Ripple onClick={() => setConfirmDelete(null)} color="rgba(255,255,255,0.08)"
                        className="px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                        CANCELAR
                      </Ripple>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Reglas View ──────────────────────────────────────────────────────────────

function ReglasView({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<string | null>(TOURNAMENTS[0].id);

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <BackButton onClick={onBack} />
        <SectionTitle sub="Reglamentos y formatos de cada torneo">REGLAS</SectionTitle>

        {TOURNAMENTS.map((t) => (
          <div key={t.id} className="rounded-2xl overflow-hidden" style={{ border: open === t.id ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(160deg, #0f0f1a, #09090f)", boxShadow: open === t.id ? `0 0 40px ${t.glow}` : "none", transition: "box-shadow 0.3s" }}>
            <Ripple color={`${t.color}18`} onClick={() => setOpen(open === t.id ? null : t.id)}
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: open === t.id ? `1px solid ${t.border}` : "none", background: open === t.id ? t.bgStripe : "transparent" }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <h3 className="text-lg font-extrabold leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: t.color }}>{t.name.toUpperCase()}</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{t.tag} · {t.rules.format}</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: open === t.id ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </Ripple>

            {open === t.id && (
              <div className="px-6 py-6 flex flex-col gap-5">
                {[
                  { label: "FORMATO", value: t.rules.format },
                  { label: "FORMATO DE PARTIDA", value: t.rules.matchFormat },
                  { label: "SISTEMA DE PUNTOS", value: t.rules.scoring },
                  { label: "CLASIFICACIÓN Y ELIMINACIÓN", value: t.rules.advancement },
                  { label: "DESEMPATES", value: t.rules.extra },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] tracking-widest mb-1.5" style={{ color: t.textColor, fontFamily: "JetBrains Mono,monospace" }}>{label}</p>
                    <p className="text-sm leading-relaxed" style={{ color: "#c8c8d8" }}>{value}</p>
                  </div>
                ))}

                {t.rules.sections?.map((section) => (
                  <div key={section.title} className="mt-4">
                    <p className="text-[10px] tracking-widest mb-1.5" style={{ color: t.textColor, fontFamily: "JetBrains Mono,monospace" }}>{section.title.toUpperCase()}</p>
                    <ul className="list-disc ml-4 text-sm" style={{ color: "#c8c8d8", lineHeight: "1.75" }}>
                      {section.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="mt-2 rounded-xl p-4" style={{ background: `${t.color}0a`, border: `1px solid ${t.border}` }}>
                  <p className="text-[10px] tracking-widest mb-2" style={{ color: t.textColor, fontFamily: "JetBrains Mono,monospace" }}>CUADRO GENERAL</p>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>
                    <span className="px-2 py-1 rounded" style={{ background: `${t.color}20`, color: t.textColor }}>LIGUILLA</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="px-2 py-1 rounded" style={{ background: `${t.color}20`, color: t.textColor }}>TOP 4</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span className="px-2 py-1 rounded" style={{ background: `${t.color}20`, color: t.textColor }}>SEMIS + FINAL</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────

const ADMIN_PINS: Record<string, string> = {
  "1325": "Rikardo",
  "2102": "Juan",
};

function AdminView({ players, onPlayers, onDeletePlayer, onBack }: { players: Player[]; onPlayers: (p: Player[]) => void; onDeletePlayer: (name: string) => void; onBack: () => void }) {
  const [pin, setPin] = useState("");
  const [auth, setAuth] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (saved) setAuth(true);
  }, []);

  const tryPin = () => {
    const adminName = ADMIN_PINS[pin];
    if (adminName) {
      setAuth(true);
      if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_SESSION_KEY, adminName);
      setPinError(false);
    } else { setPinError(true); setPin(""); }
  };

  const addPlayer = async () => {
    const name = newName.trim();
    if (!name) return;
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setNameError("Ese jugador ya existe.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('api');
      const created = await res.json();
      onPlayers([...players, created]);
      setNewName("");
      setNameError("");
    } catch (err) {
      console.error(err);
      setNameError('No se pudo agregar en el servidor.');
    }
  };

  const removePlayer = (name: string) => {
    onDeletePlayer(name);
    setConfirmDelete(null);
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-background flex flex-col px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-md mx-auto w-full">
          <BackButton onClick={onBack} />
          <SectionTitle sub="Área restringida — ingresa el PIN de administrador">ADMIN</SectionTitle>
          <div className="rounded-2xl p-8 flex flex-col gap-6" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(255,77,109,0.3)", boxShadow: "0 0 60px rgba(255,77,109,0.1)" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto" style={{ background: "rgba(255,77,109,0.15)", border: "1px solid rgba(255,77,109,0.3)" }}>🔐</div>
            <div className="flex flex-col gap-3">
              <input
                type="password" maxLength={6} value={pin}
                onChange={(e) => { setPin(e.target.value); setPinError(false); }}
                onKeyDown={(e) => e.key === "Enter" && tryPin()}
                placeholder="PIN"
                className="w-full text-center text-2xl tracking-[0.5em] font-bold px-4 py-4 rounded-xl outline-none transition-all"
                style={{ background: pinError ? "rgba(255,77,109,0.1)" : "rgba(255,255,255,0.04)", border: pinError ? "1px solid rgba(255,77,109,0.5)" : "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace", caretColor: "#ff4d6d" }}
              />
              {pinError && <p className="text-center text-sm" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>PIN incorrecto. Inténtalo de nuevo.</p>}
            </div>
            <Ripple onClick={tryPin} color="rgba(255,255,255,0.15)"
              className="w-full py-3.5 rounded-xl text-center font-bold text-sm"
              style={{ background: "rgba(255,77,109,0.2)", border: "1px solid rgba(255,77,109,0.4)", color: "#ff8fa3", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "16px", letterSpacing: "0.08em" }}>
              INGRESAR
            </Ripple>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <BackButton onClick={onBack} />
        <SectionTitle sub="Panel de administración — gestión de jugadores">ADMIN</SectionTitle>

        {/* Add player */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(163,230,53,0.3)", boxShadow: "0 0 40px rgba(163,230,53,0.08)" }}>
          <p className="text-xs tracking-widest font-semibold" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>AGREGAR JUGADOR</p>
          <div className="flex gap-3">
            <input value={newName} onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
              onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              placeholder="Nombre del jugador..."
              className="flex-1 px-4 py-3 rounded-xl outline-none text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}
            />
            <Ripple onClick={addPlayer} color="rgba(255,255,255,0.15)"
              className="px-5 py-3 rounded-xl font-bold text-sm flex-shrink-0"
              style={{ background: "rgba(163,230,53,0.2)", border: "1px solid rgba(163,230,53,0.35)", color: "#bef264", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px", letterSpacing: "0.05em" }}>
              + AGREGAR
            </Ripple>
          </div>
          {nameError && <p className="text-xs" style={{ color: "#f87171", fontFamily: "JetBrains Mono,monospace" }}>{nameError}</p>}
        </div>

        {/* Player list */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "linear-gradient(160deg, #0f0f1a, #09090f)" }}>
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs tracking-widest font-semibold" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>JUGADORES REGISTRADOS ({players.length})</p>
          </div>
          {players.map((player, i) => (
            <div key={player.name} className="flex items-center justify-between px-6 py-4 transition-colors"
              style={{ borderBottom: i < players.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: confirmDelete === player.name ? "rgba(255,77,109,0.06)" : "transparent" }}>
              <div className="flex items-center gap-3">
                <div>
                  {player.avatar ? (
                    <Avatar className="w-8 h-8 rounded-lg">
                      <AvatarImage src={player.avatar} alt={player.name} />
                    </Avatar>
                  ) : (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px" }}>
                      {player.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="font-medium text-sm" style={{ color: "#c8c8d8" }}>{player.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {confirmDelete === player.name ? (
                  <>
                    <Ripple onClick={() => removePlayer(player.name)} color="rgba(255,77,109,0.2)"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,77,109,0.15)", border: "1px solid rgba(255,77,109,0.4)", color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>
                      CONFIRMAR
                    </Ripple>
                    <Ripple onClick={() => setConfirmDelete(null)} color="rgba(255,255,255,0.1)"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                      CANCELAR
                    </Ripple>
                  </>
                ) : (
                  <>
                    <Ripple onClick={() => setConfirmDelete(player.name)} color="rgba(255,77,109,0.15)"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                    ELIMINAR
                  </Ripple>
                  
                    <Ripple onClick={() => {
                      const name = player.name;
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = () => {
                        const f = input.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const dataUrl = reader.result as string | null;
                            if (dataUrl) {
                              await uploadAvatar(name, dataUrl);
                            }
                          };
                          reader.readAsDataURL(f);
                        }
                      };
                      input.click();
                    }} color="rgba(255,255,255,0.12)"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                      SUBIR FOTO
                    </Ripple>

                    {player.avatar && (
                      <Ripple onClick={() => onPlayers(players.map((p) => p.name === player.name ? { ...p, avatar: undefined } : p))} color="rgba(255,255,255,0.08)"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                        ELIMINAR FOTO
                      </Ripple>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs" style={{ color: "#3a3a50", fontFamily: "JetBrains Mono,monospace" }}>PINs: Rikardo 1325 · Juan 2102 · Cámbialos en el código si es necesario</p>
      </div>
    </div>
  );
}

// ─── Torneo (Crear) View ──────────────────────────────────────────────────────

type TorneoPhase = "setup" | "liguilla" | "bracket";

interface BracketSlot { player: string | null; winner?: boolean }
interface BracketState {
  sf1: [BracketSlot, BracketSlot];
  sf2: [BracketSlot, BracketSlot];
  final: [BracketSlot, BracketSlot];
  third: [BracketSlot, BracketSlot];
  finalSeries: { home: number | null; away: number | null }[];
  champion: string | null;
}

function MatchCard({ home, away, onWin, color }: { home: string | null; away: string | null; onWin?: (winner: string) => void; color: string }) {
  const pending = !home || !away;
  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: `1px solid ${color}30`, background: "#0f0f1a", minWidth: "160px" }}>
      {[home, away].map((p, i) => (
        <div key={i}>
          {i === 1 && <div style={{ height: "1px", background: "rgba(255,255,255,0.06)" }} />}
          <Ripple
            onClick={() => !pending && p && onWin?.(p)}
            color={`${color}20`}
            className="px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: p ? "#c8c8d8" : "#3a3a50", fontFamily: "'Barlow', sans-serif", cursor: pending || !onWin ? "default" : "pointer", background: "transparent" }}
          >
            <span style={{ color, fontFamily: "JetBrains Mono,monospace", fontSize: "10px", minWidth: "14px" }}>{i === 0 ? "A" : "B"}</span>
            {p ?? "POR DEFINIR"}
          </Ripple>
        </div>
      ))}
    </div>
  );
}

function BracketView({ bracket, setBracket, standings, color, glow, border, isRivals, isAzure, isVolley, isClashRoyale }: {
  bracket: BracketState;
  setBracket: React.Dispatch<React.SetStateAction<BracketState>>;
  standings: { player: string; pts?: number; w: number; l: number; played: number; crownDiff?: number; crownsFor?: number; crownsAgainst?: number }[];
  color: string; glow: string; border: string;
  isRivals: boolean;
  isAzure: boolean;
  isVolley: boolean;
  isClashRoyale: boolean;
}) {
  const handleWin = (matchKey: keyof BracketState, winner: string) => {
    setBracket((prev) => {
      const next = { ...prev };
      const match = prev[matchKey] as [BracketSlot, BracketSlot];
      const loser = match.find((s) => s.player !== winner)?.player ?? null;

      if (matchKey === "sf1") {
        (next.sf1 as [BracketSlot, BracketSlot]) = [{ player: match[0].player, winner: match[0].player === winner }, { player: match[1].player, winner: match[1].player === winner }];
        next.final = [{ player: winner }, next.final[1]];
        next.third = [{ player: loser }, next.third[1]];
      } else if (matchKey === "sf2") {
        (next.sf2 as [BracketSlot, BracketSlot]) = [{ player: match[0].player, winner: match[0].player === winner }, { player: match[1].player, winner: match[1].player === winner }];
        next.final = [next.final[0], { player: winner }];
        next.third = [next.third[0], { player: loser }];
      } else if (matchKey === "final") {
        (next.final as [BracketSlot, BracketSlot]) = [{ player: match[0].player, winner: match[0].player === winner }, { player: match[1].player, winner: match[1].player === winner }];
        next.champion = winner;
      } else if (matchKey === "third") {
        (next.third as [BracketSlot, BracketSlot]) = [{ player: match[0].player, winner: match[0].player === winner }, { player: match[1].player, winner: match[1].player === winner }];
      }
      return next;
    });
  };

  const updateFinalSeriesScore = (index: number, side: "home" | "away", value: number | null) => {
    setBracket((prev) => {
      const next = { ...prev, finalSeries: prev.finalSeries.map((game, i) => i === index ? { ...game, [side]: value } : game) };
      const homePlayer = prev.final[0].player;
      const awayPlayer = prev.final[1].player;
      if (!homePlayer || !awayPlayer) return next;
      const countValidWins = (isHome: boolean) =>
        next.finalSeries.filter((game) => {
          if (game.home === null || game.away === null) return false;
          if (isRivals) return isValidRivalsScore(game) && (isHome ? game.home > game.away : game.away > game.home);
          if (isVolley) return isValidVolleyScore(game) && (isHome ? game.home > game.away : game.away > game.home);
          if (isClashRoyale) return isValidClashRoyaleScore(game) && (isHome ? game.home > game.away : game.away > game.home);
          return false;
        }).length;
      const homeWins = countValidWins(true);
      const awayWins = countValidWins(false);
      if (isRivals || isVolley) {
        next.champion = homeWins >= 3 ? homePlayer : awayWins >= 3 ? awayPlayer : null;
      } else if (isClashRoyale) {
        next.champion = homeWins > awayWins ? homePlayer : awayWins > homeWins ? awayPlayer : null;
      } else if (isAzure) {
        const homeGoals = next.finalSeries.reduce((sum, game) => sum + (game.home ?? 0), 0);
        const awayGoals = next.finalSeries.reduce((sum, game) => sum + (game.away ?? 0), 0);
        next.champion = homeGoals > awayGoals ? homePlayer : awayGoals > homeGoals ? awayPlayer : null;
      }
      return next;
    });
  };

  const setFinalGameWinner = (index: number, player: string) => {
    setBracket((prev) => {
      if (!prev.final[0].player || !prev.final[1].player) return prev;
      const next = { ...prev, finalSeries: [...prev.finalSeries] };
      next.finalSeries[index] = prev.finalSeries[index] === player ? null : player;
      const homePlayer = prev.final[0].player;
      const awayPlayer = prev.final[1].player;
      const homeWins = next.finalSeries.filter((w) => w === homePlayer).length;
      const awayWins = next.finalSeries.filter((w) => w === awayPlayer).length;
      if (homeWins >= 3) next.champion = homePlayer;
      else if (awayWins >= 3) next.champion = awayPlayer;
      else next.champion = null;
      return next;
    });
  };

  const hasSF1Winner = bracket.final[0].player !== null;
  const hasSF2Winner = bracket.final[1].player !== null;
  const finalEnabled = isRivals || isAzure || isVolley || (hasSF1Winner && hasSF2Winner);
  const seeds = isRivals || isAzure || isVolley ? standings.slice(0, 2) : standings.slice(0, 4);
  const homePlayer = bracket.final[0].player;
  const awayPlayer = bracket.final[1].player;
  const clashFinalScore = isClashRoyale ? bracket.finalSeries[0] : undefined;
  const clashHomeScore = isClashRoyale ? clashFinalScore?.home ?? 0 : 0;
  const clashAwayScore = isClashRoyale ? clashFinalScore?.away ?? 0 : 0;
  const homeWins = isAzure
    ? bracket.finalSeries.reduce((sum, game) => sum + (game.home ?? 0), 0)
    : bracket.finalSeries.filter((game) => {
      if (game.home === null || game.away === null) return false;
      if (isRivals) return isValidRivalsScore(game) && game.home > game.away;
      if (isVolley) return isValidVolleyScore(game) && game.home > game.away;
      if (isClashRoyale) return isValidClashRoyaleScore(game) && game.home > game.away;
      return game.home > game.away;
    }).length;
  const awayWins = isAzure
    ? bracket.finalSeries.reduce((sum, game) => sum + (game.away ?? 0), 0)
    : bracket.finalSeries.filter((game) => {
      if (game.home === null || game.away === null) return false;
      if (isRivals) return isValidRivalsScore(game) && game.away > game.home;
      if (isVolley) return isValidVolleyScore(game) && game.away > game.home;
      if (isClashRoyale) return isValidClashRoyaleScore(game) && game.away > game.home;
      return game.away > game.home;
    }).length;

  return (
    <div className="flex flex-col gap-8">
      {/* Seeds */}
      <div className="rounded-xl p-4 flex flex-wrap gap-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="w-full text-[10px] tracking-widest mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{isRivals || isAzure ? "FINALISTAS" : "CLASIFICACIÓN LIGUILLA"}</p>
        {seeds.map((s, i) => (
          <div key={s.player} className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: `${color}15`, border: `1px solid ${border}` }}>
            <span className="text-xs font-bold" style={{ color, fontFamily: "JetBrains Mono,monospace" }}>{i + 1}°</span>
            <span className="text-sm font-semibold" style={{ color: "#e8e8f0" }}>{s.player}</span>
            <span className="text-xs" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{isClashRoyale ? `${(s as any).crownDiff ?? 0} dif` : isRivals ? `${(s as any).rndDiff ?? 0} dif` : isVolley ? `${(s as any).pf ?? 0}pf` : `${s.pts ?? 0}pts`}</span>
          </div>
        ))}
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-12 items-center min-w-max px-2">
          {!isRivals && !isAzure && (
            <>
              {/* Semis */}
              <div className="flex flex-col gap-6">
                <p className="text-[10px] tracking-widest text-center mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>SEMIFINALES</p>
                <MatchCard home={bracket.sf1[0].player} away={bracket.sf1[1].player} color={color} onWin={(w) => handleWin("sf1", w)} />
                <MatchCard home={bracket.sf2[0].player} away={bracket.sf2[1].player} color={color} onWin={(w) => handleWin("sf2", w)} />
              </div>
            </>
          )}
          <svg width="32" height="80" viewBox="0 0 32 80" fill="none">
            <path d="M0 20 L16 20 L16 60 L0 60" stroke={`${color}40`} strokeWidth="1.5" fill="none" />
            <path d="M16 40 L32 40" stroke={`${color}40`} strokeWidth="1.5" />
          </svg>

          {/* Final */}
          <div className="flex flex-col gap-6 items-center">
            <p className="text-[10px] tracking-widest mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>FINAL</p>
            <MatchCard home={bracket.final[0].player} away={bracket.final[1].player} color={color} onWin={finalEnabled ? (w) => handleWin("final", w) : undefined} />
            {(isRivals || isAzure || isClashRoyale) && (
              <div className="text-center text-xs text-[#a0a0b8]" style={{ fontFamily: "JetBrains Mono,monospace" }}>{isAzure ? "Ida y vuelta" : isClashRoyale ? "Marcador directo" : "Mejor de 5"}</div>
            )}
            {(isRivals || isAzure || isClashRoyale) && (
              <div className="w-full max-w-sm rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between mb-3 text-[11px] font-semibold" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>
                  <span>{homePlayer ? `${homePlayer} (${isClashRoyale ? clashHomeScore : homeWins})` : "Equipo A"}</span>
                  <span>{isAzure ? "Ida/Vuelta + extra" : isClashRoyale ? "Marcador directo" : "Mejor de 5"}</span>
                  <span>{awayPlayer ? `${awayPlayer} (${isClashRoyale ? clashAwayScore : awayWins})` : "Equipo B"}</span>
                </div>
                <div className="space-y-2">
                  {bracket.finalSeries.map((game, index) => {
                    const winner = game.home !== null && game.away !== null ? (game.home > game.away ? homePlayer : game.away > game.home ? awayPlayer : null) : null;
                    return (
                      <div key={index} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-[11px] font-semibold" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>#{index + 1}</span>
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{homePlayer ?? "A"}</span>
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold" style={{ background: winner === homePlayer ? `${color}25` : "rgba(255,255,255,0.06)", color: winner === homePlayer ? "#e8e8f0" : "#c8c8d8" }}>
                              <input type="text" inputMode="numeric" pattern="[0-9]*" min={0} max={isAzure ? undefined : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 9} value={game.home ?? ""} onChange={(e) => {
                                const nextValue = e.target.value === "" ? null : Math.max(0, Math.min(isAzure ? Number.MAX_SAFE_INTEGER : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 9, Number(e.target.value)));
                                updateFinalSeriesScore(index, "home", Number.isFinite(nextValue) ? nextValue : null);
                              }}
                                className="w-full h-full text-center bg-transparent outline-none score-input" style={{ color: "#e8e8f0", WebkitTextFillColor: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "14px" }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold text-center" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>vs</span>
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold" style={{ background: winner === awayPlayer ? `${color}25` : "rgba(255,255,255,0.06)", color: winner === awayPlayer ? "#e8e8f0" : "#c8c8d8" }}>
                              <input type="text" inputMode="numeric" pattern="[0-9]*" min={0} max={isAzure ? undefined : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 9} value={game.away ?? ""} onChange={(e) => {
                                const nextValue = e.target.value === "" ? null : Math.max(0, Math.min(isAzure ? Number.MAX_SAFE_INTEGER : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 9, Number(e.target.value)));
                                updateFinalSeriesScore(index, "away", Number.isFinite(nextValue) ? nextValue : null);
                              }}
                                className="w-full h-full text-center bg-transparent outline-none score-input" style={{ color: "#e8e8f0", WebkitTextFillColor: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "14px" }} />
                            </div>
                            <span className="text-[10px] uppercase" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{awayPlayer ?? "B"}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: winner === homePlayer ? "#7dd3fc" : winner === awayPlayer ? "#fda4af" : "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>
                          {winner ? (winner === homePlayer ? "W" : "L") : "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {bracket.champion && (
              <div className="text-center py-3 px-5 rounded-xl" style={{ background: `${color}20`, border: `1px solid ${border}` }}>
                <p className="text-[10px] mb-1" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>CAMPEÓN</p>
                <p className="text-xl font-extrabold" style={{ color, fontFamily: "'Barlow Condensed', sans-serif" }}>🏆 {bracket.champion}</p>
              </div>
            )}
          </div>
        </div>

        {!isRivals && !isAzure && (
          <>
            {/* 3rd place */}
            <div className="mt-8 flex items-center gap-4">
              <p className="text-[10px] tracking-widest flex-shrink-0" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>3ER LUGAR</p>
              <MatchCard home={bracket.third[0].player} away={bracket.third[1].player} color={color} onWin={(w) => handleWin("third", w)} />
              {(bracket.third[0] as BracketSlot & { winner?: boolean }).winner !== undefined && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${color}10`, border: `1px solid ${border}` }}>
                  <span style={{ color, fontFamily: "JetBrains Mono,monospace", fontSize: "11px" }}>🥉 {bracket.third.find(s => s.winner)?.player}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TorneoView({ players, history, onBack, onSavePlayers, onSaveTournament }: { players: Player[]; history: TournamentRecord[]; onBack: () => void; onSavePlayers: (players: Player[]) => void; onSaveTournament: (record: TournamentRecord) => void }) {
  const [phase, setPhase] = useState<TorneoPhase>("setup");
  const [gameId, setGameId] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [format, setFormat] = useState<"liguilla" | "liguilla+elim">("liguilla+elim");
  const [useIdaVuelta, setUseIdaVuelta] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [teamScores, setTeamScores] = useState<Record<string, { home: number | null; away: number | null }>>({});
  const [killsByPlayer, setKillsByPlayer] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.name, 0])));
  const [showKillsPanel, setShowKillsPanel] = useState(true);
  const [azureGoalsByPlayer, setAzureGoalsByPlayer] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.name, 0])));
  const [showAzurePanel, setShowAzurePanel] = useState(true);
  const [volleyPtsByPlayer, setVolleyPtsByPlayer] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.name, 0])));
  const [volleyAssistsByPlayer, setVolleyAssistsByPlayer] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.name, 0])));
  const [volleyBlocksByPlayer, setVolleyBlocksByPlayer] = useState<Record<string, number>>(() => Object.fromEntries(players.map((p) => [p.name, 0])));
  const [showVolleyPanel, setShowVolleyPanel] = useState(true);
  const [mvpPlayer, setMvpPlayer] = useState<string | null>(null);
  const [edition, setEdition] = useState(1);
  const [managedBy, setManagedBy] = useState("Rikardo");
  const [savedTournament, setSavedTournament] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminPinError, setAdminPinError] = useState(false);
  const [bracket, setBracket] = useState<BracketState>({ sf1: [{ player: null }, { player: null }], sf2: [{ player: null }, { player: null }], final: [{ player: null }, { player: null }], third: [{ player: null }, { player: null }], finalSeries: Array.from({ length: 5 }, () => ({ home: null, away: null })), champion: null });
  const [showAzureCharacterModal, setShowAzureCharacterModal] = useState(false);
  const [azureAssignments, setAzureAssignments] = useState<Record<string, string>>({});

  const game = TOURNAMENTS.find((t) => t.id === gameId);
  const isRivals = game?.id === "rivals";
  const isAzure = game?.id === "azure";
  const isVolley = game?.id === "volley";
  const isClashRoyale = game?.id === "clashroyale";
  const isTeamSport = isRivals || isAzure || isVolley;
  const showIdaVueltaToggle = isTeamSport;
  const useHomeAndAway = showIdaVueltaToggle && useIdaVuelta;
  const rivalsTeams = isTeamSport ? buildRivalsTeams(selectedPlayers) : [];
  const teamNames = rivalsTeams.map((t) => t.team);
  const rounds = isTeamSport
    ? (teamNames.length >= 2 ? (useHomeAndAway ? generateDoubleRoundRobin(teamNames) : generateRoundRobin(teamNames)) : [])
    : (selectedPlayers.length >= 2 ? (useHomeAndAway ? generateDoubleRoundRobin(selectedPlayers) : generateRoundRobin(selectedPlayers)) : []);
  const standings = isRivals
    ? computeRivalsStandings(teamNames, rounds, teamScores)
    : isAzure
      ? computeAzureStandings(teamNames, rounds, teamScores)
      : isVolley
        ? computeVolleyStandings(teamNames, rounds, teamScores)
        : isClashRoyale
          ? computeClashRoyaleStandings(selectedPlayers, rounds, teamScores)
          : computeStandings(selectedPlayers, rounds, results);
  const allPlayed = rounds.every((round) =>
    round.matches.every(([home, away]) => {
      const key = `${round.round}|${home}|${away}`;
      if (isRivals) return Boolean(teamScores[key] && isValidRivalsScore(teamScores[key]));
      if (isAzure) return Boolean(teamScores[key] && typeof teamScores[key]?.home === "number" && typeof teamScores[key]?.away === "number" && teamScores[key].home >= 0 && teamScores[key].away >= 0);
      if (isVolley) return Boolean(teamScores[key] && isValidVolleyScore(teamScores[key]));
      if (isClashRoyale) return Boolean(teamScores[key] && isValidClashRoyaleScore(teamScores[key]));
      return Boolean(results[key]);
    })
  );

  const togglePlayer = (p: string) => {
    setSavedTournament(false);
    setSelectedPlayers((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  useEffect(() => {
    if (!gameId) return;
    // compute next edition for selected game based on history
    try {
      const existing = history.filter((r) => r.gameId === gameId).map((r) => Number(r.edition) || 0);
      const max = existing.length ? Math.max(...existing) : 0;
      setEdition(max + 1);
    } catch (e) {
      setEdition(1);
    }
  }, [gameId, history]);

  const updateKills = (player: string, delta: number) => {
    setKillsByPlayer((prev) => ({ ...prev, [player]: Math.max(0, (prev[player] ?? 0) + delta) }));
  };

  const renderKillsPanel = () => (
    <div className="fixed right-4 top-28 block" style={{ zIndex: 50 }}>
      {showKillsPanel ? (
        <div className="w-80 rounded-[32px] p-5" style={{ background: "rgba(15,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "calc(100vh - 120px)" }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-semibold tracking-[0.24em] uppercase" style={{ color: "#fcd34d", fontFamily: "JetBrains Mono,monospace" }}>Kills del torneo</p>
            <button onClick={() => setShowKillsPanel(false)} className="text-[11px] font-semibold uppercase rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>Ocultar</button>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Seleccionar MVP</label>
            <select
              value={mvpPlayer ?? ""}
              onChange={(e) => setMvpPlayer(e.target.value || null)}
              className="w-full rounded-2xl border border-white/10 bg-[#11101f] px-3 py-2 text-sm text-white"
              style={{ fontFamily: "JetBrains Mono,monospace" }}>
              <option value="">-- Ninguno --</option>
              {selectedPlayers.map((player) => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            {Object.entries(killsByPlayer).map(([player, kills]) => (
              <div key={player} className="rounded-2xl px-3 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}>{player}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateKills(player, -1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#fcd34d", fontFamily: "JetBrains Mono,monospace" }}>-</button>
                    <span className="text-sm font-bold" style={{ color: "#fcd34d", fontFamily: "JetBrains Mono,monospace" }}>{kills}</span>
                    <button onClick={() => updateKills(player, 1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#fcd34d", fontFamily: "JetBrains Mono,monospace" }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowKillsPanel(true)} className="w-32 rounded-full py-3 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#fcd34d", fontFamily: "JetBrains Mono,monospace" }}>
          Mostrar kills
        </button>
      )}
    </div>
  );

  const updateAzureGoals = (player: string, delta: number) => {
    setAzureGoalsByPlayer((prev) => ({ ...prev, [player]: Math.max(0, (prev[player] ?? 0) + delta) }));
  };

  const renderAzurePanel = () => (
    <div className="fixed right-4 top-28 block" style={{ zIndex: 50 }}>
      {showAzurePanel ? (
        <div className="w-80 rounded-[32px] p-5" style={{ background: "rgba(15,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "calc(100vh - 120px)" }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-semibold tracking-[0.24em] uppercase" style={{ color: "#67e8f9", fontFamily: "JetBrains Mono,monospace" }}>Goles & MVP</p>
            <button onClick={() => setShowAzurePanel(false)} className="text-[11px] font-semibold uppercase rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>Ocultar</button>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Seleccionar MVP</label>
            <select
              value={mvpPlayer ?? ""}
              onChange={(e) => setMvpPlayer(e.target.value || null)}
              className="w-full rounded-2xl border border-white/10 bg-[#11101f] px-3 py-2 text-sm text-white"
              style={{ fontFamily: "JetBrains Mono,monospace" }}>
              <option value="">-- Ninguno --</option>
              {selectedPlayers.map((player) => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            {Object.entries(azureGoalsByPlayer).map(([player, goals]) => (
              <div key={player} className="rounded-2xl px-3 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}>{player}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateAzureGoals(player, -1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#67e8f9", fontFamily: "JetBrains Mono,monospace" }}>-</button>
                    <span className="text-sm font-bold" style={{ color: "#67e8f9", fontFamily: "JetBrains Mono,monospace" }}>{goals}</span>
                    <button onClick={() => updateAzureGoals(player, 1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#67e8f9", fontFamily: "JetBrains Mono,monospace" }}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAzurePanel(true)} className="w-32 rounded-full py-3 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#67e8f9", fontFamily: "JetBrains Mono,monospace" }}>
          Mostrar goles
        </button>
      )}
    </div>
  );

  const updateVolleyStat = (mapSetter: React.Dispatch<React.SetStateAction<Record<string, number>>>, player: string, delta: number) => {
    mapSetter((prev) => ({ ...prev, [player]: Math.max(0, (prev[player] ?? 0) + delta) }));
  };

  const renderVolleyPanel = () => (
    <div className="fixed right-4 top-28 block" style={{ zIndex: 50 }}>
      {showVolleyPanel ? (
        <div className="w-96 rounded-[32px] p-5" style={{ background: "rgba(15,15,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 100px rgba(0,0,0,0.25)", maxHeight: "calc(100vh - 120px)" }}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-semibold tracking-[0.24em] uppercase" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>Volley — Pts · Asistencias · Bloqueos · MVP</p>
            <button onClick={() => setShowVolleyPanel(false)} className="text-[11px] font-semibold uppercase rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>Ocultar</button>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] uppercase tracking-[0.22em] mb-2" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>Seleccionar MVP</label>
            <select
              value={mvpPlayer ?? ""}
              onChange={(e) => setMvpPlayer(e.target.value || null)}
              className="w-full rounded-2xl border border-white/10 bg-[#11101f] px-3 py-2 text-sm text-white"
              style={{ fontFamily: "JetBrains Mono,monospace" }}>
              <option value="">-- Ninguno --</option>
              {selectedPlayers.map((player) => (
                <option key={player} value={player}>{player}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3" style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
            {selectedPlayers.map((player) => (
              <div key={player} className="rounded-2xl px-3 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm" style={{ color: "#e8e8f0", fontFamily: "'Barlow', sans-serif" }}>{player}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateVolleyStat(setVolleyPtsByPlayer, player, -1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>-</button>
                      <span className="text-sm font-bold" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>{volleyPtsByPlayer[player] ?? 0}</span>
                      <button onClick={() => updateVolleyStat(setVolleyPtsByPlayer, player, 1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateVolleyStat(setVolleyAssistsByPlayer, player, -1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>-</button>
                      <span className="text-sm font-bold" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>{volleyAssistsByPlayer[player] ?? 0}</span>
                      <button onClick={() => updateVolleyStat(setVolleyAssistsByPlayer, player, 1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>+</button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateVolleyStat(setVolleyBlocksByPlayer, player, -1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#93c5fd", fontFamily: "JetBrains Mono,monospace" }}>-</button>
                      <span className="text-sm font-bold" style={{ color: "#93c5fd", fontFamily: "JetBrains Mono,monospace" }}>{volleyBlocksByPlayer[player] ?? 0}</span>
                      <button onClick={() => updateVolleyStat(setVolleyBlocksByPlayer, player, 1)} className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "#93c5fd", fontFamily: "JetBrains Mono,monospace" }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowVolleyPanel(true)} className="w-40 rounded-full py-3 text-sm font-semibold" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>
          Mostrar stats
        </button>
      )}
    </div>
  );

  const advanceToBracket = () => {
    if (isRivals || isVolley) {
      const top2 = standings.slice(0, 2).map((s) => s.player);
      const [s1, s2] = top2;
      setBracket({ sf1: [{ player: null }, { player: null }], sf2: [{ player: null }, { player: null }], final: [{ player: s1 }, { player: s2 }], third: [{ player: null }, { player: null }], finalSeries: Array.from({ length: 5 }, () => ({ home: null, away: null })), champion: null });
    } else if (isAzure) {
      const top2 = standings.slice(0, 2).map((s) => s.player);
      const [s1, s2] = top2;
      setBracket({ sf1: [{ player: null }, { player: null }], sf2: [{ player: null }, { player: null }], final: [{ player: s1 }, { player: s2 }], third: [{ player: null }, { player: null }], finalSeries: Array.from({ length: 2 }, () => ({ home: null, away: null })), champion: null });
    } else {
      const top4 = standings.slice(0, 4).map((s) => s.player);
      const [s1, s2, s3, s4] = top4;
      setBracket({
        sf1: [{ player: s1 }, { player: s4 }],
        sf2: [{ player: s2 }, { player: s3 }],
        final: [{ player: null }, { player: null }],
        third: [{ player: null }, { player: null }],
        finalSeries: Array.from({ length: isClashRoyale ? 1 : 5 }, () => ({ home: null, away: null })),
        champion: null,
      });
    }
    setPhase("bracket");
  };

  const tryAdminPin = () => {
    const adminName = ADMIN_PINS[adminPin];
    if (adminName) {
      setIsAdmin(true);
      setAdminPinError(false);
      setAdminPin("");
      if (typeof window !== "undefined") window.localStorage.setItem(ADMIN_SESSION_KEY, adminName);
    } else {
      setAdminPinError(true);
      setAdminPin("");
    }
  };

  const saveTournament = async () => {
    if (!game || (isTeamSport ? !teamNames.length : selectedPlayers.length < 2)) return;
    let champion = bracket.champion;
    if (!champion && format === "liguilla") {
      champion = standings[0]?.player ?? null;
    }
    if (!champion) return;

    const championTeam = rivalsTeams.find((t) => t.team === champion);
    const runnerUp = format === "liguilla"
      ? standings[1]?.player ?? null
      : (bracket.final[0].player && bracket.final[1].player)
        ? (bracket.final[0].player === champion ? bracket.final[1].player : bracket.final[0].player)
        : standings[1]?.player ?? null;

    const computeRecordPlayerStats = () => {
      const winningPlayers = championTeam?.players ?? (champion ? [champion] : []);
      const stats: Record<string, TournamentPlayerStats> = Object.fromEntries(
        selectedPlayers.map((player) => [player, {
          w: 0,
          l: 0,
          played: 0,
          kills: killsByPlayer[player] ?? 0,
          titles: winningPlayers.includes(player) ? 1 : 0,
          mvps: mvpPlayer === player ? 1 : 0,
          participations: 1,
          goals: isAzure ? (azureGoalsByPlayer[player] ?? 0) : undefined,
          points: isVolley ? (volleyPtsByPlayer[player] ?? 0) : undefined,
          assists: isVolley ? (volleyAssistsByPlayer[player] ?? 0) : undefined,
          blocks: isVolley ? (volleyBlocksByPlayer[player] ?? 0) : undefined,
        }])
      );

      const addResult = (winner: string, loser: string) => {
        const winnerPlayers = (isRivals || isVolley)
          ? buildRivalsTeams(selectedPlayers).find((team) => team.team === winner)?.players ?? []
          : isAzure
            ? buildRivalsTeams(selectedPlayers).find((team) => team.team === winner)?.players ?? []
            : [winner];
        const loserPlayers = (isRivals || isVolley)
          ? buildRivalsTeams(selectedPlayers).find((team) => team.team === loser)?.players ?? []
          : isAzure
            ? buildRivalsTeams(selectedPlayers).find((team) => team.team === loser)?.players ?? []
            : [loser];

        for (const player of winnerPlayers) {
          stats[player].w += 1;
          stats[player].played += 1;
        }
        for (const player of loserPlayers) {
          stats[player].l += 1;
          stats[player].played += 1;
        }
      };

      for (const round of rounds) {
        for (const [home, away] of round.matches) {
          const key = `${round.round}|${home}|${away}`;
          const winner = isRivals
            ? teamScores[key] ? getRivalsMatchWinner(teamScores[key], home, away) : null
            : isAzure
              ? teamScores[key] && teamScores[key].home > teamScores[key].away
                ? home
                : teamScores[key] && teamScores[key].away > teamScores[key].home
                  ? away
                  : null
              : isVolley
                ? teamScores[key] ? getVolleyMatchWinner(teamScores[key], home, away) : null
                : results[key] || null;
          if (!winner) continue;
          const loser = winner === home ? away : home;
          addResult(winner, loser);
        }
      }

      const bracketKeys: Array<keyof BracketState> = ["sf1", "sf2", "third"];
      for (const key of bracketKeys) {
        const match = bracket[key];
        if (!match[0].player || !match[1].player) continue;
        if (match[0].winner === true && match[1].winner === false) {
          addResult(match[0].player, match[1].player);
        } else if (match[1].winner === true && match[0].winner === false) {
          addResult(match[1].player, match[0].player);
        }
      }

      if (bracket.final[0].player && bracket.final[1].player) {
        const homePlayer = bracket.final[0].player;
        const awayPlayer = bracket.final[1].player;
        for (const game of bracket.finalSeries) {
          if (game.home === null || game.away === null) continue;
          const winner = game.home > game.away ? homePlayer : game.away > game.home ? awayPlayer : null;
          if (!winner) continue;
          const loser = winner === homePlayer ? awayPlayer : homePlayer;
          addResult(winner, loser);
        }
      }

      return stats;
    };

    const record = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      gameId,
      date: new Date().toISOString(),
      participants: selectedPlayers,
      kills: killsByPlayer,
      champion,
      runnerUp,
      mvp: mvpPlayer,
      playerStats: computeRecordPlayerStats(),
      teamScores: isTeamSport ? teamScores : undefined,
      azureCharacters: isAzure ? azureAssignments : undefined,
      finalMatch: phase === "bracket" ? { home: bracket.final[0].player, away: bracket.final[1].player, series: bracket.finalSeries } : undefined,
      format,
      edition: Number.isFinite(edition) && edition > 0 ? edition : 1,
      managedBy: (typeof window !== "undefined" && window.localStorage.getItem(ADMIN_SESSION_KEY)) || managedBy.trim() || "Rikardo",
    };

    try {
      const res = await fetch(`${API_BASE}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error('api');
      const savedRecord = await res.json();
      onSaveTournament(savedRecord);
    } catch (err) {
      console.error(err);
      onSaveTournament(record);
    }
    const updated = players.map((player) => {
      const isParticipant = selectedPlayers.includes(player.name);
      const isChampion = championTeam?.players.includes(player.name) || player.name === champion;
      const isMvp = mvpPlayer === player.name;
      return {
        ...player,
        totalKills: (player.totalKills ?? 0) + (killsByPlayer[player.name] ?? 0),
        participations: (player.participations ?? 0) + (isParticipant ? 1 : 0),
        tournamentsWon: (player.tournamentsWon ?? 0) + (isChampion ? 1 : 0),
        mvps: (player.mvps ?? 0) + (isMvp ? 1 : 0),
      };
    });
    onSavePlayers(updated);
    setSavedTournament(true);
  };

  useEffect(() => {
    if (phase === "liguilla" && format === "liguilla" && allPlayed && !savedTournament) {
      saveTournament();
    }
  }, [phase, format, allPlayed, savedTournament]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (saved) {
      setIsAdmin(true);
      setManagedBy(saved);
    }
  }, []);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-md mx-auto w-full">
          <BackButton onClick={onBack} />
          <SectionTitle sub="Solo el administrador puede crear o modificar torneos">NUEVO TORNEO</SectionTitle>
          <div className="rounded-2xl p-8" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(245,158,11,0.12)" }}>
            <p className="text-sm mb-4" style={{ color: "#c8c8d8" }}>Acceso restringido. Ingresa el PIN de administrador para crear un torneo.</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <div>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => { setAdminPin(e.target.value); setAdminPinError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && tryAdminPin()}
                  placeholder="PIN administrador"
                  className="w-full rounded-2xl px-4 py-3 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e8f0", fontFamily: "JetBrains Mono,monospace" }}
                />
                {adminPinError && <p className="text-xs mt-2" style={{ color: "#ff8fa3", fontFamily: "JetBrains Mono,monospace" }}>PIN incorrecto.</p>}
              </div>
              <button onClick={tryAdminPin} className="rounded-2xl px-5 py-3 text-sm font-semibold" style={{ background: "rgba(255,77,109,0.15)", color: "#ff9aa3", border: "1px solid rgba(255,77,109,0.2)", fontFamily: "JetBrains Mono,monospace" }}>
                INGRESAR ADMIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-3xl mx-auto flex flex-col gap-8">
          <BackButton onClick={onBack} />
          <SectionTitle sub="Configura el torneo antes de generar el cuadro">NUEVO TORNEO</SectionTitle>

          {/* Step 1: Game */}
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-widest font-semibold" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>1 · SELECCIONA EL JUEGO</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TOURNAMENTS.map((t) => (
                <Ripple key={t.id} color={`${t.color}20`} onClick={() => { setGameId(t.id); setUseIdaVuelta(false); }}
                  className="rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all"
                  style={{ background: gameId === t.id ? `${t.color}15` : "rgba(255,255,255,0.03)", border: gameId === t.id ? `1px solid ${t.border}` : "1px solid rgba(255,255,255,0.07)", boxShadow: gameId === t.id ? `0 0 24px ${t.glow}` : "none" }}>
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-bold" style={{ color: gameId === t.id ? t.textColor : "#6b6b88", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "13px" }}>{t.name.toUpperCase()}</span>
                </Ripple>
              ))}
            </div>
          </div>

          {/* Step 2: Players */}
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-[10px] tracking-widest font-semibold" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>2 · JUGADORES PARTICIPANTES</p>
            <div className="flex flex-wrap gap-2">
                {players.map((p) => {
                  const sel = selectedPlayers.includes(p.name);
                  return (
                      <Ripple key={p.name} color={sel ? `${game?.color ?? "#7c3aed"}20` : "rgba(255,255,255,0.04)"} onClick={() => togglePlayer(p.name)}
                        className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: sel ? `${game?.color ?? "#7c3aed"}12` : "rgba(255,255,255,0.04)", border: sel ? `1px solid ${game?.border ?? "rgba(124,58,237,0.5)"}` : "1px solid rgba(255,255,255,0.08)", color: sel ? game?.textColor ?? "#a78bfa" : "#6b6b88" }}>
                        {p.name}
                      </Ripple>
                    );
                  })}
              </div>
              {(isRivals || isAzure) && selectedPlayers.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                  {rivalsTeams.map((team) => (
                    <div key={team.team} className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${game?.border ?? "rgba(255,255,255,0.08)"}` }}>
                      <p className="text-[10px] uppercase tracking-[0.24em]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>DUO</p>
                      <p className="text-sm font-bold mt-2" style={{ color: "#e8e8f0" }}>{team.team}</p>
                      <p className="text-xs mt-1" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>{team.players.join(" / ")}</p>
                    </div>
                  ))}
                </div>
              )}
            <div className="flex gap-3 flex-wrap">
              {([["liguilla", "Solo Liguilla", "Todos vs todos, se declara campeón al primero de la tabla"], ["liguilla+elim", "Liguilla + Eliminación", "Liguilla → Top 4 → Semis → Final"]] as const).map(([val, label, desc]) => (
                <Ripple key={val} color="rgba(245,158,11,0.15)" onClick={() => setFormat(val)}
                  className="flex-1 rounded-xl p-4 transition-all"
                  style={{ background: format === val ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)", border: format === val ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="font-bold text-sm mb-1" style={{ color: format === val ? "#fcd34d" : "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px" }}>{label.toUpperCase()}</p>
                  <p className="text-xs" style={{ color: "#6b6b88" }}>{desc}</p>
                </Ripple>
              ))}
            </div>

            {/* Edición y Admin gestor: ahora asignados automáticamente; inputs removidos */}

            {showIdaVueltaToggle && (
              <div className="flex flex-col gap-3 pt-2">
                <p className="text-[10px] tracking-widest font-semibold" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>3 · FORMATO DE LIGUILLA</p>
                <div className="flex flex-wrap gap-3">
                  <Ripple onClick={() => setUseIdaVuelta(false)} color="rgba(255,255,255,0.08)"
                    className="flex-1 rounded-xl p-3 transition-all"
                    style={{ background: !useIdaVuelta ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)", border: !useIdaVuelta ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="font-bold text-sm" style={{ color: !useIdaVuelta ? "#fcd34d" : "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px" }}>SIMPLE</p>
                    <p className="text-xs mt-1" style={{ color: "#6b6b88" }}>Una vuelta</p>
                  </Ripple>
                  <Ripple onClick={() => setUseIdaVuelta(true)} color="rgba(245,158,11,0.15)"
                    className="flex-1 rounded-xl p-3 transition-all"
                    style={{ background: useIdaVuelta ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)", border: useIdaVuelta ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="font-bold text-sm" style={{ color: useIdaVuelta ? "#fcd34d" : "#a0a0b8", fontFamily: "'Barlow Condensed', sans-serif", fontSize: "15px" }}>IDA Y VUELTA</p>
                    <p className="text-xs mt-1" style={{ color: "#6b6b88" }}>Partidos de local y visitante</p>
                  </Ripple>
                </div>
              </div>
            )}
          </div>

          <Ripple
            onClick={() => { if (gameId && selectedPlayers.length >= 2) setPhase("liguilla"); }}
            color="rgba(255,255,255,0.15)"
            className="py-4 rounded-2xl text-center font-bold transition-all"
            style={{
              background: gameId && selectedPlayers.length >= 2 ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
              border: gameId && selectedPlayers.length >= 2 ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(255,255,255,0.07)",
              color: gameId && selectedPlayers.length >= 2 ? "#a78bfa" : "#3a3a50",
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: "18px", letterSpacing: "0.08em",
              cursor: gameId && selectedPlayers.length >= 2 ? "pointer" : "not-allowed",
            }}>
            GENERAR LIGUILLA →
          </Ripple>
          {isRivals && selectedPlayers.length > 0 && (
            <p className="text-[11px] mt-2" style={{ color: "#fbbf24", fontFamily: "JetBrains Mono,monospace" }}>
              Rivals requiere duplas; la ruleta define equipos y posición. Si hay 7 jugadores, se aplican las reglas especiales de 2v1.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "liguilla" && game) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setPhase("setup")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#a0a0b8" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              SETUP
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{game.icon}</span>
            <SectionTitle sub={`${selectedPlayers.length} jugadores · ${rounds.length} jornadas`}>LIGUILLA — {game.name.toUpperCase()}</SectionTitle>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Standings */}
            <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ border: `1px solid ${game.border}`, background: "linear-gradient(160deg, #0f0f1a, #09090f)" }}>
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${game.border}`, background: game.bgStripe }}>
                <p className="text-[11px] tracking-widest font-semibold" style={{ color: game.textColor, fontFamily: "JetBrains Mono,monospace" }}>CLASIFICACIÓN</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    {["#", "JUGADOR", "PJ", "G", "P", ...(isRivals || isVolley ? ["RONDAS+", "RONDAS-", "DIF"] : isAzure ? ["GF", "GC", "DIF"] : isClashRoyale ? ["C+", "C-", "DIF"] : ["PTS"])].map((h, i) => (
                      <th key={h} className={`py-2.5 text-[10px] font-medium ${i === 0 ? "pl-4 pr-1 text-left" : i === 1 ? "px-2 text-left" : "px-2 text-center"}`}
                        style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => (
                    <tr key={s.player} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i < 4 ? `${game.color}07` : "transparent" }}>
                      <td className="py-2.5 pl-4 pr-1 text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: i < 4 ? game.color : "#6b6b88" }}>{i + 1}</td>
                      <td className="py-2.5 px-2 text-xs font-semibold" style={{ color: i < 4 ? "#e8e8f0" : "#a0a0b8" }}>{s.player}</td>
                      <td className="py-2.5 px-2 text-center text-xs" style={{ fontFamily: "JetBrains Mono,monospace", color: "#6b6b88" }}>{s.played}</td>
                      <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{s.w}</td>
                      <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{s.l}</td>
                      {isRivals || isVolley ? (
                        <>
                          {isRivals ? (
                            <>
                              <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{(s as any).rndFor}</td>
                              <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{(s as any).rndAgainst}</td>
                              <td className="py-2.5 px-2 text-center text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: game.color }}>{(s as any).rndDiff}</td>
                            </>
                          ) : (
                            <>
                              <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{(s as any).pf}</td>
                              <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{(s as any).pa}</td>
                              <td className="py-2.5 px-2 text-center text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: game.color }}>{(s as any).diff}</td>
                            </>
                          )}
                        </>
                      ) : isAzure ? (
                        <>
                          <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{(s as any).gf}</td>
                          <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{(s as any).ga}</td>
                          <td className="py-2.5 px-2 text-center text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: game.color }}>{(s as any).gd}</td>
                        </>
                      ) : isClashRoyale ? (
                        <>
                          <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#a3e635" }}>{(s as any).crownsFor}</td>
                          <td className="py-2.5 px-2 text-center text-xs font-semibold" style={{ fontFamily: "JetBrains Mono,monospace", color: "#f87171" }}>{(s as any).crownsAgainst}</td>
                          <td className="py-2.5 px-2 text-center text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: game.color }}>{(s as any).crownDiff}</td>
                        </>
                      ) : (
                        <td className="py-2.5 px-2 text-center text-xs font-bold" style={{ fontFamily: "JetBrains Mono,monospace", color: game.color }}>{s.pts}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {format === "liguilla+elim" && standings.length >= (isRivals || isAzure ? 2 : 4) && (
                <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-[10px]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{isRivals || isAzure ? "↑ Top 2 avanzan a final" : "↑ Top 4 avanzan a eliminación"}</p>
                </div>
              )}
            </div>

            {/* Fixtures */}
            <div className="lg:col-span-3 pr-1" style={{ height: "calc(100vh - 260px)", minHeight: 0 }}>
              <div className="h-full min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-1 pb-4" style={{ minHeight: 0 }}>
                  {rounds.map((round) => (
                    <div key={round.round} className="rounded-lg overflow-hidden mb-3" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#0f0f1a" }}>
                      <div className="px-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)" }}>
                        <p className="text-[8px] font-semibold tracking-[0.22em]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>JORNADA {round.round}</p>
                      </div>
                      {round.matches.map(([home, away]) => {
                        const key = `${round.round}|${home}|${away}`;
                        const score = teamScores[key];
                        const winner = isRivals
                          ? score && getRivalsMatchWinner(score, home, away)
                          : isAzure
                            ? score && (score.home > score.away ? home : score.away > score.home ? away : null)
                            : isClashRoyale
                              ? score && (score.home > score.away ? home : score.away > score.home ? away : null)
                              : results[key];
                        return (
                          <div key={key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center px-2 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div className="rounded-lg p-2" style={{ background: winner === home ? `${game.color}15` : "rgba(255,255,255,0.04)", border: winner === home ? `1px solid ${game.border}` : "1px solid rgba(255,255,255,0.07)" }}>
                              <p className="text-[10px] font-semibold" style={{ color: winner === home ? game.textColor : "#a0a0b8" }}>{home}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>VS</p>
                              <p className="text-[9px]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>{isAzure ? "Goles" : isClashRoyale ? "Coronas" : "5 rondas"}</p>
                            </div>
                            <div className="rounded-lg p-2" style={{ background: winner === away ? `${game.color}15` : "rgba(255,255,255,0.04)", border: winner === away ? `1px solid ${game.border}` : "1px solid rgba(255,255,255,0.07)" }}>
                              <p className="text-[10px] font-semibold" style={{ color: winner === away ? game.textColor : "#a0a0b8" }}>{away}</p>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  min={0}
                                  max={isAzure ? undefined : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 5}
                                  value={score?.home ?? ""}
                                  onChange={(e) => setTeamScores((prev) => ({ ...prev, [key]: { home: e.target.value === "" ? null : Math.max(0, Math.min(isAzure ? Number.MAX_SAFE_INTEGER : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 5, Number(e.target.value))), away: score?.away ?? null } }))}
                                  className="w-12 px-2 py-1 rounded-xl text-[11px] font-semibold text-white bg-[#11101f] border border-white/10 score-input"
                                  style={{ color: "#e8e8f0", WebkitTextFillColor: "#e8e8f0" }}
                                />
                              </div>
                              <span className="text-[9px]" style={{ color: "#6b6b88", fontFamily: "JetBrains Mono,monospace" }}>-</span>
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  min={0}
                                  max={isAzure ? undefined : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 5}
                                  value={score?.away ?? ""}
                                  onChange={(e) => setTeamScores((prev) => ({ ...prev, [key]: { home: score?.home ?? null, away: e.target.value === "" ? null : Math.max(0, Math.min(isAzure ? Number.MAX_SAFE_INTEGER : isVolley ? 25 : isRivals ? 5 : isClashRoyale ? 3 : 5, Number(e.target.value))) } }))}
                                  className="w-12 px-2 py-1 rounded-xl text-[11px] font-semibold text-white bg-[#11101f] border border-white/10 score-input"
                                  style={{ color: "#e8e8f0", WebkitTextFillColor: "#e8e8f0" }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {isRivals && renderKillsPanel()}
          {isAzure && renderAzurePanel()}
          {game?.id === "volley" && renderVolleyPanel()}

          {format === "liguilla+elim" && standings.length >= (isRivals || isAzure ? 2 : 4) && (
            <div className="flex flex-col gap-4">
              <button onClick={allPlayed ? advanceToBracket : undefined}
                className="py-4 rounded-2xl text-center font-bold"
                style={{
                  width: "100%",
                  background: allPlayed ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.05)",
                  border: allPlayed ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: allPlayed ? "#fcd34d" : "#6b6b88",
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: "18px", letterSpacing: "0.08em",
                  cursor: allPlayed ? "pointer" : "not-allowed",
                }}
                disabled={!allPlayed}>
                CONTINUAR → {(isRivals || isAzure) ? standings.slice(0, 2).map((s) => s.player).join(", ") : standings.slice(0, 4).map((s) => s.player).join(", ")}
              </button>
              {!allPlayed && (
                <p className="text-xs" style={{ color: "#f87171", fontFamily: "JetBrains Mono,monospace" }}>Completa los resultados de todas las jornadas antes de continuar.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "bracket" && game) {
    return (
      <div className="min-h-screen bg-background px-4 sm:px-8 py-12" style={{ fontFamily: "'Barlow', sans-serif" }}>
        <div className="max-w-4xl mx-auto flex flex-col gap-8 relative">
          {isRivals && renderKillsPanel()}
          {isAzure && renderAzurePanel()}
          {game?.id === "volley" && renderVolleyPanel()}
          <button onClick={() => setPhase("liguilla")} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold w-fit"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", color: "#a0a0b8" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            LIGUILLA
          </button>

          <SectionTitle sub="Haz clic en el jugador que ganó cada enfrentamiento">CUADRO DE ELIMINACIÓN — {game.name.toUpperCase()}</SectionTitle>

          <div className="rounded-2xl p-6" style={{ background: "linear-gradient(160deg, #0f0f1a, #09090f)", border: `1px solid ${game.border}`, boxShadow: `0 0 60px ${game.glow}` }}>
            <BracketView bracket={bracket} setBracket={setBracket} standings={standings} color={game.color} glow={game.glow} border={game.border} isRivals={isRivals} isAzure={isAzure} isVolley={isVolley} isClashRoyale={isClashRoyale} />
          </div>
          {bracket.champion && (
            <div className="rounded-2xl p-5 border border-white/10 bg-[#0f0f1a]">
              <p className="text-sm font-semibold mb-3" style={{ color: "#fcd34d", fontFamily: "'Barlow Condensed', sans-serif" }}>FINALIZAR TORNEO</p>
              <p className="text-xs mb-3" style={{ color: "#a0a0b8", fontFamily: "JetBrains Mono,monospace" }}>
                Campeón: <span style={{ color: game.color, fontWeight: 700 }}>{bracket.champion}</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Ripple onClick={saveTournament} color="rgba(255,255,255,0.15)"
                  className="flex-1 py-3 rounded-2xl text-center font-bold"
                  style={{ background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.35)", color: "#a78bfa", fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.06em" }}>
                  GUARDAR TORNEO
                </Ripple>
              </div>
            </div>
          )}
          {savedTournament && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/40">
              <div className="w-full max-w-md rounded-[32px] p-6 bg-[#0b1220] border border-white/10 shadow-2xl">
                <p className="text-xs uppercase tracking-[0.24em] mb-3" style={{ color: "#bef264", fontFamily: "JetBrains Mono,monospace" }}>TORNEO GUARDADO</p>
                <h3 className="text-2xl font-extrabold mb-4" style={{ color: "#e8e8f0", fontFamily: "'Barlow Condensed', sans-serif" }}>¡Torneo guardado!</h3>
                <p className="text-sm leading-relaxed mb-6" style={{ color: "#c8c8d8", fontFamily: "JetBrains Mono,monospace" }}>Las estadísticas se almacenaron correctamente. Al cerrar este mensaje volverás al menú principal.</p>
                <button onClick={() => { setSavedTournament(false); onBack(); }} className="w-full rounded-2xl py-3 text-sm font-bold" style={{ background: "rgba(124,58,237,0.22)", color: "#a78bfa", fontFamily: "'Barlow Condensed', sans-serif", border: "1px solid rgba(124,58,237,0.35)" }}>
                  Cerrar y volver al menú
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ─── App ─────────────────────────────────────────────────────────────────────

const PLAYER_STORAGE_KEY = "ladvzla_players";
const TOURNAMENT_HISTORY_KEY = "ladvzla_tournament_history";
const ADMIN_SESSION_KEY = "ladvzla_admin_session";

export default function App() {
  const [view, setView] = useState<View>("menu");
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [tournamentHistory, setTournamentHistory] = useState<TournamentRecord[]>([]);

  const handleDeletePlayer = async (name: string) => {
    const player = players.find((p) => p.name === name);
    try {
      if (player?.id) {
        const res = await fetch(`${API_BASE}/api/players/${player.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('delete failed');
      } else {
        const res = await fetch(`${API_BASE}/api/players?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('delete failed');
      }
    } catch (err) {
      console.error('Failed to delete from API', err);
    }

    const playerAppearsIn = (record: TournamentRecord) => {
      if (record.participants.includes(name)) return true;
      if (record.champion === name) return true;
      if (record.runnerUp === name) return true;
      if (record.mvp === name) return true;
      if (record.finalMatch?.home === name) return true;
      if (record.finalMatch?.away === name) return true;
      if (record.playerStats && name in record.playerStats) return true;
      if (record.azureCharacters && Object.values(record.azureCharacters).includes(name)) return true;
      return false;
    };

    setPlayers((prev) => prev.filter((p) => p.name !== name));
    setTournamentHistory((prev) => prev.filter((record) => !playerAppearsIn(record)));
  };

  const handleDeleteTournament = (id: string) => {
    setTournamentHistory((prev) => prev.filter((record) => record.id !== id));
  };

  const handleUpdateTournament = (updatedRecord: TournamentRecord) => {
    setTournamentHistory((prev) => prev.map((record) => record.id === updatedRecord.id ? updatedRecord : record));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedAdmin = window.localStorage.getItem(ADMIN_SESSION_KEY);
    if (savedAdmin) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, savedAdmin);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Load players from API (fallback to localStorage if API unavailable)
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/players`);
        if (res.ok) {
          const list = await res.json();
          setPlayers(Array.isArray(list) ? list : []);
        } else {
          throw new Error('api error');
        }
      } catch (err) {
        try {
          const stored = window.localStorage.getItem(PLAYER_STORAGE_KEY);
          if (stored) {
            const parsed: Player[] = JSON.parse(stored);
            if (Array.isArray(parsed)) setPlayers(parsed);
          }
        } catch (e) {
          console.warn('Failed to load players from API and localStorage', e);
        }
      }
    })();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tournaments`);
        if (res.ok) {
          const list = await res.json();
          if (Array.isArray(list)) setTournamentHistory(list);
          return;
        }
      } catch (err) {
        console.warn('Failed to load tournaments from API', err);
      }

      try {
        const historyStored = window.localStorage.getItem(TOURNAMENT_HISTORY_KEY);
        if (historyStored) {
          const parsedHistory: TournamentRecord[] = JSON.parse(historyStored);
          if (Array.isArray(parsedHistory)) {
            setTournamentHistory(parsedHistory.map((record) => ({
              ...record,
              id: record.id ?? `${record.date}-${Math.random().toString(16).slice(2, 8)}`,
              hidden: record.hidden ?? false,
            })));
          }
        }
      } catch (error) {
        console.warn("Failed to load tournament history from localStorage", error);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(players));
    } catch (error) {
      console.warn("Failed to save players to localStorage", error);
    }
  }, [players]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(TOURNAMENT_HISTORY_KEY, JSON.stringify(tournamentHistory));
    } catch (error) {
      console.warn("Failed to save tournament history to localStorage", error);
    }
  }, [tournamentHistory]);

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>
      <style>{`
        @keyframes ripple-expand {
          0% { transform: scale(0); opacity: 1; }
          80% { opacity: 0.5; }
          100% { transform: scale(1); opacity: 0; }
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      {view === "menu"      && <HomeMenu onNavigate={setView} />}
      {view === "tablas"    && <TablasView players={players} history={tournamentHistory} onBack={() => setView("menu")} />}
      {view === "jugadores" && <JugadoresView players={players} history={tournamentHistory} onPlayers={setPlayers} onDeletePlayer={handleDeletePlayer} onBack={() => setView("menu")} />}
      {view === "reglas"    && <ReglasView onBack={() => setView("menu")} />}
      
      {view === "admin"     && <AdminView players={players} onPlayers={setPlayers} onDeletePlayer={handleDeletePlayer} onBack={() => setView("menu")} />}
      {view === "historial" && <HistorialView tournaments={TOURNAMENTS} history={tournamentHistory} onBack={() => setView("menu")} onDeleteTournament={handleDeleteTournament} onUpdateTournament={handleUpdateTournament} />}
      {view === "torneo"    && <TorneoView players={players} history={tournamentHistory} onBack={() => setView("menu")} onSavePlayers={setPlayers} onSaveTournament={(record) => setTournamentHistory((prev) => [...prev, record])} />}
    </div>
  );
}
