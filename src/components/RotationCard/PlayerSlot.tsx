import { IconLock, IconLockOpen, IconReplace } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { Chip } from '../Shared/Chip';
import { levelOf, POSITION_SKILL, skillLetter } from '../../lib/skills';
import type { Position } from '../../types';
import styles from './PlayerSlot.module.css';

interface Props {
  rIdx: number;
  pos: Position;
  sIdx: number;
  playerName: string | null;
  locked: boolean;
  isPlayed: boolean;
}

export function PlayerSlot({ rIdx, pos, sIdx, playerName, locked, isPlayed }: Props) {
  const { state, dispatch } = useAppState();

  const swapSel = state.swapSel;
  const isSelected = !!(swapSel && swapSel.type === 'slot' && swapSel.rIdx === rIdx && swapSel.pos === pos && swapSel.sIdx === sIdx);
  const isSwapTarget = !!(swapSel && swapSel.rIdx === rIdx && !isPlayed && !locked && !isSelected);

  const filled = !!playerName;
  const classes = [
    styles.slot,
    !filled ? styles.empty : '',
    isSwapTarget ? styles.swapTarget : '',
    isSelected ? styles.selected : '',
  ].filter(Boolean).join(' ');

  function moveHere() {
    if (!swapSel) return;
    dispatch({ type: 'MOVE_PLAYER', drag: swapSel, target: { type: 'slot', rIdx, pos, sIdx } });
    dispatch({ type: 'SET_SWAP_SEL', swapSel: null });
  }

  function handleSwapBtnClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isSwapTarget) { moveHere(); return; }
    dispatch({
      type: 'SET_SWAP_SEL',
      swapSel: isSelected ? null : { type: 'slot', rIdx, pos, sIdx, playerName: playerName! },
    });
  }

  return (
    <div
      data-swap-target={isSwapTarget ? '' : undefined}
      className={classes}
      onClick={isSwapTarget ? e => { e.stopPropagation(); moveHere(); } : undefined}
    >
      {playerName ? (
        <div className={styles.inner}>
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
          <div className={styles.nameGroup}>
            <span className={styles.name}>{playerName}</span>
            {state.settings.useSkillRatings && (
              <Chip tone="neutral" size="sm">
                {skillLetter(levelOf(state.players, playerName, POSITION_SKILL[pos]))}
              </Chip>
            )}
          </div>
          {!isPlayed && !locked && (
            <button
              type="button"
              data-swap-btn
              className={[styles.iconBtn, isSelected ? styles.active : ''].filter(Boolean).join(' ')}
              title={isSwapTarget ? 'Move here' : 'Move player'}
              onClick={handleSwapBtnClick}
            >
              <IconReplace size={24} />
            </button>
          )}
        </div>
      ) : (
        <span className={styles.emptyLabel}>Empty Slot</span>
      )}
    </div>
  );
}
