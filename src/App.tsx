import { useReducer, useState, useEffect } from 'react';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Content } from './components/Content/Content';
import { StickyFooter } from './components/Footer/StickyFooter';
import { NewGameModal } from './components/Modals/NewGameModal';
import { GoalsModal } from './components/Modals/GoalsModal';
import { AppContext } from './state/AppContext';
import { reducer, initialState } from './state/reducer';
import { useFirebaseSync } from './hooks/useFirebaseSync';

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const syncStatus = useFirebaseSync(state, dispatch);

  const [newGameOpen, setNewGameOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  // Close swap/menu state on Escape; close modals on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (newGameOpen) { setNewGameOpen(false); return; }
      if (goalsOpen) { setGoalsOpen(false); return; }
      if (state.swapSel) { dispatch({ type: 'SET_SWAP_SEL', swapSel: null }); return; }
      if (state.slotMenuSel) { dispatch({ type: 'SET_SLOT_MENU', slotMenuSel: null }); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [newGameOpen, goalsOpen, state.swapSel, state.slotMenuSel]);

  // Dismiss swapSel when clicking outside bench/swap-target
  useEffect(() => {
    if (!state.swapSel) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Element;
      if (!t.closest('.bench-slot') && !t.closest('.swap-target')) {
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
      if (!t.closest('.swap-btn') && !t.closest('.slot-dropdown')) {
        dispatch({ type: 'SET_SLOT_MENU', slotMenuSel: null });
      }
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [state.slotMenuSel]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {!state.isLoaded && <LoadingOverlay />}
      <Header syncStatus={syncStatus} />
      <div className={`main${state.isLoaded ? ' fade-in' : ''}`}>
        <Sidebar />
        <Content onNewGame={() => setNewGameOpen(true)} />
      </div>
      <StickyFooter onOpenGoals={() => setGoalsOpen(true)} />
      <NewGameModal open={newGameOpen} onClose={() => setNewGameOpen(false)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </AppContext.Provider>
  );
}

export default App;
