export interface Settings {
  blockShortcuts: boolean; // preventDefault on key combos + Keyboard Lock
  blockContextMenu: boolean;
  blockGestures: boolean; // pinch-zoom, swipe nav, text selection
  sound: boolean;
  exitPresses: number; // consecutive Esc presses required to quit
}

export const DEFAULT_SETTINGS: Settings = {
  blockShortcuts: true,
  blockContextMenu: true,
  blockGestures: true,
  sound: true,
  exitPresses: 3,
};

export interface Stats {
  totalKeys: number;
  totalSessions: number;
  bestSession: number;
  longestSeconds: number;
}

export const EMPTY_STATS: Stats = {
  totalKeys: 0,
  totalSessions: 0,
  bestSession: 0,
  longestSeconds: 0,
};
