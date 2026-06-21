import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import { Stage, type StageHandle } from './Stage';
import { useMashSession } from './useMashSession';
import { DEFAULT_SETTINGS, EMPTY_STATS, type Settings, type Stats } from './types';
import { initAudio, playFanfare, playNote, setMuted } from './audio';
import { addGlobalMashes, firebaseEnabled, watchGlobalMashes } from './firebase';

const SETTINGS_KEY = 'babymash:settings';
const STATS_KEY = 'babymash:stats';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, EMPTY_STATS));
  const [sessionKeys, setSessionKeys] = useState(0);
  const [globalMashes, setGlobalMashes] = useState<number | null>(null);

  const stageRef = useRef<StageHandle>(null);
  const sessionStartRef = useRef(0);
  const sessionKeysRef = useRef(0);
  const pendingGlobalRef = useRef(0);

  // persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setMuted(!settings.sound);
  }, [settings]);

  // live worldwide counter
  useEffect(() => {
    if (!firebaseEnabled) return;
    return watchGlobalMashes(setGlobalMashes);
  }, []);

  const onMash = useCallback((e: { x: number; y: number; label: string; seed: number }) => {
    stageRef.current?.spawn(e.x, e.y, e.label, e.seed);
    playNote(e.seed);
    sessionKeysRef.current += 1;
    pendingGlobalRef.current += 1;
    setSessionKeys(sessionKeysRef.current);
    if (sessionKeysRef.current % 100 === 0) playFanfare();
  }, []);

  const { active, escProgress, start } = useMashSession({ settings, onMash });

  const beginSession = useCallback(async () => {
    initAudio(); // unlock audio within the user gesture
    setMuted(!settings.sound);
    sessionKeysRef.current = 0;
    pendingGlobalRef.current = 0;
    setSessionKeys(0);
    sessionStartRef.current = Date.now();
    await start();
  }, [settings.sound, start]);

  // when a session ends, fold its results into lifetime stats
  const wasActive = useRef(false);
  useEffect(() => {
    if (wasActive.current && !active) {
      const elapsed = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const keys = sessionKeysRef.current;
      setStats((prev) => {
        const next: Stats = {
          totalKeys: prev.totalKeys + keys,
          totalSessions: prev.totalSessions + 1,
          bestSession: Math.max(prev.bestSession, keys),
          longestSeconds: Math.max(prev.longestSeconds, elapsed),
        };
        localStorage.setItem(STATS_KEY, JSON.stringify(next));
        return next;
      });
      void addGlobalMashes(pendingGlobalRef.current);
      pendingGlobalRef.current = 0;
    }
    wasActive.current = active;
  }, [active]);

  const remaining = settings.exitPresses - escProgress;

  return (
    <div className="app">
      <Stage ref={stageRef} />

      {active ? (
        <ActiveOverlay
          sessionKeys={sessionKeys}
          escProgress={escProgress}
          remaining={remaining}
          exitPresses={settings.exitPresses}
        />
      ) : (
        <Splash
          settings={settings}
          setSettings={setSettings}
          stats={stats}
          globalMashes={globalMashes}
          onStart={beginSession}
        />
      )}
    </div>
  );
}

function ActiveOverlay({
  sessionKeys,
  escProgress,
  remaining,
  exitPresses,
}: {
  sessionKeys: number;
  escProgress: number;
  remaining: number;
  exitPresses: number;
}) {
  return (
    <>
      <div className="hud">
        <span className="hud-score">{sessionKeys}</span>
        <span className="hud-label">mashes</span>
      </div>
      <div className={`exit-hint ${escProgress > 0 ? 'show' : ''}`}>
        {escProgress > 0 ? (
          <>
            Press <b>ESC</b> {remaining} more time{remaining === 1 ? '' : 's'} to quit
            <div className="esc-dots">
              {Array.from({ length: exitPresses }).map((_, i) => (
                <span key={i} className={i < escProgress ? 'on' : ''} />
              ))}
            </div>
          </>
        ) : (
          <span className="exit-faint">Tap ESC {exitPresses}× fast to quit</span>
        )}
      </div>
    </>
  );
}

