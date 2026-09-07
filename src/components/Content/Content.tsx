import { IconRotateClockwise2, IconWand } from '@tabler/icons-react';
import { RotationList } from './RotationList';
import { useAppState } from '../../state/AppContext';
import { autoGenerateAction } from '../../state/reducer';
import { availablePlayersForGame, getGame } from '../../lib/utils';
import { IconButton } from '../Shared/IconButton';
import styles from './Content.module.css';

export function Content() {
  const { state, dispatch } = useAppState();

  function handleGenerate() {
    const game = getGame(state.games, state.curGame);
    if (!game) return;
    if (availablePlayersForGame(state.players, game).length < game.formation.playersOnField) {
      alert(`Need at least ${game.formation.playersOnField} available players.`);
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
        <IconButton variant="outline" icon={<IconWand size={24} />} title="Generate lineup" onClick={handleGenerate} />
      </div>
      <RotationList />
    </section>
  );
}
