import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: 'soccer-lineup-f253e.firebaseapp.com',
  projectId: 'soccer-lineup-f253e',
  storageBucket: 'soccer-lineup-f253e.firebasestorage.app',
  messagingSenderId: '576791272410',
  appId: '1:576791272410:web:720105bf399d17fec03ee3',
};

const fbApp = initializeApp(firebaseConfig);
export const db = getFirestore(fbApp);
export const auth = getAuth(fbApp);

// `VITE_USE_EMULATORS=true npm run dev` runs against local emulators
// (`npx firebase-tools emulators:start --only auth,firestore --project soccer-lineup-f253e`)
// so changes to sync or the security rules can be tried without touching real data.
if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
