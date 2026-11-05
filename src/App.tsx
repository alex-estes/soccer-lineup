import { useReducer, useEffect, useState, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { LoadingOverlay } from './components/LoadingOverlay';
import { UpdateBanner } from './components/UpdateBanner';
import { SignInPage } from './components/SignInPage';
import { HomePage } from './pages/Home/HomePage';
import { GameDayPage } from './pages/GameDay/GameDayPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { PlayerPage } from './pages/Player/PlayerPage';
import { TeamsPage } from './pages/Teams/TeamsPage';
import { AppContext } from './state/AppContext';
import { reducer, makeInitialState } from './state/reducer';
import type { TeamSnapshot } from './state/teamDoc';
import { useTeamSync } from './hooks/useTeamSync';
import { useTeams } from './hooks/useTeams';
import { useAuth } from './hooks/useAuth';

const LAST_TEAM_KEY = 'lastTeamId';

function readLastTeam(): string | null {
  try { return localStorage.getItem(LAST_TEAM_KEY); } catch { return null; }
}

function writeLastTeam(id: string) {
  try { localStorage.setItem(LAST_TEAM_KEY, id); } catch { /* private mode — just don't remember */ }
}

interface TeamAppProps {
  snapshot: TeamSnapshot;
  user: User;
  onSignOut: () => void;
}

/** Everything for the one open team. Remounted (via `key`) when the coach switches team. */
function TeamApp({ snapshot, user, onSignOut }: TeamAppProps) {
  const [state, dispatch] = useReducer(
    reducer,
    snapshot,
    s => makeInitialState(s.meta, s.players, s.settings),
  );
  const syncStatus = useTeamSync(state, dispatch, snapshot);

  // Clear the move selection on Escape
  useEffect(() => {
    if (!state.swapSel) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.swapSel]);

  // Dismiss swapSel when clicking outside bench/swap-target/swap button
  useEffect(() => {
    if (!state.swapSel) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('[data-bench-slot]') && !t.closest('[data-swap-target]') && !t.closest('[data-swap-btn]')) {
        dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [state.swapSel]);

  return (
    <AppContext.Provider value={{ state, dispatch, user }}>
      {!state.isLoaded && <LoadingOverlay />}
      <Routes>
        <Route path="/" element={<HomePage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
        <Route path="/game/:gameId" element={<GameDayPage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
        <Route path="/settings" element={<SettingsPage user={user} onSignOut={onSignOut} />} />
        <Route path="/player/:name" element={<PlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppContext.Provider>
  );
}

function SignedInApp({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const { teams, loading, error } = useTeams(user);
  const [selectedId, setSelectedId] = useState<string | null>(readLastTeam);

  const selectTeam = useCallback((id: string) => {
    writeLastTeam(id);
    setSelectedId(id);
  }, []);

  if (loading) return <LoadingOverlay />;

  // The remembered team, or else the first one — a team that was deleted, or that this
  // coach was removed from, simply drops out of `teams`.
  const active = teams.find(t => t.meta.id === selectedId) ?? teams[0];

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/teams"
          element={
            <TeamsPage
              user={user}
              onSignOut={onSignOut}
              teams={teams}
              activeId={active?.meta.id ?? null}
              loadError={error}
              onSelect={selectTeam}
            />
          }
        />
        <Route
          path="*"
          element={active
            ? <TeamApp key={active.meta.id} snapshot={active} user={user} onSignOut={onSignOut} />
            : <Navigate to="/teams" replace />}
        />
      </Routes>
    </HashRouter>
  );
}

export function App() {
  const { user, loading, error, signIn, signOut } = useAuth();

  if (loading) return <LoadingOverlay />;
  if (!user) return <SignInPage onSignIn={signIn} redirectError={error} />;

  return (
    <>
      <UpdateBanner />
      <SignedInApp key={user.uid} user={user} onSignOut={signOut} />
    </>
  );
}

export default App;
