import { POSITIONS } from '../constants';
import type { AppState, PlayerStats, StatsMap } from '../types';
import { ensureShape, getGame } from './utils';

function getGoals(goals: AppState['goals'], name: string, gameId: string): number {
  return goals[name]?.[gameId] ?? 0;
}

export function totalGoals(goals: AppState['goals'], name: string): number {
  if (!goals[name]) return 0;
  return Object.values(goals[name]).reduce((a, b) => a + b, 0);
}

export function getTeamScore(state: Pick<AppState, 'games' | 'goals' | 'players'>, gameId: string): number {
  let total = 0;
  state.players
    .filter(p => p.active)
    .forEach(p => { total += getGoals(state.goals, p.name, gameId); });
  return total;
}

export function getGameResult(state: Pick<AppState, 'games' | 'goals' | 'players'>, gameId: string): 'W' | 'L' | 'T' | null {
  const g = getGame(state.games, gameId);
  if (!g || !g.completed) return null;
  const us = getTeamScore(state, gameId);
  const them = g.opponentScore || 0;
  if (us > them) return 'W';
  if (us < them) return 'L';
  return 'T';
}

export function getGameStats(state: Pick<AppState, 'players' | 'games' | 'goals' | 'curGame'>): StatsMap {
  const s: StatsMap = {};
  state.players.forEach(p => { s[p.name] = { def: 0, mid: 0, fwd: 0, total: 0, goals: 0 }; });

  const g = getGame(state.games, state.curGame);
  if (!g) return s;

  g.rotations.forEach(rot => {
    ensureShape(rot);
    POSITIONS.forEach(pos => {
      rot[pos].forEach(p => {
        if (p && s[p]) { s[p][pos]++; s[p].total++; }
      });
    });
  });
  state.players.forEach(p => { s[p.name].goals += getGoals(state.goals, p.name, g.id); });
  return s;
}

export function getCumulativeStats(state: Pick<AppState, 'players' | 'games' | 'goals'>): StatsMap {
  const s: StatsMap = {};
  state.players.forEach(p => { s[p.name] = { def: 0, mid: 0, fwd: 0, total: 0, goals: 0 }; });

  state.games.forEach(g => {
    g.rotations.forEach(rot => {
      ensureShape(rot);
      POSITIONS.forEach(pos => {
        rot[pos].forEach(p => {
          if (p && s[p]) { s[p][pos]++; s[p].total++; }
        });
      });
    });
    state.players.forEach(p => { s[p.name].goals += getGoals(state.goals, p.name, g.id); });
  });
  return s;
}

export function getSeasonRecord(state: Pick<AppState, 'games' | 'goals' | 'players'>): { wins: number; losses: number; ties: number } {
  let wins = 0, losses = 0, ties = 0;
  state.games.forEach(g => {
    const r = getGameResult(state, g.id);
    if (r === 'W') wins++;
    else if (r === 'L') losses++;
    else if (r === 'T') ties++;
  });
  return { wins, losses, ties };
}

export function getUnfilledCount(state: Pick<AppState, 'games' | 'curGame'>): number {
  let unfilled = 0;
  const g = getGame(state.games, state.curGame);
  if (!g) return 0;
  g.rotations.forEach(rot => {
    if (rot.played) return;
    POSITIONS.forEach(pos => {
      rot[pos].forEach(p => { if (!p) unfilled++; });
    });
  });
  return unfilled;
}

export type { PlayerStats };
