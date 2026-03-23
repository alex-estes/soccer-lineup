import { createContext, useContext } from 'react';
import type { Dispatch } from 'react';
import type { AppState } from '../types';
import type { Action } from './reducer';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppContext.Provider');
  return ctx;
}
