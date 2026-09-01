import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { LoginPanel } from '@/components/custom/lnurl-auth/LoginPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import publicEnvConfig from '@/config/public.env.config';
import {
  AUTH_SESSION_COOKIE_NAME,
  readAuthSession,
} from '@/services/auth-session.service';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in with your Lightning wallet.',
};

function formatPubkey(pubkey: string) {
  return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
}

export default async function LoginPage() {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null;
  const pubkey = readAuthSession(sessionCookie);

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-center justify-center gap-6 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>

      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl">
            Sign in with your Lightning wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {pubkey ? (
            <>
              <div className="w-full rounded-md border bg-muted px-4 py-3 text-sm">
                <p className="text-muted-foreground">Logged in as</p>
                <p className="break-all font-mono">{formatPubkey(pubkey)}</p>
              </div>
              <form action="/lnurlp/callback/auth/logout" method="post">
                <Button type="submit" variant="outline">
                  Log out
                </Button>
              </form>
            </>
          ) : publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_LOGIN_ALLOWED ? (
            <LoginPanel
              username={publicEnvConfig.NEXT_PUBLIC_LNURLP_USERNAME}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              LNURL-auth login is currently disabled on this site.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
