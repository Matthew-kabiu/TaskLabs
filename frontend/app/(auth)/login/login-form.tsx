'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthActions } from '@convex-dev/auth/react';
import { ArrowRight, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { m } from 'framer-motion';
import { ROUTES } from '@/lib/routes';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
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

const fieldClass =
  'h-11 rounded-none border-x-0 border-t-0 border-b border-border/80 bg-transparent pl-0 text-[15px] shadow-none transition-colors focus-visible:border-foreground focus-visible:ring-0 placeholder:text-muted-foreground/60';

const labelClass =
  'font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground';

export default function LoginForm({ allowRegistration }: { allowRegistration: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setSubmitting(true);
    try {
      const result = await signIn('password', {
        email: values.email,
        password: values.password,
        flow: 'signIn',
      });
      if (!result.signingIn) {
        toast.error('Invalid email or password.');
        return;
      }
      toast.success('Welcome back!');
      const next = params.get('next') ?? ROUTES.app.home;
      router.push(next);
      router.refresh();
    } catch {
      toast.error('Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <header className="mb-9 space-y-2">
        <p className={labelClass}>Session · Sign in</p>
        <h2 className="text-[28px] font-light tracking-tight text-foreground">
          Sign in to{' '}
          <span className="italic font-normal">TaskLabs</span>.
        </h2>
        <p className="text-sm text-muted-foreground">
          Use the credentials you set up during installation.
        </p>
      </header>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-7"
          noValidate
        >
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
                <div className="flex items-center justify-between">
                  <FormLabel className={labelClass}>Password</FormLabel>
                  <Link
                    href={ROUTES.app.forgotPassword}
                    className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput
                    autoComplete="current-password"
                    placeholder="••••••••"
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
              type="submit"
              disabled={submitting}
              className="group h-11 w-full justify-between rounded-none px-5 text-[13px] uppercase tracking-[0.2em]"
            >
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                {submitting ? 'Signing in…' : 'Sign in'}
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </form>
      </Form>

      {allowRegistration ? (
        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span>No account?</span>
          <Link
            className="group inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-foreground"
            href={ROUTES.app.register}
          >
            <span>Register</span>
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      ) : null}
    </m.div>
  );
}
