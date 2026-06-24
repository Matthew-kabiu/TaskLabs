'use client';
import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <AlertTriangle className="h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || 'An unexpected error occurred. Try again, or reload the page.'}
      </p>
      <Button size="sm" onClick={unstable_retry}>Try again</Button>
    </div>
  );
}
