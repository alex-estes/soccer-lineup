import { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebaseConfig';

const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle the result when returning from Google redirect
    getRedirectResult(auth).catch(() => {/* ignore cancelled redirects */});

    return onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    signIn: () => signInWithRedirect(auth, provider),
    signOut: () => signOut(auth),
  };
}
