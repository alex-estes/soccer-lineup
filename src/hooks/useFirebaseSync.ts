import { useEffect, useRef, useState, type Dispatch } from 'react';
import { setDoc, onSnapshot } from 'firebase/firestore';
import { lineupDoc } from '../lib/firebaseConfig';
import { autoGenerate } from '../lib/autoGenerate';
import type { Action } from '../state/reducer';
import type { AppState, SyncStatus } from '../types';

const ECHO_WINDOW_MS = 2000;
const DEBOUNCE_MS = 600;

export function useFirebaseSync(state: AppState, dispatch: Dispatch<Action>): SyncStatus {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const lastSaveTimeRef = useRef<number>(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  // Keep a ref to latest state so the snapshot callback can read it without stale closure
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  // Listen for remote changes
  useEffect(() => {
    const unsub = onSnapshot(lineupDoc, snap => {
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;

        if (!snap.exists()) {
          // Nothing saved yet — load defaults, then auto-generate
          dispatch({ type: 'LOAD_FROM_FIREBASE', data: {} });
          const currentState = stateRef.current;
          const rotations = autoGenerate(currentState);
          dispatch({ type: 'SET_LINEUP', gameIndex: currentState.curGame, rotations });
          return;
        }

        const data = snap.data();
        const hasData = Array.isArray(data.games) && (data.games as AppState['games']).some(g =>
          g.rotations && g.rotations.some(r =>
            ['def', 'mid', 'fwd'].some(pos => {
              const slots = (r as unknown as Record<string, (string | null)[]>)[pos];
              return Array.isArray(slots) && slots.some(Boolean);
            })
          )
        );

        if (hasData) {
          // Suppress the echo-save triggered by state change during initial load
          lastSaveTimeRef.current = Date.now();
          dispatch({ type: 'LOAD_FROM_FIREBASE', data });
          setTimeout(() => { lastSaveTimeRef.current = 0; }, ECHO_WINDOW_MS);
        } else {
          // Data document exists but no real lineup data — treat as empty
          dispatch({ type: 'LOAD_FROM_FIREBASE', data });
          const currentState = stateRef.current;
          const rotations = autoGenerate(currentState);
          dispatch({ type: 'SET_LINEUP', gameIndex: currentState.curGame, rotations });
        }
        return;
      }

      // Subsequent remote updates — echo prevention
      if (Date.now() - lastSaveTimeRef.current < ECHO_WINDOW_MS) return;
      dispatch({ type: 'LOAD_FROM_FIREBASE', data: snap.data() ?? {} });
    });

    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save whenever loaded state changes
  useEffect(() => {
    if (!state.isLoaded) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      setSyncStatus('saving');
      lastSaveTimeRef.current = Date.now();
      const { players, goals, games, curGame } = state;
      setDoc(lineupDoc, { players, goals, games, curGame })
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'));
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state.players, state.goals, state.games, state.curGame, state.isLoaded]);

  return syncStatus;
}
