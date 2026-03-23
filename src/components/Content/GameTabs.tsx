import { useAppState } from '../../state/AppContext';

interface Props {
  onNewGame: () => void;
}

export function GameTabs({ onNewGame }: Props) {
  const { state, dispatch } = useAppState();

  return (
    <div className="game-tabs">
      {state.games.map((g, i) => (
        <button
          key={i}
          className={`game-tab${i === state.curGame ? ' active' : ''}`}
          onClick={() => dispatch({ type: 'SET_CUR_GAME', index: i })}
        >
          {g.name}
        </button>
      ))}
      <button className="btn-new-game" onClick={onNewGame}>
        + New Game
      </button>
    </div>
  );
}
