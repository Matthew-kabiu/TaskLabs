import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Compass className="h-8 w-8 text-muted-foreground" aria-hidden />
      <h2 className="text-lg font-medium">Page not found</h2>
      <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Button asChild size="sm"><Link href={ROUTES.app.home}>Go home</Link></Button>
    </div>
  );
}
