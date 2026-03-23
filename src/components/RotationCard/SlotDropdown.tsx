import { POSITIONS, POS_COLORS, POS_LABELS } from '../../constants';
import { useAppState } from '../../state/AppContext';
import type { Position } from '../../types';

interface Props {
  rIdx: number;
  pos: Position;
  sIdx: number;
  playerName: string;
  opensUp: boolean;
}

export function SlotDropdown({ rIdx, pos, sIdx, playerName, opensUp }: Props) {
  const { state, dispatch } = useAppState();
  const rot = state.games[state.curGame]?.rotations[rIdx];
  if (!rot) return null;

  const options: { tPos: Position; tIdx: number; tName: string }[] = [];
  POSITIONS.forEach(tPos => {
    if (tPos === pos) return;
    rot[tPos].forEach((tName, tIdx) => {
      if (!tName || rot.locked[tPos][tIdx]) return;
      options.push({ tPos, tIdx, tName });
    });
  });

  if (options.length === 0) return null;

  function doSwap(tPos: Position, tIdx: number) {
    dispatch({
      type: 'DROP_PLAYER',
      drag: { type: 'slot', rIdx, pos, sIdx, playerName },
      target: { type: 'slot', rIdx, pos: tPos, sIdx: tIdx },
    });
    dispatch({ type: 'SET_SLOT_MENU', slotMenuSel: null });
  }

  return (
    <div className={`slot-dropdown ${opensUp ? 'opens-up' : 'opens-down'}`}>
      {options.map(({ tPos, tIdx, tName }) => (
        <div
          key={`${tPos}-${tIdx}`}
          className="swap-option"
          onClick={e => { e.stopPropagation(); doSwap(tPos, tIdx); }}
        >
          <div className="swap-pos-dot" style={{ background: POS_COLORS[tPos] }} />
          <span>{tName}</span>
          <span className="swap-pos-label">{POS_LABELS[tPos].slice(0, -1)}</span>
        </div>
      ))}
    </div>
  );
}
