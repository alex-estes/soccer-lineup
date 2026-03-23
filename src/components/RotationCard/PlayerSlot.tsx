import { useRef } from 'react';
import { IconLock, IconLockOpen, IconReplaceUser } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { SlotDropdown } from './SlotDropdown';
import type { Position, DragSource } from '../../types';

interface Props {
  rIdx: number;
  pos: Position;
  sIdx: number;
  playerName: string | null;
  locked: boolean;
  isPlayed: boolean;
  dragRef: React.MutableRefObject<DragSource | null>;
}

export function PlayerSlot({ rIdx, pos, sIdx, playerName, locked, isPlayed, dragRef }: Props) {
  const { state, dispatch } = useAppState();
  const slotRef = useRef<HTMLDivElement>(null);

  const swapSel = state.swapSel;
  const slotMenuSel = state.slotMenuSel;
  const isSwapTarget = !!(swapSel && swapSel.rIdx === rIdx && !isPlayed && !locked);
  const isMenuOpen = !!(slotMenuSel && slotMenuSel.rIdx === rIdx && slotMenuSel.pos === pos && slotMenuSel.sIdx === sIdx);

  const filled = !!playerName;
  const classes = [
    'slot', pos,
    filled ? 'filled' : '',
    locked ? 'locked' : '',
    isSwapTarget ? 'swap-target' : '',
  ].filter(Boolean).join(' ');

  function handleDragStart(e: React.DragEvent) {
    if (locked || isPlayed) { e.preventDefault(); return; }
    dragRef.current = { type: 'slot', rIdx, pos, sIdx, playerName: playerName! };
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    slotRef.current?.classList.add('drag-target');
  }

  function handleDragLeave() {
    slotRef.current?.classList.remove('drag-target');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    slotRef.current?.classList.remove('drag-target');
    if (!dragRef.current) return;
    dispatch({ type: 'DROP_PLAYER', drag: dragRef.current, target: { type: 'slot', rIdx, pos, sIdx } });
    dragRef.current = null;
  }

  function handleSwapTargetClick(e: React.MouseEvent) {
    if (!isSwapTarget || !swapSel) return;
    e.stopPropagation();
    const rot = state.games[state.curGame]?.rotations[rIdx];
    if (!rot) return;
    const benchName = swapSel.playerName;
    const fieldName = rot[pos][sIdx];
    const newRot = {
      ...rot,
      [pos]: rot[pos].map((p, i) => i === sIdx ? benchName : p),
      bench: [
        ...rot.bench.filter(p => p !== benchName),
        ...(fieldName && !rot.locked[pos][sIdx] ? [fieldName] : []),
      ],
    };
    dispatch({
      type: 'SET_LINEUP',
      gameIndex: state.curGame,
      rotations: state.games[state.curGame].rotations.map((r, i) => i === rIdx ? newRot : r),
    });
    dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
  }

  return (
    <div
      ref={slotRef}
      className={classes}
      onClick={isSwapTarget ? handleSwapTargetClick : undefined}
      onDragOver={!isPlayed ? handleDragOver : undefined}
      onDragLeave={!isPlayed ? handleDragLeave : undefined}
      onDrop={!isPlayed ? handleDrop : undefined}
    >
      {playerName ? (
        <div
          className="slot-inner"
          draggable={!isPlayed && !locked}
          onDragStart={handleDragStart}
        >
          <button
            className="lock-btn"
            title={locked ? 'Unlock slot' : 'Lock slot'}
            onClick={e => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_LOCK', gameIndex: state.curGame, rotIndex: rIdx, pos, slotIndex: sIdx });
            }}
          >
            {locked ? <IconLock size={12} /> : <IconLockOpen size={12} />}
          </button>
          <span className="slot-name">{playerName}</span>
          {!isPlayed && !locked && (
            <button
              className={`swap-btn${isMenuOpen ? ' active' : ''}`}
              title="Swap player"
              onClick={e => {
                e.stopPropagation();
                dispatch({
                  type: 'SET_SLOT_MENU',
                  slotMenuSel: isMenuOpen ? null : { rIdx, pos, sIdx },
                });
              }}
            >
              <IconReplaceUser size={14} />
            </button>
          )}
          {isMenuOpen && !isPlayed && (
            <SlotDropdown
              rIdx={rIdx}
              pos={pos}
              sIdx={sIdx}
              playerName={playerName}
              opensUp={pos !== 'def'}
            />
          )}
        </div>
      ) : (
        <span className="slot-empty">Drop here</span>
      )}
    </div>
  );
}
