import { useReducer, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { DocumentReference } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { LoadingOverlay } from './components/LoadingOverlay';
import { UpdateBanner } from './components/UpdateBanner';
import { SignInPage } from './components/SignInPage';
import { HomePage } from './pages/Home/HomePage';
import { GameDayPage } from './pages/GameDay/GameDayPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { PlayerPage } from './pages/Player/PlayerPage';
import { AppContext } from './state/AppContext';
import { reducer, initialState } from './state/reducer';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useAuth } from './hooks/useAuth';
import { getUserLineupDoc } from './lib/firebaseConfig';

interface AuthenticatedAppProps {
  lineupDoc: DocumentReference;
  user: User;
  onSignOut: () => void;
}

function AuthenticatedApp({ lineupDoc, user, onSignOut }: AuthenticatedAppProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const syncStatus = useFirebaseSync(state, dispatch, lineupDoc);

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
    <AppContext.Provider value={{ state, dispatch }}>
      <UpdateBanner />
      {!state.isLoaded && <LoadingOverlay />}
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
          <Route path="/game/:gameId" element={<GameDayPage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
          <Route path="/settings" element={<SettingsPage user={user} onSignOut={onSignOut} />} />
          <Route path="/player/:name" element={<PlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}

export function App() {
  const { user, loading, error, signIn, signOut } = useAuth();

  if (loading) return <LoadingOverlay />;
  if (!user) return <SignInPage onSignIn={signIn} redirectError={error} />;

  const lineupDoc = getUserLineupDoc(user.uid);
  return <AuthenticatedApp lineupDoc={lineupDoc} user={user} onSignOut={signOut} />;
}

export default App;
