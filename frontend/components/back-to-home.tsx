import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

export function BackToHome({ className }: { className?: string }) {
  return (
    <Link
      href={ROUTES.app.landing}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground'
      }
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back to home
    </Link>
  );
}
