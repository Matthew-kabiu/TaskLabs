'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation } from 'convex/react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { setupSchema, type SetupInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { cn } from '@/lib/utils';
import { getUserFacingError } from '@/lib/user-facing-error';

type Step = 'account' | 'workspace' | 'done';
type PendingClaim = Pick<SetupInput, 'name' | 'workspaceName'>;

const STEP_INDEX: Record<Step, number> = { account: 0, workspace: 1, done: 2 };
const STEPS: { key: Step; label: string }[] = [
  { key: 'account', label: 'Account' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'done', label: 'Complete' },
];

const fieldClass =
  'h-11 rounded-none border-x-0 border-t-0 border-b border-border/80 bg-transparent pl-0 text-[15px] shadow-none transition-colors focus-visible:border-foreground focus-visible:ring-0 placeholder:text-muted-foreground/60';

const labelClass =
  'font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground';

export function SetupWizard() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const claimAdmin = useMutation(BACKEND_ROUTES.setup.claimAdmin);
  const [step, setStep] = useState<Step>('account');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const claimInFlight = useRef(false);
  const idx = STEP_INDEX[step];

  const form = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: { email: '', password: '', name: '', workspaceName: '' },
    mode: 'onTouched',
  });

  async function handleAccountNext() {
    setSubmitError(null);
    const ok = await form.trigger(['email', 'password', 'name']);
    if (ok) setStep('workspace');
  }

  useEffect(() => {
    if (
      pendingClaim === null ||
      authLoading ||
      !isAuthenticated ||
      claimInFlight.current
    ) {
      return;
    }

    claimInFlight.current = true;
    void (async () => {
      try {
        await claimAdmin({
          name: pendingClaim.name,
          workspaceName: pendingClaim.workspaceName,
        });
      } catch (err) {
        const rawMessage = err instanceof Error ? err.message : '';
        if (rawMessage.toLowerCase().includes('setup already complete')) {
          toast.error('Setup already complete.');
          router.replace(ROUTES.app.login);
          return;
        }
        const message = getUserFacingError(
          err,
          'We could not finish creating the workspace. Please try again.',
        );
        setSubmitError(message);
        toast.error(message);
        return;
      } finally {
        claimInFlight.current = false;
        setPendingClaim(null);
        setSubmitting(false);
      }

      toast.success('Admin account created successfully!');
      setStep('done');
    })();
  }, [authLoading, claimAdmin, isAuthenticated, pendingClaim, router]);

  async function handleSubmit(values: SetupInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setPendingClaim({
        name: values.name,
        workspaceName: values.workspaceName,
      });
      if (!isAuthenticated) {
        const signUp = await signIn('password', {
          email: values.email,
          password: values.password,
          flow: 'signUp',
        });
        if (!signUp.signingIn) throw new Error('Failed to create admin.');
      }
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : '';
      if (rawMessage.toLowerCase().includes('setup already complete')) {
        toast.error('Setup already complete.');
        router.replace(ROUTES.app.login);
        return;
      }
      const message = getUserFacingError(
        err,
        'We could not create the admin account. Check your connection and try again.',
      );
      setSubmitError(message);
      toast.error(message);
      setPendingClaim(null);
      setSubmitting(false);
      return;
    }
  }

  function goToApp() {
    router.replace(ROUTES.app.home);
    router.refresh();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Step strip */}
      <div className="mb-10 flex items-center gap-3">
        {STEPS.map((s, i) => {
          const state =
            i < idx ? 'done' : i === idx ? 'active' : 'pending';
          return (
            <div key={s.key} className="flex flex-1 items-center gap-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'inline-flex h-5 w-5 items-center justify-center rounded-full border font-mono text-[10px] tabular-nums transition-colors',
                    state === 'active' &&
                      'border-foreground bg-foreground text-background',
                    state === 'done' &&
                      'border-foreground/60 bg-foreground/10 text-foreground',
                    state === 'pending' &&
                      'border-border text-muted-foreground/70',
                  )}
                >
                  {state === 'done' ? '·' : i + 1}
                </span>
                <span
                  className={cn(
                    'font-mono text-[10px] uppercase tracking-[0.22em] transition-colors',
                    state === 'pending'
                      ? 'text-muted-foreground/60'
                      : 'text-foreground',
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'h-px flex-1 transition-colors',
                    i < idx ? 'bg-foreground/60' : 'bg-border/60',
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Heading */}
      <header className="mb-9 space-y-2">
        <p className={labelClass}>
          Step {String(idx + 1).padStart(2, '0')} / 03
        </p>
        <h2 className="text-[28px] font-light tracking-tight text-foreground">
          {step === 'account' && 'Create your admin account.'}
          {step === 'workspace' && (
            <>
              Name your <span className="italic font-normal">first</span>{' '}
              workspace.
            </>
          )}
          {step === 'done' && (
            <>
              <span className="italic font-normal">Welcome.</span> You are all
              set.
            </>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">
          {step === 'account' &&
            'These credentials will sign you in throughout TaskLabs.'}
          {step === 'workspace' &&
            'You can rename it later, or create more from the dashboard.'}
          {step === 'done' &&
            'Your admin account and personal workspace are ready.'}
        </p>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="relative"
          noValidate
        >
          {submitError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 flex gap-3 border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                aria-hidden
              />
              <p className="leading-5">{submitError}</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {step === 'account' && (
              <motion.div
                key="account"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-7"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={labelClass}>Your name</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="name"
                          placeholder="Ada Lovelace"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={labelClass}>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder="you@domain.com"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={labelClass}>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          autoComplete="new-password"
                          placeholder="At least 8 characters"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="pt-3">
                  <Button
                    type="button"
                    onClick={handleAccountNext}
                    className="group h-11 w-full justify-between rounded-none px-5 text-[13px] uppercase tracking-[0.2em]"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'workspace' && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-7"
              >
                <FormField
                  control={form.control}
                  name="workspaceName"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className={labelClass}>
                        Workspace name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="HQ"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-[auto_1fr] gap-3 pt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-none px-4 text-[13px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    onClick={() => setStep('account')}
                    disabled={submitting}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="group h-11 justify-between rounded-none px-5 text-[13px] uppercase tracking-[0.2em]"
                  >
                    <span className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      {submitting ? 'Creating…' : 'Create admin'}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-7"
              >
                <div className="flex items-center gap-4 border-y border-border/60 py-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Provisioned</p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      admin · workspace · signed in
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={goToApp}
                  className="group h-11 w-full justify-between rounded-none px-5 text-[13px] uppercase tracking-[0.2em]"
                >
                  <span>Open TaskLabs</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </Form>
    </motion.div>
  );
}
