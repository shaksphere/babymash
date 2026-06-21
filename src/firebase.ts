// Firebase is OPTIONAL. The app works fully offline with localStorage.
// If you fill in the config below (or via Vite env vars), a global "mashes
// counter" in Firestore lights up so every baby in the world adds to one total.
//
// To enable: create a Firebase project (babymash.app), enable Firestore in
// production mode, and either paste the config object here or set the
// VITE_FIREBASE_* env vars in a .env.local file. See README.

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  increment,
  setDoc,
  onSnapshot,
  type Firestore,
} from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

if (firebaseEnabled) {
  try {
    app = initializeApp(config);
    db = getFirestore(app);
  } catch (e) {
    console.warn('[babymash] Firebase init failed, running offline.', e);
  }
}

const GLOBAL_DOC = ['stats', 'global'] as const;

// Add to the worldwide mash counter. Best-effort; failures are swallowed.
export async function addGlobalMashes(n: number) {
  if (!db || n <= 0) return;
  try {
    await setDoc(doc(db, ...GLOBAL_DOC), { mashes: increment(n) }, { merge: true });
  } catch (e) {
    console.warn('[babymash] failed to sync global mashes', e);
  }
}

// Subscribe to the live worldwide total. Returns an unsubscribe fn (or noop).
export function watchGlobalMashes(cb: (total: number) => void) {
  if (!db) return () => {};
  return onSnapshot(doc(db, ...GLOBAL_DOC), (snap) => {
    const data = snap.data();
    if (data && typeof data.mashes === 'number') cb(data.mashes);
  });
}
