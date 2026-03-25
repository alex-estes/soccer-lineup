import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebaseConfig';

const provider = new GoogleAuthProvider();

export function useAuth() {
  const [user, setUser, ] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReadyRef = useRef(false);
  const redirectReadyRef = useRef(false);

  function maybeFinishLoading() {
    if (authReadyRef.current && redirectReadyRef.current) setLoading(false);
  }

  useEffect(() => {
    // Process the result when returning from Google redirect
    getRedirectResult(auth)
      .catch(e => {
        // auth/no-auth-event means no pending redirect — normal on every fresh page load
        if (e?.code !== 'auth/no-auth-event') {
          setError(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        redirectReadyRef.current = true;
        maybeFinishLoading();
      });

    return onAuthStateChanged(auth, u => {
      setUser(u);
      authReadyRef.current = true;
      maybeFinishLoading();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    loading,
    error,
    signIn: () => signInWithRedirect(auth, provider),
    signOut: () => signOut(auth),
  };
}
