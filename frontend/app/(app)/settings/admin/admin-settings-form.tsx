'use client';

import { useState, useTransition } from 'react';
import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { BACKEND_ROUTES } from '@/lib/routes';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function AdminSettingsForm({
  initialAllowPublicRegistration,
}: {
  initialAllowPublicRegistration: boolean;
}) {
  const [allow, setAllow] = useState(initialAllowPublicRegistration);
  const [pending, startTransition] = useTransition();
  const updateSystem = useMutation(BACKEND_ROUTES.settings.updateSystem);

  async function onToggle(next: boolean) {
    const previous = allow;
    setAllow(next);
    startTransition(async () => {
      try {
        await updateSystem({ allowPublicRegistration: next });
      } catch {
        setAllow(previous);
        toast.error('Failed to update setting.');
        return;
      }
      toast.success(
        next ? 'Public registration enabled.' : 'Public registration disabled.',
      );
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public registration</CardTitle>
        <CardDescription>
          When off, the /register page redirects to an invite-only message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="allow-public-registration" className="leading-snug">
            Allow public registration
          </Label>
          <Switch
            id="allow-public-registration"
            checked={allow}
            disabled={pending}
            onCheckedChange={onToggle}
          />
        </div>
      </CardContent>
    </Card>
  );
}
