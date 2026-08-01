import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { BackToHome } from '@/components/back-to-home';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function RegisterClosedPage() {
  return (
    <main className="grid min-h-svh w-full place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <BackToHome />
        </div>
        <Card>
      <CardHeader>
        <CardTitle>Registration is invite-only</CardTitle>
        <CardDescription>
          Public sign-ups are disabled on this TaskLabs instance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>Contact your platform admin for an invite link.</p>
        <p>
          Already have an account?{' '}
          <Link className="underline" href={ROUTES.app.login}>
            Sign in
          </Link>
          .
        </p>
      </CardContent>
    </Card>
      </div>
    </main>
  );
}
