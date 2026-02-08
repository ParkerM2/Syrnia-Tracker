import { Button } from './ui/button';
import { cn } from '../utils';
import { useStorage } from '@app/hooks';
import { exampleThemeStorage } from '@app/utils/storage';
import { useEffect } from 'react';

export const ThemeToggle = () => {
  const storageData = useStorage(exampleThemeStorage);
  const isLight = storageData?.isLight ?? false;

  // Ensure dark mode class is applied when theme changes
  useEffect(() => {
    const root = document.documentElement;
    // Default to dark mode if storage hasn't loaded yet
    const shouldBeDark = storageData ? !isLight : true;

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isLight, storageData]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={exampleThemeStorage.toggle}
      className={cn(
        'fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg',
        'border-2 bg-background hover:bg-accent',
      )}
      aria-label="Toggle theme">
      {isLight ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      )}
    </Button>
  );
};
