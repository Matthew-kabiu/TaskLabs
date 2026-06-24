'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation } from 'convex/react';
import { UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { registerSchema, type RegisterInput } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

export function RegisterForm() {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const completeRegistration = useMutation(BACKEND_ROUTES.registration.complete);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState<Pick<RegisterInput, 'name'> | null>(null);
  const registrationInFlight = useRef(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', name: '' },
  });

  useEffect(() => {
    if (
      pendingRegistration === null ||
      authLoading ||
      !isAuthenticated ||
      registrationInFlight.current
    ) {
      return;
    }

    registrationInFlight.current = true;
    void (async () => {
      try {
        await completeRegistration({ name: pendingRegistration.name });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed.';
        if (message.toLowerCase().includes('public registration is disabled')) {
          router.replace(ROUTES.app.registerClosed);
          return;
        }
        toast.error(message);
        return;
      } finally {
        registrationInFlight.current = false;
        setPendingRegistration(null);
        setSubmitting(false);
      }

      toast.success('Account created successfully!');
      router.push(ROUTES.app.home);
      router.refresh();
    })();
  }, [
    authLoading,
    completeRegistration,
    isAuthenticated,
    pendingRegistration,
    router,
  ]);

  async function onSubmit(values: RegisterInput) {
    setSubmitting(true);
    try {
      setPendingRegistration({ name: values.name });
      if (!isAuthenticated) {
        const signUp = await signIn('password', {
          email: values.email,
          password: values.password,
          flow: 'signUp',
        });
        if (!signUp.signingIn) throw new Error('Registration failed.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      if (message.toLowerCase().includes('public registration is disabled')) {
        router.replace(ROUTES.app.registerClosed);
        return;
      }
      toast.error(message);
      setPendingRegistration(null);
      setSubmitting(false);
      return;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start managing your tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={submitting} className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              {submitting ? 'Creating…' : 'Create account'}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-between text-sm text-muted-foreground">
        <span>Already registered?</span>
        <Link className="underline" href={ROUTES.app.login}>
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
