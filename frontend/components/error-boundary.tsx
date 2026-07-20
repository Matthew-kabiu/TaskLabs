'use client';

import { unstable_catchError as catchError, type ErrorInfo } from 'next/error';
import type { ReactNode } from 'react';
import { ErrorFallback } from '@/components/error-fallback';

function BoundaryFallback(
  _: { children: ReactNode },
  { error, unstable_retry }: ErrorInfo,
) {
  console.error(error);
  return <ErrorFallback onRetry={unstable_retry} fullPage />;
}

export const AppErrorBoundary = catchError(BoundaryFallback);
