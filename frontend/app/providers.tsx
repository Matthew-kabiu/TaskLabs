'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, type ReactNode } from 'react';
import { ConvexClientProvider } from './ConvexClientProvider';

// Silences a React 19 dev-only warning emitted by next-themes' inline
// no-flash <script>. Remove once next-themes ships a React 19 fix.
function useFilterNextThemesScriptWarning() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const first = args[0];
      if (typeof first === 'string' && first.includes('Encountered a script tag while rendering')) {
        return;
      }
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useFilterNextThemesScriptWarning();
  return (
    <ConvexClientProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors closeButton position="bottom-right" />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
