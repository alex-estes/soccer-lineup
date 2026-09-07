import { useReducer, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { DocumentReference } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { LoadingOverlay } from './components/LoadingOverlay';
import { SignInPage } from './components/SignInPage';
import { HomePage } from './pages/Home/HomePage';
import { GameDayPage } from './pages/GameDay/GameDayPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
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

  // Close swap/slot-menu selection on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (state.swapSel) { dispatch({ type: 'SET_SWAP_SEL', swapSel: null }); return; }
      if (state.slotMenuSel) { dispatch({ type: 'SET_SLOT_MENU', slotMenuSel: null }); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state.swapSel, state.slotMenuSel]);

  // Dismiss swapSel when clicking outside bench/swap-target
  useEffect(() => {
    if (!state.swapSel) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('[data-bench-slot]') && !t.closest('[data-swap-target]')) {
        dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [state.swapSel]);

  // Dismiss slotMenuSel when clicking outside
  useEffect(() => {
    if (!state.slotMenuSel) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('[data-swap-btn]') && !t.closest('[data-slot-dropdown]')) {
        dispatch({ type: 'SET_SLOT_MENU', slotMenuSel: null });
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [state.slotMenuSel]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {!state.isLoaded && <LoadingOverlay />}
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
          <Route path="/game/:gameId" element={<GameDayPage syncStatus={syncStatus} user={user} onSignOut={onSignOut} />} />
          <Route path="/settings" element={<SettingsPage user={user} onSignOut={onSignOut} />} />
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
