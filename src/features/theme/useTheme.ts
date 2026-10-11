import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'portfolio-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    const query = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
      if (saved !== 'light' && saved !== 'dark') setTheme(query.matches ? 'dark' : 'light');
    };
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', theme === 'dark' ? '#25202d' : '#e6eee2',
    );
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the toggle usable. */ }
    setTheme(next);
  }

  return { theme, toggleTheme };
}
