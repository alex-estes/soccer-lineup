import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { RotationList } from './RotationList';
import { useAppState } from '../../state/AppContext';
import { getUnfilledCount } from '../../lib/stats';
import { getGame } from '../../lib/utils';

export function Content() {
  const { state } = useAppState();

  const rots = getGame(state.games, state.curGame)?.rotations ?? [];
  const playedCount = rots.filter(r => r.played).length;
  const rotLabel = playedCount === rots.length
    ? 'Game Complete'
    : `Rotation ${playedCount + 1} of ${rots.length}`;

  const unfilled = useMemo(() => getUnfilledCount(state), [state.games, state.curGame]);

  return (
    <main className="content">
      <div className="content-header">
        <Link to="/">&larr; Back</Link>
        <h2>Rotation Schedule</h2>
        <span className="rotation-label">{rotLabel}</span>
      </div>
      {unfilled > 0 && (
        <div className="notice">
          {unfilled} slot{unfilled !== 1 ? 's' : ''} unfilled in unplayed rotations. Hit Auto-Generate or drag players into position.
        </div>
      )}
      <RotationList />
    </main>
  );
}
