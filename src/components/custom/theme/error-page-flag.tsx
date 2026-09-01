'use client';

import { useEffect } from 'react';

export function ErrorPageFlag() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const previous = root.dataset.errorPage;

    root.dataset.errorPage = 'true';

    return () => {
      if (previous !== undefined) {
        root.dataset.errorPage = previous;
      } else {
        delete root.dataset.errorPage;
      }
    };
  }, []);

  return null;
}
