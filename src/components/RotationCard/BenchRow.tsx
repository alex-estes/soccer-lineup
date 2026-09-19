import { IconArmchair } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { availablePlayersForGame, getGame } from '../../lib/utils';
import { POSITIONS } from '../../constants';
import styles from './BenchRow.module.css';

interface Props {
  rIdx: number;
  isPlayed: boolean;
}

export function BenchRow({ rIdx, isPlayed }: Props) {
  const { state, dispatch } = useAppState();
  const game = getGame(state.games, state.curGame);
  const rot = game?.rotations[rIdx];

  if (!rot || !game) return null;

  const onField = new Set<string>();
  POSITIONS.forEach(pos => rot[pos].forEach(p => { if (p) onField.add(p); }));

  const benchNames = rot.bench;
  const available = availablePlayersForGame(state.players, game).filter(p => !onField.has(p) && !benchNames.includes(p));
  const displayedSlots = [...benchNames, ...available];

  const swapSel = state.swapSel;
  // A field player is selected in this rotation, so tapping a bench player swaps them.
  const fieldSel = swapSel && swapSel.type === 'slot' && swapSel.rIdx === rIdx && !isPlayed ? swapSel : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <IconArmchair size={24} />
        <span>BENCH</span>
      </div>
      <div className={styles.chips}>
        {displayedSlots.map(p => {
          const isFilled = benchNames.includes(p);
          const isSelected = !!(swapSel && swapSel.type === 'bench' && swapSel.rIdx === rIdx && swapSel.playerName === p);
          const isSwapTarget = isFilled && !!fieldSel;
          const className = [
            styles.chip,
            isFilled && !isPlayed ? styles.selectable : '',
            isSelected ? styles.selected : '',
            isSwapTarget ? styles.swapTarget : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={p}
              data-bench-slot
              className={className}
              onClick={isFilled && !isPlayed ? () => {
                if (fieldSel) {
                  dispatch({
                    type: 'MOVE_PLAYER',
                    drag: { type: 'bench', rIdx, playerName: p },
                    target: { type: 'slot', rIdx, pos: fieldSel.pos, sIdx: fieldSel.sIdx },
                  });
                  dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
                } else {
                  dispatch({ type: 'SET_SWAP_SEL', swapSel: isSelected ? null : { type: 'bench', rIdx, playerName: p } });
                }
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
