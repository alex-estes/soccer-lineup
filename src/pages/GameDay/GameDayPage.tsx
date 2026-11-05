import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { GameHeader } from '../../components/Shared/GameHeader';
import { Content } from '../../components/Content/Content';
import { StickyFooter } from '../../components/Footer/StickyFooter';
import { GoalsModal } from '../../components/Modals/GoalsModal';
import { GameSettingsModal } from '../../components/Modals/GameSettingsModal';
import { TeamRosterChecklist } from './TeamRosterChecklist';
import { GameDayStats } from './GameDayStats';
import { useAppState } from '../../state/AppContext';
import { getGame } from '../../lib/utils';
import { getLiveResult } from '../../lib/stats';
import type { SyncStatus } from '../../types';
import styles from './GameDayPage.module.css';

interface Props {
  syncStatus: SyncStatus;
  user: User;
  onSignOut: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Props kept for the route element's type; GameDayPage no longer needs any of them.
export function GameDayPage(_props: Props) {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const game = gameId ? getGame(state.games, gameId) : undefined;

  // The URL is the source of truth for "which game" — sync it into the
  // reducer's curGame so the existing curGame-driven components (Content,
  // RotationCard, ...) keep working unchanged.
  // Waits for the games to arrive before deciding the id is bad, or a reload / deep link
  // would always bounce home.
  useEffect(() => {
    if (!gameId || !state.isLoaded) return;
    if (!getGame(state.games, gameId)) { navigate('/', { replace: true }); return; }
    if (state.curGame !== gameId) dispatch({ type: 'SET_CUR_GAME', id: gameId });
  }, [gameId, state.games, state.curGame, state.isLoaded, dispatch, navigate]);

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
      <GameHeader
        gameName={game.name}
        completed={game.completed}
        {...getLiveResult(state, game.id)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className={styles.content}>
        <Content />
        <GameDayStats game={game} />
        <TeamRosterChecklist game={game} />
      </main>
      <StickyFooter onOpenGoals={() => setGoalsOpen(true)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <GameSettingsModal
        key={settingsOpen ? 'open' : 'closed'}
        open={settingsOpen}
        game={game}
        sport={state.team.sport}
        teamSettings={state.settings}
        onClose={() => setSettingsOpen(false)}
        onConfirm={(positions, rotationCount) => {
          dispatch({ type: 'UPDATE_GAME_SETUP', gameId: game.id, positions, rotationCount });
          setSettingsOpen(false);
        }}
      />
    </>
  );
}
