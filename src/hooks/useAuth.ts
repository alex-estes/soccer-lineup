import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebaseConfig';

const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    error: null as string | null,
    signIn: () => signInWithPopup(auth, provider),
    signOut: () => signOut(auth),
  };
}
