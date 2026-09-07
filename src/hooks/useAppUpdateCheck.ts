import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function useAppUpdateCheck(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    const builtSha = import.meta.env.VITE_COMMIT_SHA as string | undefined;
    if (!builtSha) return; // local dev / no CI stamp — nothing to compare against

    async function check() {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { sha?: string };
        if (data.sha && data.sha !== builtSha) setUpdateAvailable(true);
      } catch {
        // network hiccup — try again on the next check
      } finally {
        checkingRef.current = false;
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    function onVisible() {
      if (document.visibilityState === 'visible') check();
    }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) check();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return updateAvailable;
}
