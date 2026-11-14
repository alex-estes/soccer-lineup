import { useEffect } from 'react';

/** Stops the page behind a full-screen dialog from scrolling while `locked`. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const html = document.documentElement;
    const { body } = document;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      [html.style.overflow, body.style.overflow] = prev;
    };
  }, [locked]);
}
