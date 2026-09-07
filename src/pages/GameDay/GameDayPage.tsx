import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { Header } from '../../components/Header/Header';
import { Content } from '../../components/Content/Content';
import { StickyFooter } from '../../components/Footer/StickyFooter';
import { GoalsModal } from '../../components/Modals/GoalsModal';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import type { SyncStatus } from '../../types';

interface Props {
  syncStatus: SyncStatus;
  user: User;
  onSignOut: () => void;
}

// Phase 2 routing skeleton — functional, not yet styled to the Figma Game
// Day design (rotation-card paging polish, formation-edit entry point,
// team checklist land in a later pass).
export function GameDayPage({ syncStatus, user, onSignOut }: Props) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [goalsOpen, setGoalsOpen] = useState(false);

  const game = gameId ? getGame(state.games, gameId) : undefined;

  // The URL is the source of truth for "which game" — sync it into the
  // reducer's curGame so the existing curGame-driven components (Header,
  // Content, RotationCard, ...) keep working unchanged during this phase.
  useEffect(() => {
    if (!gameId) return;
    if (!getGame(state.games, gameId)) { navigate('/', { replace: true }); return; }
    if (state.curGame !== gameId) dispatch({ type: 'SET_CUR_GAME', id: gameId });
  }, [gameId, state.games, state.curGame, dispatch, navigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && goalsOpen) setGoalsOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goalsOpen]);

  if (!game) return null;

  return (
    <>
      <Header syncStatus={syncStatus} user={user} onSignOut={onSignOut} />
      <div className={`main${state.isLoaded ? ' fade-in' : ''}`}>
        <Content />
      </div>
      <StickyFooter onOpenGoals={() => setGoalsOpen(true)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </>
  );
}
