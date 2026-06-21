# 🍼💥 BabyMash

**Let your baby smash the keyboard — colourful animations and happy sounds on every key — while keyboard shortcuts and trackpad gestures are blocked so they can't escape, close tabs, or wreck your desktop.**

A safe, open-source baby keyboard masher in the spirit of [tinyfingers.net](https://tinyfingers.net), but with stronger shortcut blocking (it uses the **Keyboard Lock API** to also grab `Cmd+W`, `Cmd+T`, `Cmd+Q`, `Esc`, and the F-keys in fullscreen — which most clones can't).

🔗 **Live:** https://babymash.app

![license](https://img.shields.io/badge/license-MIT-green) ![React](https://img.shields.io/badge/React-Vite-blue) ![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange)

---

## Features

- 🎨 **Animated effects** — every key spawns a giant bouncing glyph plus a confetti burst on an HTML canvas.
- 🔊 **Procedural sound** — cheerful pentatonic tones generated with the WebAudio API (no audio files), with a little fanfare every 100 mashes.
- 🔒 **Shortcut blocking** — `preventDefault` on all keys/combos **plus** the [Keyboard Lock API](https://wicg.github.io/keyboard-lock/) to capture system shortcuts (`Cmd+W/T/Q/N/R`, `Esc`, F-keys) in fullscreen on Chrome/Edge.
- ✋ **Gesture blocking** — pinch-zoom, swipe navigation, text selection, right-click.
- 🚪 **Triple-tap ESC to quit** — configurable (2–6 consecutive presses) with an on-screen "press ESC X more times" counter, so a baby can't stumble out but a grown-up can.
- 📊 **Score & stats** — live mash counter, lifetime totals, best run, sessions (saved to `localStorage`), plus an optional **live worldwide counter** via Firebase Firestore.
- ⚙️ **Pre-flight toggles** — choose what to block *before* going fullscreen.

## What a web app can and can't block (important!)

Browsers run in a sandbox. Some macOS actions are intercepted by the OS **before any web page sees them**, so *no* website (including tinyfingers) can block them:

| Action | Blocked by BabyMash? |
|---|---|
| `Cmd+W` / `Cmd+T` / `Cmd+Q` / `Cmd+N` / `Cmd+R` | ✅ Yes (Chrome/Edge, fullscreen, Keyboard Lock) |
| `Esc`, `Tab`, F-keys (as keystrokes) | ✅ Yes |
| Right-click, pinch-zoom, text-select | ✅ Yes |
| **3/4-finger swipe between Spaces** | ❌ No — OS gesture |
| **`Cmd+Space` (Spotlight), `Cmd+Tab`** | ❌ No — OS-reserved |
| **`F3`/`F4` → Mission Control / Launchpad** | ❌ No — OS intercepts |

### Maximum lockdown on macOS

To stop the OS-level ones, change these once in **System Settings**:

- **Trackpad → More Gestures** — turn off *"Swipe between full-screen apps"* and *"Mission Control"*.
- **Keyboard → Keyboard Shortcuts → Mission Control** — uncheck the F3/F4 and Spaces shortcuts.
- **Keyboard Shortcuts → Spotlight** — uncheck `Cmd+Space`.
- Use **Chrome or Edge** (not Safari — Safari doesn't support the Keyboard Lock API).

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL, click **Start Mashing** (a click is required so the browser allows fullscreen + audio).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Optional: Firebase (live worldwide counter)

The app works fully offline without Firebase. To enable the global counter and host it:

1. Create a Firebase project (e.g. `babymash-app`) at https://console.firebase.google.com.
2. **Build → Firestore Database → Create database** (production mode).
3. **Project settings → Your apps → Web** — register an app and copy the config.
4. `cp .env.example .env.local` and fill in the `VITE_FIREBASE_*` values.
5. Deploy:

```bash
npm install -g firebase-tools   # if needed
firebase login
firebase use --add              # pick your project, alias "default"
npm run build
firebase deploy                 # hosting + firestore rules
```

Firestore security rules (`firestore.rules`) lock the global doc down to *increment-only* on a single `mashes` field — no auth required, but it can't be vandalised with arbitrary writes.

## Tech

React + TypeScript + Vite · HTML Canvas · WebAudio API · Fullscreen + Keyboard Lock APIs · Firebase Hosting + Firestore (optional).

## License

[MIT](./LICENSE) © 2026 shaksphere. Mash freely. 🍼
