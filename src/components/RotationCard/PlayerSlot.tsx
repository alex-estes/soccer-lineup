import { useRef, useState } from 'react';
import { IconLock, IconLockOpen, IconReplace } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { SlotDropdown } from './SlotDropdown';
import { getGame } from '../../lib/utils';
import type { Position, DragSource } from '../../types';
import styles from './PlayerSlot.module.css';

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
  const [dragTarget, setDragTarget] = useState(false);

  const swapSel = state.swapSel;
  const slotMenuSel = state.slotMenuSel;
  const isSwapTarget = !!(swapSel && swapSel.rIdx === rIdx && !isPlayed && !locked);
  const isMenuOpen = !!(slotMenuSel && slotMenuSel.rIdx === rIdx && slotMenuSel.pos === pos && slotMenuSel.sIdx === sIdx);

  const filled = !!playerName;
  const classes = [
    styles.slot,
    !filled ? styles.empty : '',
    isSwapTarget ? styles.swapTarget : '',
    dragTarget ? styles.dragTarget : '',
  ].filter(Boolean).join(' ');

  function handleDragStart(e: React.DragEvent) {
    if (locked || isPlayed) { e.preventDefault(); return; }
    dragRef.current = { type: 'slot', rIdx, pos, sIdx, playerName: playerName! };
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragTarget(true);
  }

  function handleDragLeave() {
    setDragTarget(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragTarget(false);
    if (!dragRef.current) return;
    dispatch({ type: 'DROP_PLAYER', drag: dragRef.current, target: { type: 'slot', rIdx, pos, sIdx } });
    dragRef.current = null;
  }

  function handleSwapTargetClick(e: React.MouseEvent) {
    if (!isSwapTarget || !swapSel) return;
    e.stopPropagation();
    const game = getGame(state.games, state.curGame);
    const rot = game?.rotations[rIdx];
    if (!game || !rot) return;
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
      gameId: state.curGame,
      rotations: game.rotations.map((r, i) => i === rIdx ? newRot : r),
    });
    dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
  }

  return (
    <div
      ref={slotRef}
      data-swap-target={isSwapTarget ? '' : undefined}
      className={classes}
      onClick={isSwapTarget ? handleSwapTargetClick : undefined}
      onDragOver={!isPlayed ? handleDragOver : undefined}
      onDragLeave={!isPlayed ? handleDragLeave : undefined}
      onDrop={!isPlayed ? handleDrop : undefined}
    >
      {playerName ? (
        <div className={styles.inner} draggable={!isPlayed && !locked} onDragStart={handleDragStart}>
          <button
            type="button"
            className={[styles.iconBtn, locked ? styles.locked : ''].filter(Boolean).join(' ')}
            title={locked ? 'Unlock slot' : 'Lock slot'}
            onClick={e => {
              e.stopPropagation();
              dispatch({ type: 'TOGGLE_LOCK', gameId: state.curGame, rotIndex: rIdx, pos, slotIndex: sIdx });
            }}
          >
            {locked ? <IconLock size={24} /> : <IconLockOpen size={24} />}
          </button>
          <span className={styles.name}>{playerName}</span>
          {!isPlayed && !locked && (
            <div className={styles.menuWrap}>
              <button
                type="button"
                data-swap-btn
                className={[styles.iconBtn, isMenuOpen ? styles.active : ''].filter(Boolean).join(' ')}
                title="Swap player"
                onClick={e => {
                  e.stopPropagation();
                  dispatch({
                    type: 'SET_SLOT_MENU',
                    slotMenuSel: isMenuOpen ? null : { rIdx, pos, sIdx },
                  });
                }}
              >
                <IconReplace size={24} />
              </button>
              {isMenuOpen && (
                <SlotDropdown
                  rIdx={rIdx}
                  pos={pos}
                  sIdx={sIdx}
                  playerName={playerName}
                  opensUp={pos !== 'def'}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <span className={styles.emptyLabel}>Empty Slot</span>
      )}
    </div>
  );
}
