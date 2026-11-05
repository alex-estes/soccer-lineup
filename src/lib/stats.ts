import type { AppState, Game, PlayerStats, PositionDef, StatsMap } from '../types';
import { getGame } from './utils';

type StatsInput = Pick<AppState, 'games' | 'players'>;

export function scoreOf(game: Game | undefined, name: string): number {
  return game?.scores[name] ?? 0;
}

export function totalScore(games: Game[], name: string): number {
  return games.reduce((a, g) => a + scoreOf(g, name), 0);
}

export function getTeamScore(state: StatsInput, gameId: string): number {
  const g = getGame(state.games, gameId);
  let total = 0;
  state.players
    .filter(p => p.active)
    .forEach(p => { total += scoreOf(g, p.name); });
  return total;
}

export interface LiveResult {
  result: 'W' | 'L' | 'T';
  teamScore: number;
  opponentScore: number;
}

/** Current result of a game whether or not it's been marked completed. */
export function getLiveResult(state: StatsInput, gameId: string): LiveResult {
  const teamScore = getTeamScore(state, gameId);
  const opponentScore = getGame(state.games, gameId)?.opponentScore || 0;
  const result = teamScore > opponentScore ? 'W' : teamScore < opponentScore ? 'L' : 'T';
  return { result, teamScore, opponentScore };
}

export function getGameResult(state: StatsInput, gameId: string): 'W' | 'L' | 'T' | null {
  const g = getGame(state.games, gameId);
  if (!g || !g.completed) return null;
  return getLiveResult(state, gameId).result;
}

function emptyStats(state: StatsInput): StatsMap {
  const s: StatsMap = {};
  state.players.forEach(p => { s[p.name] = { byPos: {}, total: 0, score: 0 }; });
  return s;
}

function addGame(s: StatsMap, g: Game) {
  g.rotations.forEach(rot => {
    Object.entries(rot.slots).forEach(([pos, line]) => {
      line.forEach(p => {
        if (p && s[p]) { s[p].byPos[pos] = (s[p].byPos[pos] ?? 0) + 1; s[p].total++; }
      });
    });
  });
  Object.keys(s).forEach(name => { s[name].score += scoreOf(g, name); });
}

export function getGameStats(state: StatsInput & Pick<AppState, 'curGame'>): StatsMap {
  const s = emptyStats(state);
  const g = getGame(state.games, state.curGame);
  if (g) addGame(s, g);
  return s;
}

export function getCumulativeStats(state: StatsInput): StatsMap {
  const s = emptyStats(state);
  state.games.forEach(g => addGame(s, g));
  return s;
}

/**
 * The position columns to show for a set of games: the team's current lineup first,
 * then any position an older game used that has since been removed or renamed away,
 * so its minutes don't silently disappear from the season table.
 */
export function statsColumns(current: PositionDef[], games: Game[]): PositionDef[] {
  const out = [...current];
  const seen = new Set(current.map(p => p.id));
  games.forEach(g => g.positions.forEach(p => {
    if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  }));
  return out;
}

export function getSeasonRecord(state: StatsInput): { wins: number; losses: number; ties: number } {
  let wins = 0, losses = 0, ties = 0;
  state.games.forEach(g => {
    const r = getGameResult(state, g.id);
    if (r === 'W') wins++;
    else if (r === 'L') losses++;
    else if (r === 'T') ties++;
  });
  return { wins, losses, ties };
}

/** Shared "show – instead of 0" formatting for every stat readout. */
export function statCell(n: number | undefined): string {
  return n && n > 0 ? String(n) : '–';
}

/**
 * Games in which this player appears in at least one rotation slot. Counts
 * auto-generated future rotations, consistent with getCumulativeStats — which
 * already counts unplayed rotations toward the position columns — so the Player page's
 * GAMES tile agrees with the position tiles next to it.
 */
export function getGamesPlayed(state: Pick<AppState, 'games'>, name: string): number {
  return state.games.filter(g =>
    g.rotations.some(rot => Object.values(rot.slots).some(line => line.includes(name)))
  ).length;
}

export type { PlayerStats };
