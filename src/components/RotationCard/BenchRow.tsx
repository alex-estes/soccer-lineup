import { useAppState } from '../../state/AppContext';
import { activePlayers } from '../../lib/utils';
import { POSITIONS } from '../../constants';
import type { DragSource } from '../../types';

interface Props {
  rIdx: number;
  isPlayed: boolean;
  dragRef: React.MutableRefObject<DragSource | null>;
}

export function BenchRow({ rIdx, isPlayed, dragRef }: Props) {
  const { state, dispatch } = useAppState();
  const rot = state.games[state.curGame]?.rotations[rIdx];

  if (!rot) return null;

  const onField = new Set<string>();
  POSITIONS.forEach(pos => rot[pos].forEach(p => { if (p) onField.add(p); }));

  const benchNames = rot.bench;
  const available = activePlayers(state.players).filter(p => !onField.has(p) && !benchNames.includes(p));
  const displayedSlots = [...benchNames, ...available];

  const swapSel = state.swapSel;

  return (
    <div className="bench-row">
      <span className="bench-label">Bench</span>
      <div className="bench-slots">
        {displayedSlots.map(p => {
          const isFilled = benchNames.includes(p);
          const isSelected = !!(swapSel && swapSel.rIdx === rIdx && swapSel.playerName === p);
          const className = [
            'bench-slot',
            isFilled ? 'filled' : '',
            isSelected ? 'swap-selected' : '',
          ].filter(Boolean).join(' ');

          return (
            <div
              key={p}
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
              onDragOver={!isPlayed ? e => { e.preventDefault(); e.currentTarget.classList.add('drag-target'); } : undefined}
              onDragLeave={!isPlayed ? e => { e.currentTarget.classList.remove('drag-target'); } : undefined}
              onDrop={!isPlayed ? e => {
                e.preventDefault();
                e.currentTarget.classList.remove('drag-target');
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
