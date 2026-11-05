import { useEffect, useRef, useState, type Dispatch } from 'react';
import { deleteDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { gameRef, gamesCol, teamRef } from '../lib/teamsApi';
import type { Action } from '../state/reducer';
import { gameToDoc, normalizeGameDoc, type TeamSnapshot } from '../state/teamDoc';
import type { AppState, Game, Player, SyncStatus, TeamSettings } from '../types';

const DEBOUNCE_MS = 500;

type TeamField = 'players' | 'settings' | 'name';

interface RemoteTeam {
  players: Player[];
  settings: TeamSettings;
  name: string;
}

/**
 * Two-way sync for one team, built so several coaches can edit at once without wiping
 * each other's work:
 *
 * - Each game is its own document, and a save sends only the fields of that game that
 *   changed. One coach entering points while another fixes a rotation never collide;
 *   only two edits to the same field of the same game race, and then the later one wins.
 * - A local change is detected by object identity against the last copy that came from
 *   (or went to) Firestore — the reducer never mutates, so an untouched game or roster is
 *   the very object the snapshot produced.
 * - While a local edit is waiting out its debounce, incoming snapshots of that same
 *   document are not applied over it (see REMOTE_GAMES / REMOTE_TEAM), so a remote update
 *   can't swallow a tap that hasn't been saved yet.
 *
 * The team document itself arrives through useTeams' query and is passed in as
 * `snapshot`; only the games collection is subscribed to here.
 */
export function useTeamSync(state: AppState, dispatch: Dispatch<Action>, snapshot: TeamSnapshot): SyncStatus {
  const teamId = snapshot.meta.id;
  const sport = snapshot.meta.sport;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const stateRef = useRef(state);
  stateRef.current = state;

  const remoteGames = useRef(new Map<string, Game>());
  const remoteTeam = useRef<RemoteTeam>({
    players: snapshot.players,
    settings: snapshot.settings,
    name: snapshot.meta.name,
  });
  const pendingGames = useRef(new Set<string>());
  const pendingTeam = useRef(new Set<TeamField>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(0);

  function track(p: Promise<unknown>) {
    inFlight.current++;
    setSyncStatus('saving');
    p.then(
      () => { if (--inFlight.current === 0) setSyncStatus(s => (s === 'error' ? s : 'saved')); },
      err => { inFlight.current--; console.error('Saving failed', err); setSyncStatus('error'); },
    );
  }

  // ── Writes ──

  function flushGame(id: string) {
    timers.current.delete(id);
    pendingGames.current.delete(id);
    const game = stateRef.current.games.find(g => g.id === id);
    const prev = remoteGames.current.get(id);

    if (!game) {
      if (prev) track(deleteDoc(gameRef(teamId, id)));
      remoteGames.current.delete(id);
      return;
    }
    if (!prev) {
      track(setDoc(gameRef(teamId, id), gameToDoc(game)));
    } else {
      const next = gameToDoc(game);
      const before = gameToDoc(prev);
      const changed: Record<string, unknown> = {};
      (Object.keys(next) as (keyof typeof next)[]).forEach(k => {
        if (JSON.stringify(next[k]) !== JSON.stringify(before[k])) changed[k] = next[k];
      });
      // updateDoc, not setDoc: if another coach deleted this game meanwhile, the write
      // fails instead of bringing it back.
      if (Object.keys(changed).length) track(updateDoc(gameRef(teamId, id), changed));
    }
    remoteGames.current.set(id, game);
  }

  function flushTeam() {
    timers.current.delete('team');
    const fields = [...pendingTeam.current];
    pendingTeam.current.clear();
    if (!fields.length) return;
    const s = stateRef.current;
    const update: Record<string, unknown> = {};
    if (fields.includes('players')) { update.players = s.players; remoteTeam.current.players = s.players; }
    if (fields.includes('settings')) { update.settings = s.settings; remoteTeam.current.settings = s.settings; }
    if (fields.includes('name')) { update.name = s.team.name; remoteTeam.current.name = s.team.name; }
    track(updateDoc(teamRef(teamId), update));
  }

  function schedule(key: string, flush: () => void) {
    const t = timers.current.get(key);
    if (t) clearTimeout(t);
    timers.current.set(key, setTimeout(flush, DEBOUNCE_MS));
  }

  function flushAll() {
    [...timers.current.entries()].forEach(([key, t]) => {
      clearTimeout(t);
      if (key === 'team') flushTeam(); else flushGame(key);
    });
  }

  useEffect(() => {
    if (!state.isLoaded) return;
    const rt = remoteTeam.current;
    const teamFields: TeamField[] = [];
    if (state.players !== rt.players) teamFields.push('players');
    if (state.settings !== rt.settings) teamFields.push('settings');
    if (state.team.name !== rt.name) teamFields.push('name');
    if (teamFields.length) {
      teamFields.forEach(f => pendingTeam.current.add(f));
      schedule('team', flushTeam);
    }

    const ids = new Set(state.games.map(g => g.id));
    state.games.forEach(g => {
      if (g !== remoteGames.current.get(g.id)) {
        pendingGames.current.add(g.id);
        schedule(g.id, () => flushGame(g.id));
      }
    });
    remoteGames.current.forEach((_, id) => {
      if (!ids.has(id)) {
        pendingGames.current.add(id);
        schedule(id, () => flushGame(id));
      }
    });
  // The flush helpers only read refs, so they're safe to leave out.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.players, state.settings, state.team.name, state.games, state.isLoaded]);

  // Don't lose the last tap when the coach closes the app or switches teams.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushAll(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushAll);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // ── Reads ──

  useEffect(() => {
    return onSnapshot(
      gamesCol(teamId),
      snap => {
        const games = snap.docs.map(d => normalizeGameDoc(d.id, d.data(), sport));
        remoteGames.current = new Map(games.map(g => [g.id, g]));
        dispatch({ type: 'REMOTE_GAMES', games, pendingIds: [...pendingGames.current] });
      },
      err => {
        // Most likely this coach was just removed from the team; useTeams will notice
        // the team is gone and move them off it.
        console.error('Game sync stopped', err);
        setSyncStatus('error');
      },
    );
  }, [teamId, sport, dispatch]);

  useEffect(() => {
    remoteTeam.current = {
      players: snapshot.players,
      settings: snapshot.settings,
      name: snapshot.meta.name,
    };
    const pending = pendingTeam.current;
    dispatch({
      type: 'REMOTE_TEAM',
      team: pending.has('name') ? { ...snapshot.meta, name: stateRef.current.team.name } : snapshot.meta,
      players: pending.has('players') ? undefined : snapshot.players,
      settings: pending.has('settings') ? undefined : snapshot.settings,
    });
  }, [snapshot, dispatch]);

  return syncStatus;
}
