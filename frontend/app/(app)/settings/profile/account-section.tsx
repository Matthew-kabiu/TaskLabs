'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAction, useMutation } from 'convex/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Save,
  KeyRound,
  Mail,
  User,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { BACKEND_ROUTES } from '@/lib/routes';

const identitySchema = z.object({
  name: z.string().trim().min(1, 'Required').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Required'),
    next: z.string().min(8, 'At least 8 characters').max(256),
    confirm: z.string().min(1, 'Required'),
  })
  .refine((d) => d.next === d.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })
  .refine((d) => d.next !== d.current, {
    message: 'New password must differ from the current one',
    path: ['next'],
  });

type IdentityValues = z.infer<typeof identitySchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

interface Props {
  initial: { name: string | null; email: string };
}

export function AccountSection({ initial }: Props) {
  const router = useRouter();
  const updateProfile = useMutation(BACKEND_ROUTES.profile.update);
  const changePassword = useAction(BACKEND_ROUTES.profile.changePassword);

  const idForm = useForm<IdentityValues>({
    resolver: zodResolver(identitySchema),
    defaultValues: { name: initial.name ?? '', email: initial.email },
  });
  const pwForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: '', next: '', confirm: '' },
  });

  const onSaveIdentity = idForm.handleSubmit(async (values) => {
    const payload: Partial<IdentityValues> = {};
    if (values.name !== (initial.name ?? '')) payload.name = values.name;
    if (values.email !== initial.email) payload.email = values.email;
    if (Object.keys(payload).length === 0) {
      toast.message('No changes to save.');
      return;
    }
    try {
      await updateProfile(payload);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save profile.');
      return;
    }
    toast.success('Profile updated.');
    idForm.reset(values);
    router.refresh();
  });

  const onChangePassword = pwForm.handleSubmit(async (values) => {
    try {
      await changePassword({
        currentPassword: values.current,
        newPassword: values.next,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change password.');
      return;
    }
    toast.success('Password changed.');
    pwForm.reset({ current: '', next: '', confirm: '' });
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
      {/* Identity */}
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <User className="h-5 w-5 text-muted-foreground" />
            Identity
          </h2>
          <p className="text-sm text-muted-foreground">
            Update the name and email associated with your account.
          </p>
        </header>
        <form
          onSubmit={onSaveIdentity}
          className="space-y-4 rounded-lg border bg-card p-5"
          noValidate
        >
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="flex items-center gap-1.5 text-xs">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Name
              </Label>
              <Input
                id="name"
                autoComplete="name"
                {...idForm.register('name')}
              />
              {idForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {idForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...idForm.register('email')}
              />
              {idForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {idForm.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={idForm.formState.isSubmitting || !idForm.formState.isDirty}
              className="gap-2"
            >
              {idForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            Password
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a password at least 8 characters long. You&apos;ll need your current
            password to confirm.
          </p>
        </header>
        <form
          onSubmit={onChangePassword}
          className="space-y-4 rounded-lg border bg-card p-5"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="current" className="flex items-center gap-1.5 text-xs">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              Current password
            </Label>
            <PasswordInput
              id="current"
              autoComplete="current-password"
              {...pwForm.register('current')}
            />
            {pwForm.formState.errors.current && (
              <p className="text-xs text-destructive">
                {pwForm.formState.errors.current.message}
              </p>
            )}
          </div>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="next" className="flex items-center gap-1.5 text-xs">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                New password
              </Label>
              <PasswordInput
                id="next"
                autoComplete="new-password"
                {...pwForm.register('next')}
              />
              {pwForm.formState.errors.next && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.next.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="confirm"
                className="flex items-center gap-1.5 text-xs"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Confirm new password
              </Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                {...pwForm.register('confirm')}
              />
              {pwForm.formState.errors.confirm && (
                <p className="text-xs text-destructive">
                  {pwForm.formState.errors.confirm.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={pwForm.formState.isSubmitting}
              className="gap-2"
            >
              {pwForm.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Change password
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
