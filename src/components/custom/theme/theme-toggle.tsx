'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [hideForErrorPage, setHideForErrorPage] = useState(false);

  useEffect(() => {
    if (
      typeof document === 'undefined' ||
      typeof MutationObserver === 'undefined'
    ) {
      return;
    }

    const root = document.documentElement;

    const updateVisibility = () => {
      setHideForErrorPage(root.dataset.errorPage === 'true');
      setMounted(true);
    };

    updateVisibility();

    const observer = new MutationObserver(updateVisibility);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-error-page'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

  if (!mounted || hideForErrorPage) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="fixed right-4 top-4 z-50 bg-background/80 backdrop-blur"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