function Toggle({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)} type="button">
      <span className="toggle-knob" />
      <span className="toggle-text">
        <strong>{label}</strong>
        <small>{desc}</small>
      </span>
    </button>
  );
}

function Splash({
  settings,
  setSettings,
  stats,
  globalMashes,
  onStart,
}: {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  stats: Stats;
  globalMashes: number | null;
  onStart: () => void;
}) {
  const set = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const fmt = useMemo(() => new Intl.NumberFormat(), []);

  return (
    <div className="splash">
      <div className="splash-card">
        <h1 className="logo">
          <span className="logo-baby">baby</span>
          <span className="logo-mash">mash</span>
        </h1>
        <p className="tagline">Let them smash. Keep your desktop safe. 🍼💥</p>

        <button className="start-btn" onClick={onStart} type="button">
          ▶ Start Mashing
        </button>

        <div className="settings">
          <Toggle
            label="Block shortcuts"
            desc="Cmd+W/T/Q, Esc, F-keys (Chrome/Edge fullscreen)"
            value={settings.blockShortcuts}
            onChange={(v) => set({ blockShortcuts: v })}
          />
          <Toggle
            label="Block gestures"
            desc="Pinch-zoom, swipe, text selection"
            value={settings.blockGestures}
            onChange={(v) => set({ blockGestures: v })}
          />
          <Toggle
            label="Block right-click"
            desc="No context menu"
            value={settings.blockContextMenu}
            onChange={(v) => set({ blockContextMenu: v })}
          />
          <Toggle
            label="Sound"
            desc="Cheerful tones on every key"
            value={settings.sound}
            onChange={(v) => set({ sound: v })}
          />
          <div className="exit-setting">
            <span>
              <strong>Exit: ESC ×{settings.exitPresses}</strong>
              <small>Consecutive presses to quit fullscreen</small>
            </span>
            <div className="stepper">
              <button
                type="button"
                onClick={() => set({ exitPresses: Math.max(2, settings.exitPresses - 1) })}
              >
                −
              </button>
              <b>{settings.exitPresses}</b>
              <button
                type="button"
                onClick={() => set({ exitPresses: Math.min(6, settings.exitPresses + 1) })}
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat">
            <b>{fmt.format(stats.totalKeys)}</b>
            <small>total mashes</small>
          </div>
          <div className="stat">
            <b>{fmt.format(stats.bestSession)}</b>
            <small>best run</small>
          </div>
          <div className="stat">
            <b>{stats.totalSessions}</b>
            <small>sessions</small>
          </div>
          {globalMashes !== null && (
            <div className="stat global">
              <b>{fmt.format(globalMashes)}</b>
              <small>🌍 worldwide</small>
            </div>
          )}
        </div>

        <details className="lockdown">
          <summary>⚠️ macOS: block trackpad swipes &amp; Spotlight</summary>
          <p>
            A web page <b>cannot</b> block OS-level gestures (3/4-finger swipe between Spaces,
            Cmd+Space, Cmd+Tab, F3/F4 Mission Control). For full lockdown, in
            <b> System Settings</b>:
          </p>
          <ul>
            <li><b>Trackpad → More Gestures</b>: turn off "Swipe between full-screen apps" &amp; "Mission Control".</li>
            <li><b>Keyboard → Keyboard Shortcuts → Mission Control</b>: uncheck the F3/F4 &amp; Spaces shortcuts.</li>
            <li><b>Keyboard Shortcuts → Spotlight</b>: uncheck Cmd+Space.</li>
            <li>Use <b>Chrome or Edge</b> (not Safari) so Keyboard Lock can grab Cmd+W/T/Q.</li>
          </ul>
        </details>
      </div>
      <footer className="foot">
        Open source · MIT · <a href="https://github.com/shaksphere/babymash">GitHub</a>
        {firebaseEnabled ? ' · 🔥 live' : ''}
      </footer>
    </div>
  );
}
