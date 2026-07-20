'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ErrorFallback({
  onRetry,
  fullPage = false,
}: {
  onRetry: () => void;
  fullPage?: boolean;
}) {
  return (
    <section
      role="alert"
      className={
        fullPage
          ? 'flex min-h-svh items-center justify-center bg-background px-6 text-foreground'
          : 'flex min-h-[24rem] items-center justify-center px-6'
      }
    >
      <div className="w-full max-w-md border border-border bg-card p-6 text-card-foreground">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        <h1 className="mt-5 text-xl font-medium tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          TaskLabs could not load this view. Your data is safe. Try again, or
          reload the page if the problem continues.
        </p>
        <Button className="mt-6" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </section>
  );
}
