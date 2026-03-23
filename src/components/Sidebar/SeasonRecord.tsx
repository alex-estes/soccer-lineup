import { useMemo } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { useAppState } from '../../state/AppContext';
import { getSeasonRecord, getTeamScore, getGameResult } from '../../lib/stats';

export function SeasonRecord() {
  const { state } = useAppState();

  const record = useMemo(() => getSeasonRecord(state), [state.games, state.goals, state.players]);

  const completedGames = useMemo(() =>
    state.games.filter(g => g.completed).map((g, _) => {
      const gIdx = state.games.indexOf(g);
      const us = getTeamScore(state, gIdx);
      const them = g.opponentScore || 0;
      const result = getGameResult(state, gIdx);
      return { name: g.name, us, them, result };
    }),
    [state.games, state.goals, state.players]
  );

  return (
    <div className="sidebar-section">
      <h3><IconTrophy size={13} /> Season Record</h3>
      <div className="season-record">
        <div className="record-chip wins">
          <span className="record-num">{record.wins}</span>
          <span className="record-lbl">Wins</span>
        </div>
        <div className="record-chip losses">
          <span className="record-num">{record.losses}</span>
          <span className="record-lbl">Losses</span>
        </div>
        <div className="record-chip ties">
          <span className="record-num">{record.ties}</span>
          <span className="record-lbl">Ties</span>
        </div>
      </div>
      <div className="game-results">
        {completedGames.length === 0 ? (
          <div className="empty-state">
            <IconTrophy size={28} />
            <p><strong>No games completed yet</strong>Complete a game to see your record</p>
          </div>
        ) : (
          completedGames.map((g, i) => (
            <div className="game-result-row" key={i}>
              <span className="gr-name">{g.name}</span>
              <span className="gr-score">{g.us}–{g.them}</span>
              <span className={`gr-badge ${g.result}`}>{g.result}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
