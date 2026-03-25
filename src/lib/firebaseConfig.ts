import { initializeApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCJpTcL7cjKONJBIk3YXVqu-Q59qRH_1as',
  authDomain: 'soccer-lineup-f253e.firebaseapp.com',
  projectId: 'soccer-lineup-f253e',
  storageBucket: 'soccer-lineup-f253e.firebasestorage.app',
  messagingSenderId: '576791272410',
  appId: '1:576791272410:web:720105bf399d17fec03ee3',
};

const fbApp = initializeApp(firebaseConfig);
export const db = getFirestore(fbApp);
export const auth = getAuth(fbApp);

export function getUserLineupDoc(uid: string) {
  return doc(db, 'users', uid, 'lineups', 'main');
}
