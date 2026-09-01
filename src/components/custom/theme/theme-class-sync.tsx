'use client';

import { useEffect } from 'react';

export function ThemeClassSync() {
  useEffect(() => {
    const applyTheme = () => {
      try {
        const storedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches;
        const useDarkTheme =
          storedTheme === 'dark' ||
          (storedTheme !== 'light' && systemPrefersDark);

        document.documentElement.classList.toggle('dark', useDarkTheme);
      } catch {
        // Keep the global error boundary renderable even if browser APIs fail.
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener?.('change', applyTheme);
    window.addEventListener('storage', applyTheme);

    return () => {
      mediaQuery.removeEventListener?.('change', applyTheme);
      window.removeEventListener('storage', applyTheme);
    };
  }, []);

  return null;
}
