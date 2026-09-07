import { useState } from 'react';
import { IconUsersGroup, IconChevronUp, IconChevronDown, IconUser, IconSquare, IconSquareCheckFilled } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { Chip } from '../../components/Shared/Chip';
import type { Game } from '../../types';
import styles from './TeamRosterChecklist.module.css';

interface Props {
  game: Game;
}

export function TeamRosterChecklist({ game }: Props) {
  const { state, dispatch } = useAppState();
  const [open, setOpen] = useState(true);

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div className={styles.title}>
          <IconUsersGroup size={24} />
          <span>TEAM</span>
          <Chip tone="neutral">{state.players.length} PLAYERS</Chip>
        </div>
        <button
          type="button"
          className={styles.check}
          style={{ color: 'var(--neutral-300)' }}
          onClick={() => setOpen(o => !o)}
          title={open ? 'Collapse' : 'Expand'}
        >
          {open ? <IconChevronUp size={24} /> : <IconChevronDown size={24} />}
        </button>
      </div>
      {open && (
        <div className={styles.list}>
          {state.players.map(p => {
            const excluded = game.excludedPlayers.includes(p.name);
            return (
              <div className={styles.row} key={p.name}>
                <IconUser size={24} className={[styles.icon, excluded ? styles.dim : ''].filter(Boolean).join(' ')} />
                <span className={[styles.name, excluded ? styles.dim : ''].filter(Boolean).join(' ')}>{p.name}</span>
                <button
                  type="button"
                  className={[styles.check, excluded ? styles.dim : ''].filter(Boolean).join(' ')}
                  onClick={() => dispatch({ type: 'TOGGLE_GAME_PLAYER_EXCLUDED', gameId: game.id, playerName: p.name })}
                  title={excluded ? 'Include for this game' : 'Exclude from this game'}
                >
                  {excluded ? <IconSquare size={24} /> : <IconSquareCheckFilled size={24} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
