import { createContext, useContext } from 'react';
import type { TeamSnapshot } from './teamDoc';

interface TeamSwitcherValue {
  /** Every team this coach belongs to, including the open one. */
  teams: TeamSnapshot[];
  activeId: string | null;
  onSelect: (teamId: string) => void;
}

export const TeamSwitcherContext = createContext<TeamSwitcherValue | null>(null);

/** Null outside the signed-in app (nothing to switch between). */
export function useTeamSwitcher(): TeamSwitcherValue | null {
  return useContext(TeamSwitcherContext);
}
