'use client';

import { ThemeProvider } from 'next-themes';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { Toaster } from 'sonner';
import { useEffect, type ReactNode } from 'react';
import { ConvexClientProvider } from './ConvexClientProvider';
import { AppErrorBoundary } from '@/components/error-boundary';

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
        {/*
          `reducedMotion="user"` makes every Framer Motion animation honor the
          OS-level reduce-motion setting. Paired with the CSS media query in
          globals.css, this covers both motion systems the app uses.
        */}
        {/*
          `LazyMotion` + the `m` component ships only the `domAnimation` feature
          set (~15kb smaller than importing `motion` directly, which pulls the
          full animation runtime into every bundle that touches it). `strict`
          makes any stray `motion.*` import fail loudly instead of silently
          re-inflating the bundle.
        */}
        <LazyMotion features={domAnimation} strict>
          <MotionConfig reducedMotion="user">
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </MotionConfig>
        </LazyMotion>
        <Toaster richColors closeButton position="bottom-right" />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
