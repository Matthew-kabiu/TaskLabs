'use client';
import { useEffect } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error;
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <ErrorFallback onRetry={unstable_retry} fullPage />
      </body>
    </html>
  );
}
