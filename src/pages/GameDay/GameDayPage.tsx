import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AppHeader } from '../../components/Shared/AppHeader';
import { GameSubHeader } from '../../components/Shared/GameSubHeader';
import { Content } from '../../components/Content/Content';
import { StickyFooter } from '../../components/Footer/StickyFooter';
import { GoalsModal } from '../../components/Modals/GoalsModal';
import { TeamRosterChecklist } from './TeamRosterChecklist';
import { GameDayStats } from './GameDayStats';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import type { SyncStatus } from '../../types';
import styles from './GameDayPage.module.css';

interface Props {
  syncStatus: SyncStatus;
  user: User;
  onSignOut: () => void;
}

export function GameDayPage({ user, onSignOut }: Props) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [goalsOpen, setGoalsOpen] = useState(false);

  const game = gameId ? getGame(state.games, gameId) : undefined;

  // The URL is the source of truth for "which game" — sync it into the
  // reducer's curGame so the existing curGame-driven components (Content,
  // RotationCard, ...) keep working unchanged.
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

  const playedCount = game.rotations.filter(r => r.played).length;

  return (
    <>
      <AppHeader user={user} onSignOut={onSignOut} />
      <GameSubHeader gameName={game.name} playedCount={playedCount} totalRotations={game.rotations.length} />
      <main className={styles.content}>
        <Content />
        <GameDayStats game={game} />
        <TeamRosterChecklist game={game} />
      </main>
      <StickyFooter onOpenGoals={() => setGoalsOpen(true)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
    </>
  );
}
