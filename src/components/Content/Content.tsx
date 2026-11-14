import { useState } from 'react';
import { IconRotateClockwise2, IconWand } from '@tabler/icons-react';
import { RotationList } from './RotationList';
import { useAppState } from '../../state/AppContext';
import { autoGenerateAction } from '../../state/reducer';
import { availablePlayersForGame, getGame } from '../../lib/utils';
import { Button } from '../Shared/Button';
import { NoticeDialog } from '../Shared/NoticeDialog';
import { playersOnField } from '../../constants';
import styles from './Content.module.css';

export function Content() {
  const { state, dispatch } = useAppState();
  const [notice, setNotice] = useState<string | null>(null);

  function handleGenerate() {
    const game = getGame(state.games, state.curGame);
    if (!game) return;
    const needed = playersOnField(game.positions);
    const available = availablePlayersForGame(state.players, game).length;
    if (available < needed) {
      setNotice(`This lineup needs ${needed} players on the field, but only ${available} ${available === 1 ? 'is' : 'are'} available for this game.`);
      return;
    }
    dispatch(autoGenerateAction(state));
  }

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <div className={styles.title}>
          <IconRotateClockwise2 size={24} />
          <span>ROTATIONS</span>
        </div>
        <Button variant="secondary" onClick={handleGenerate} title="Generate lineup">
          <IconWand size={24} /> Generate
        </Button>
      </div>
      <RotationList />
      <NoticeDialog
        open={notice !== null}
        title="NOT ENOUGH PLAYERS"
        message={notice ?? ''}
        onClose={() => setNotice(null)}
      />
    </section>
  );
}
