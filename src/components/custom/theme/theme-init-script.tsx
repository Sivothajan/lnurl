function themeInit() {
  try {
    const root = document.documentElement;
    if (!root) return;

    const applyTheme = () => {
      try {
        const storedTheme = localStorage.getItem('theme');
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const systemPrefersDark = mediaQuery.matches;
        const useDarkTheme =
          storedTheme === 'dark' ||
          (storedTheme !== 'light' && systemPrefersDark);
        root.classList.toggle('dark', useDarkTheme);
      } catch {
        // Keep fallback pages renderable when browser storage is unavailable.
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applyTheme);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(applyTheme);
    }

    window.addEventListener('storage', (event) => {
      if (event.key === 'theme') {
        applyTheme();
      }
    });
  } catch {
    // Fail silently instead of blocking global error/not-found rendering.
  }
}

const themeInitScript = `(${themeInit.toString()})();`;

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
