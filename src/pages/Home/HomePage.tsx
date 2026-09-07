import { useState } from 'react';
import {
  IconChartArcs, IconSitemap, IconChartBar, IconUsersGroup,
  IconPlus, IconCirclePlus, IconPencil,
} from '@tabler/icons-react';
import type { User } from 'firebase/auth';
import { useAppState } from '../../state/AppContext';
import { getSeasonRecord, getTeamScore, getGameResult, getCumulativeStats } from '../../lib/stats';
import { POSITIONS } from '../../constants';
import { AppHeader } from '../../components/Shared/AppHeader';
import { StatTile } from '../../components/Shared/StatTile';
import { GameCard } from '../../components/Shared/GameCard';
import { RosterCard } from '../../components/Shared/RosterCard';
import { PlayerStatsTable } from '../../components/Shared/PlayerStatsTable';
import { IconButton } from '../../components/Shared/IconButton';
import { Chip } from '../../components/Shared/Chip';
import { FormModal } from '../../components/Shared/FormModal';
import type { SyncStatus } from '../../types';
import styles from './HomePage.module.css';

interface Props {
  syncStatus: SyncStatus;
  user: User;
  onSignOut: () => void;
}

type GameModal = { mode: 'add' } | { mode: 'rename'; gameId: string; name: string } | null;
type PlayerModal = { mode: 'add' } | { mode: 'rename'; index: number; name: string } | null;

export function HomePage({ user, onSignOut }: Props) {
  const { state, dispatch } = useAppState();
  const [gameModal, setGameModal] = useState<GameModal>(null);
  const [playerModal, setPlayerModal] = useState<PlayerModal>(null);

  const record = getSeasonRecord(state);
  const cumulativeStats = getCumulativeStats(state);

  function handleDeleteGame(gameId: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    dispatch({ type: 'DELETE_GAME', gameId });
  }

  function handleDeletePlayer(index: number) {
    const player = state.players[index];
    if (!player) return;
    const hasHistory = state.games.some(g =>
      g.completed && g.rotations.some(r => POSITIONS.some(pos => r[pos].includes(player.name)))
    );
    if (hasHistory && !confirm(`${player.name} has played in completed games. Their stats will be removed. Delete anyway?`)) return;
    dispatch({ type: 'REMOVE_PLAYER', index });
  }

  function handleGameConfirm(name: string) {
    if (gameModal?.mode === 'add') dispatch({ type: 'ADD_GAME', name });
    else if (gameModal?.mode === 'rename') dispatch({ type: 'RENAME_GAME', gameId: gameModal.gameId, name });
    setGameModal(null);
  }

  function handlePlayerConfirm(name: string) {
    if (playerModal?.mode === 'add') dispatch({ type: 'ADD_PLAYER', name });
    else if (playerModal?.mode === 'rename') dispatch({ type: 'RENAME_PLAYER', index: playerModal.index, newName: name });
    setPlayerModal(null);
  }

  return (
    <>
      <AppHeader user={user} onSignOut={onSignOut} />
      <main className={styles.content}>
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconChartArcs size={24} />
            <span>TEAM STATS</span>
          </div>
          <div className={styles.statsRow}>
            <StatTile tone="win" value={record.wins} label="WINS" />
            <StatTile tone="loss" value={record.losses} label="LOSSES" />
            <StatTile tone="tie" value={record.ties} label="TIES" />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionTitle}>
              <IconSitemap size={24} />
              <span>GAMES</span>
            </div>
            <IconButton variant="outline" icon={<IconPlus size={24} />} onClick={() => setGameModal({ mode: 'add' })} title="Add game" />
          </div>
          <div className={styles.list}>
            {state.games.length === 0 ? (
              <div className={styles.emptyState}>No games yet</div>
            ) : (
              state.games.map(g => (
                <GameCard
                  key={g.id}
                  game={g}
                  result={getGameResult(state, g.id)}
                  teamScore={getTeamScore(state, g.id)}
                  onRename={() => setGameModal({ mode: 'rename', gameId: g.id, name: g.name })}
                  onDelete={() => handleDeleteGame(g.id, g.name)}
                />
              ))
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <IconChartBar size={24} />
            <span>PLAYER STATS</span>
          </div>
          <PlayerStatsTable players={state.players} stats={cumulativeStats} />
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionTitle}>
              <IconUsersGroup size={24} />
              <span>ROSTER</span>
              <Chip tone="neutral">{state.players.length} PLAYERS</Chip>
            </div>
            <IconButton variant="outline" icon={<IconPlus size={24} />} onClick={() => setPlayerModal({ mode: 'add' })} title="Add player" />
          </div>
          <div className={styles.list}>
            {state.players.length === 0 ? (
              <div className={styles.emptyState}>No players yet</div>
            ) : (
              state.players.map((p, i) => (
                <RosterCard
                  key={p.name}
                  player={p}
                  onRename={() => setPlayerModal({ mode: 'rename', index: i, name: p.name })}
                  onDelete={() => handleDeletePlayer(i)}
                  onToggleActive={() => dispatch({ type: 'TOGGLE_ACTIVE', index: i })}
                />
              ))
            )}
          </div>
        </section>
      </main>

      <FormModal
        key={gameModal ? (gameModal.mode === 'rename' ? `game-rename-${gameModal.gameId}` : 'game-add') : 'game-closed'}
        open={gameModal !== null}
        onClose={() => setGameModal(null)}
        icon={gameModal?.mode === 'rename' ? <IconPencil size={24} /> : <IconCirclePlus size={24} />}
        title={gameModal?.mode === 'rename' ? 'RENAME GAME' : 'ADD GAME'}
        bodyText="Enter the Opposing Team's Name"
        placeholder="Team Name"
        initialValue={gameModal?.mode === 'rename' ? gameModal.name : ''}
        confirmLabel={gameModal?.mode === 'rename' ? 'Rename' : 'Create Game'}
        onConfirm={handleGameConfirm}
      />

      <FormModal
        key={playerModal ? (playerModal.mode === 'rename' ? `player-rename-${playerModal.index}` : 'player-add') : 'player-closed'}
        open={playerModal !== null}
        onClose={() => setPlayerModal(null)}
        icon={playerModal?.mode === 'rename' ? <IconPencil size={24} /> : <IconCirclePlus size={24} />}
        title={playerModal?.mode === 'rename' ? 'RENAME PLAYER' : 'ADD PLAYER'}
        bodyText="Enter the Player's Name"
        placeholder="Player Name"
        initialValue={playerModal?.mode === 'rename' ? playerModal.name : ''}
        confirmLabel={playerModal?.mode === 'rename' ? 'Rename' : 'Add Player'}
        onConfirm={handlePlayerConfirm}
      />
    </>
  );
}
