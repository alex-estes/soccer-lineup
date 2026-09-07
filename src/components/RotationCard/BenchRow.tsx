import { useState } from 'react';
import { IconArmchair } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { availablePlayersForGame, getGame } from '../../lib/utils';
import { POSITIONS } from '../../constants';
import type { DragSource } from '../../types';
import styles from './BenchRow.module.css';

interface Props {
  rIdx: number;
  isPlayed: boolean;
  dragRef: React.MutableRefObject<DragSource | null>;
}

export function BenchRow({ rIdx, isPlayed, dragRef }: Props) {
  const { state, dispatch } = useAppState();
  const game = getGame(state.games, state.curGame);
  const rot = game?.rotations[rIdx];
  const [dragTargetName, setDragTargetName] = useState<string | null>(null);

  if (!rot || !game) return null;

  const onField = new Set<string>();
  POSITIONS.forEach(pos => rot[pos].forEach(p => { if (p) onField.add(p); }));

  const benchNames = rot.bench;
  const available = availablePlayersForGame(state.players, game).filter(p => !onField.has(p) && !benchNames.includes(p));
  const displayedSlots = [...benchNames, ...available];

  const swapSel = state.swapSel;

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <IconArmchair size={24} />
        <span>BENCH</span>
      </div>
      <div className={styles.chips}>
        {displayedSlots.map(p => {
          const isFilled = benchNames.includes(p);
          const isSelected = !!(swapSel && swapSel.rIdx === rIdx && swapSel.playerName === p);
          const className = [
            styles.chip,
            isFilled && !isPlayed ? styles.selectable : '',
            isSelected ? styles.selected : '',
            dragTargetName === p ? styles.dragTarget : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={p}
              data-bench-slot
              className={className}
              draggable={isFilled && !isPlayed}
              onDragStart={isFilled && !isPlayed ? e => {
                dragRef.current = { type: 'bench', rIdx, playerName: p };
                e.dataTransfer.effectAllowed = 'move';
              } : undefined}
              onClick={isFilled && !isPlayed ? () => {
                if (swapSel && swapSel.rIdx === rIdx && swapSel.playerName === p) {
                  dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
                } else {
                  dispatch({ type: 'SET_SWAP_SEL', swapSel: { rIdx, playerName: p } });
                }
              } : undefined}
              onDragOver={!isPlayed ? e => { e.preventDefault(); setDragTargetName(p); } : undefined}
              onDragLeave={!isPlayed ? () => setDragTargetName(null) : undefined}
              onDrop={!isPlayed ? e => {
                e.preventDefault();
                setDragTargetName(null);
                if (!dragRef.current) return;
                dispatch({ type: 'DROP_PLAYER', drag: dragRef.current, target: { type: 'bench', rIdx } });
                dragRef.current = null;
              } : undefined}
            >
              {p}
            </div>
          );
        })}
      </div>
    </div>
  );
}
