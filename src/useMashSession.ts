import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from './types';

// Keys that, even with preventDefault, the OS may still act on. We can't block
// these from a web sandbox (documented in the UI), but we still try.
type MashEvent = { x: number; y: number; label: string; seed: number };

interface Options {
  settings: Settings;
  onMash: (e: MashEvent) => void;
}

// navigator.keyboard is experimental (Chromium). Type it loosely.
interface KeyboardLock {
  lock?: (keys?: string[]) => Promise<void>;
  unlock?: () => void;
}

function getKeyboard(): KeyboardLock | undefined {
  return (navigator as unknown as { keyboard?: KeyboardLock }).keyboard;
}

const ESC_WINDOW_MS = 1500; // consecutive presses must land within this window

export function useMashSession({ settings, onMash }: Options) {
  const [active, setActive] = useState(false);
  const [escProgress, setEscProgress] = useState(0); // how many Esc presses landed
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const onMashRef = useRef(onMash);
  onMashRef.current = onMash;

  const escCountRef = useRef(0);
  const escTimerRef = useRef<number | null>(null);
  const activeRef = useRef(false);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setEscProgress(0);
    escCountRef.current = 0;
    if (escTimerRef.current) window.clearTimeout(escTimerRef.current);

    const kb = getKeyboard();
    try {
      kb?.unlock?.();
    } catch {
      /* ignore */
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const resetEsc = useCallback(() => {
    escCountRef.current = 0;
    setEscProgress(0);
    if (escTimerRef.current) window.clearTimeout(escTimerRef.current);
  }, []);

  const handleEscape = useCallback(() => {
    escCountRef.current += 1;
    setEscProgress(escCountRef.current);
    if (escTimerRef.current) window.clearTimeout(escTimerRef.current);

    if (escCountRef.current >= settingsRef.current.exitPresses) {
      stop();
      return;
    }
    escTimerRef.current = window.setTimeout(() => {
      escCountRef.current = 0;
      setEscProgress(0);
    }, ESC_WINDOW_MS);
  }, [stop]);

  const start = useCallback(async () => {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      }
    } catch (e) {
      console.warn('[babymash] fullscreen request failed', e);
    }
    // Keyboard Lock captures system shortcuts (Cmd+W, Cmd+T, Esc, F-keys…) in
    // fullscreen on Chromium. No-op / rejects elsewhere — that's fine.
    if (settingsRef.current.blockShortcuts) {
      const kb = getKeyboard();
      try {
        await kb?.lock?.();
      } catch (e) {
        console.warn('[babymash] keyboard lock unavailable', e);
      }
    }
    activeRef.current = true;
    setActive(true);
    resetEsc();
  }, [resetEsc]);

  // Global event handlers — installed only while active.
  useEffect(() => {
    if (!active) return;

    const labelForKey = (e: KeyboardEvent): string => {
      if (e.key.length === 1) return e.key.toUpperCase();
      // map common keys to fun emoji/symbols
      const map: Record<string, string> = {
        Enter: '⏎',
        ' ': '★',
        Backspace: '⌫',
        Tab: '⇥',
        ArrowUp: '↑',
        ArrowDown: '↓',
        ArrowLeft: '←',
        ArrowRight: '→',
        Shift: '✦',
        Control: '✧',
        Alt: '✶',
        Meta: '✸',
        CapsLock: '✪',
        Escape: '⎋',
      };
      return map[e.key] ?? '✺';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsRef.current.blockShortcuts) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (e.repeat) return; // ignore auto-repeat for effects/score

      if (e.key === 'Escape') {
        handleEscape();
        return;
      }
      // any non-Esc key breaks the exit streak
      if (escCountRef.current > 0) resetEsc();

      onMashRef.current({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        label: labelForKey(e),
        seed: e.key.charCodeAt(0) || Math.random() * 100,
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (settingsRef.current.blockShortcuts) e.preventDefault();
    };

    const onPointer = (e: PointerEvent | MouseEvent) => {
      const ascii = '✿❀✾❁✽';
      onMashRef.current({
        x: e.clientX,
        y: e.clientY,
        label: ascii[Math.floor(Math.random() * ascii.length)],
        seed: e.clientX + e.clientY,
      });
    };

    const onContextMenu = (e: MouseEvent) => {
      if (settingsRef.current.blockContextMenu) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      // ctrl+wheel == pinch-zoom on trackpads
      if (settingsRef.current.blockGestures && e.ctrlKey) e.preventDefault();
    };

    const onGesture = (e: Event) => {
      if (settingsRef.current.blockGestures) e.preventDefault();
    };

    const onSelect = (e: Event) => {
      if (settingsRef.current.blockGestures) e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (settingsRef.current.blockGestures) e.preventDefault();
    };

    const onFullscreenChange = () => {
      // If the user/baby somehow leaves fullscreen, end the session cleanly.
      if (!document.fullscreenElement && activeRef.current) stop();
    };

    // capture phase + non-passive so preventDefault actually sticks
    const opts: AddEventListenerOptions = { capture: true, passive: false };
    window.addEventListener('keydown', onKeyDown, opts);
    window.addEventListener('keyup', onKeyUp, opts);
    window.addEventListener('pointerdown', onPointer as EventListener, opts);
    window.addEventListener('contextmenu', onContextMenu, opts);
    window.addEventListener('wheel', onWheel, opts);
    window.addEventListener('gesturestart', onGesture, opts);
    window.addEventListener('gesturechange', onGesture, opts);
    window.addEventListener('selectstart', onSelect, opts);
    window.addEventListener('touchmove', onTouchMove, opts);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown, opts);
      window.removeEventListener('keyup', onKeyUp, opts);
      window.removeEventListener('pointerdown', onPointer as EventListener, opts);
      window.removeEventListener('contextmenu', onContextMenu, opts);
      window.removeEventListener('wheel', onWheel, opts);
      window.removeEventListener('gesturestart', onGesture, opts);
      window.removeEventListener('gesturechange', onGesture, opts);
      window.removeEventListener('selectstart', onSelect, opts);
      window.removeEventListener('touchmove', onTouchMove, opts);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [active, handleEscape, resetEsc, stop]);

  return { active, escProgress, start, stop };
}
