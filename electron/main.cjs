// BabyMash — Electron main process.
//
// Wraps the React app in a locked-down kiosk window and blocks the OS-level
// shortcuts a web page can't touch:
//   • globalShortcut swallows Spotlight (Cmd+Space), F-keys, Cmd+W/T/N/R/Q/H/M
//     and the keyboard Spaces/Mission-Control combos.
//   • Kiosk mode + a null app menu + always-on-top keep the window in front.
//   • Triple-tap ESC (configurable via BABYMASH_EXIT_PRESSES) quits.
//
// The one thing even this can't swallow is the 3/4-finger trackpad swipe
// between Spaces — that's a WindowServer gesture. Turn it off once in
// System Settings → Trackpad → More Gestures (see README).

const { app, BrowserWindow, globalShortcut, Menu, screen } = require('electron');
const path = require('node:path');

const isDev = !!process.env.ELECTRON_START_URL;
// Smoke mode: windowed, no kiosk/always-on-top/global-shortcut grabbing, and
// auto-quits — used to verify the app loads without seizing the screen.
const isSmoke = !!process.env.BABYMASH_SMOKE;
const lockdown = !isDev && !isSmoke;
const EXIT_PRESSES = Number(process.env.BABYMASH_EXIT_PRESSES) || 3;
const ESC_WINDOW_MS = 1500;

let win = null;
let quitting = false;
let escCount = 0;
let escTimer = null;

// Shortcuts we try to grab system-wide. Some (e.g. Cmd+Tab) are reserved by
// macOS and will silently fail to register — that's fine, we wrap each one.
const SHORTCUTS = [
  'CommandOrControl+Space', // Spotlight
  'CommandOrControl+Q',
  'CommandOrControl+W',
  'CommandOrControl+N',
  'CommandOrControl+T',
  'CommandOrControl+R',
  'CommandOrControl+H',
  'CommandOrControl+M',
  'CommandOrControl+Tab',
  'Control+Up', // Mission Control
  'Control+Down',
  'Control+Left', // move a Space left
  'Control+Right',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
];

function registerBlockers() {
  for (const accel of SHORTCUTS) {
    try {
      globalShortcut.register(accel, () => {
        /* swallow: do nothing */
      });
    } catch {
      /* reserved by OS — ignore */
    }
  }
}

function handleEscape() {
  escCount += 1;
  if (escTimer) clearTimeout(escTimer);
  if (escCount >= EXIT_PRESSES) {
    quitting = true;
    app.quit();
    return;
  }
  escTimer = setTimeout(() => {
    escCount = 0;
  }, ESC_WINDOW_MS);
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width,
    height,
    kiosk: lockdown, // full kiosk lockdown in production
    fullscreen: lockdown,
    frame: false,
    backgroundColor: '#1a1a40',
    alwaysOnTop: lockdown,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (lockdown) {
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Count ESC presses in the main process so quitting is authoritative, while
  // the web UI still shows its "press ESC X more times" overlay. We do NOT
  // preventDefault Escape, so the renderer still sees it for the countdown.
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      handleEscape();
    } else if (input.type === 'keyDown' && input.key !== 'Escape') {
      escCount = 0; // any other key breaks the streak
    }
  });

  // Don't let the window be closed except via our quit path.
  win.on('close', (e) => {
    if (!quitting) e.preventDefault();
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// Single instance only.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) win.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null); // no menu → no Cmd+W/Q/etc. menu actions
    if (lockdown) registerBlockers();
    createWindow();

    if (isSmoke) {
      // Verify load then exit, without grabbing the screen or shortcuts.
      win.webContents.once('did-finish-load', () => {
        setTimeout(() => {
          quitting = true;
          app.quit();
        }, 1500);
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  app.quit();
});
