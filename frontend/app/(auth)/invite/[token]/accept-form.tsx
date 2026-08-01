'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation } from 'convex/react';
import { UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { BACKEND_ROUTES } from '@/lib/routes';

export function AcceptForm(props: {
  token: string;
  email: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const acceptInvitation = useMutation(BACKEND_ROUTES.invitations.accept);
  const updateProfile = useMutation(BACKEND_ROUTES.profile.update);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingAccept, setPendingAccept] = useState<{ name: string } | null>(null);
  const acceptInFlight = useRef(false);

  useEffect(() => {
    if (
      pendingAccept === null ||
      authLoading ||
      !isAuthenticated ||
      acceptInFlight.current
    ) {
      return;
    }

    acceptInFlight.current = true;
    void (async () => {
      try {
        const trimmedName = pendingAccept.name.trim();
        if (trimmedName) {
          await updateProfile({ name: trimmedName });
        }
        await acceptInvitation({ token: props.token });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to accept invitation');
        return;
      } finally {
        acceptInFlight.current = false;
        setPendingAccept(null);
        setBusy(false);
      }

      toast.success('Invitation accepted successfully!');
      router.push(props.redirectTo);
      router.refresh();
    })();
  }, [
    acceptInvitation,
    authLoading,
    isAuthenticated,
    pendingAccept,
    props.redirectTo,
    props.token,
    router,
    updateProfile,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setPendingAccept({ name });
      if (!isAuthenticated) {
        try {
          const signUp = await signIn('password', {
            email: props.email,
            password,
            flow: 'signUp',
          });
          if (!signUp.signingIn) throw new Error('Sign-up failed');
        } catch {
          const signInResult = await signIn('password', {
            email: props.email,
            password,
            flow: 'signIn',
          });
          if (!signInResult.signingIn) throw new Error('Invalid email or password');
        }
      }
    } catch (e) {
      // Clear the in-flight markers first so no future branch here can return
      // early and leave the button disabled with an accept still queued —
      // matching register-form and setup-wizard.
      setPendingAccept(null);
      setBusy(false);
      toast.error(e instanceof Error ? e.message : 'Failed to accept invitation');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name (optional)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        <UserCheck className="mr-2 h-4 w-4" />
        {busy ? 'Joining…' : 'Accept invitation'}
      </Button>
    </form>
  );
}
