import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Link2,
  Wallet,
  Zap,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CopyButton } from '@/components/custom/lnurl-auth/CopyButton';
import { QrCode } from '@/components/custom/lnurl-auth/QrCode';
import {
  EndpointReference,
  type PlaygroundEndpoint,
} from '@/components/custom/lnurl-playground/EndpointReference';
import { PayTester } from '@/components/custom/lnurl-playground/PayTester';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import publicEnvConfig from '@/config/public.env.config';
import { fetchFastWithdrawUrl, getSiteUrl } from '@/lib/lnurl';

export const metadata: Metadata = {
  title: 'Lightning address and LNURL tools',
  description:
    'Pay, sign in, request withdrawals, and test LNURL endpoints for any username.',
};

export const dynamic = 'force-dynamic';

function UrlWithCopy({ url }: { url: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
        {url}
      </code>
      <CopyButton text={url} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
        aria-label="Open endpoint"
      >
        <ExternalLink className="size-4" />
      </a>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Zap;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="size-4" />
        </span>
        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </Link>
  );
}

export default async function HomePage() {
  const siteUrl = getSiteUrl();
  const username = publicEnvConfig.NEXT_PUBLIC_LNURLP_USERNAME;
  const host = new URL(siteUrl).hostname;
  const payUrl = new URL(`/.well-known/lnurlp/${username}`, siteUrl).toString();
  const loginUrl = new URL(
    `/.well-known/lnurl-auth/${username}`,
    siteUrl
  ).toString();
  const lightningAddress =
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_IDENTIFIER
      ? `${username}@${host}`
      : username;
  const withdrawEnabled =
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_WITHDRAW_ALLOWED;
  const loginEnabled = publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_LOGIN_ALLOWED;
  const withdrawUrl = withdrawEnabled ? await fetchFastWithdrawUrl() : null;

  const endpoints: PlaygroundEndpoint[] = [
    {
      method: 'GET',
      label: '/lnurlp/check',
      url: new URL('/lnurlp/check', siteUrl).toString(),
      description: 'Server status + timestamp.',
    },
    {
      method: 'GET',
      label: '/.well-known/lnurlp/:username',
      url: payUrl,
      description: 'LNURL-pay discovery.',
    },
    {
      method: 'GET',
      label: '/lnurlp/callback/pay?amount=&comment=',
      url: new URL('/lnurlp/callback/pay', siteUrl).toString(),
      description: 'Create a Lightning payment invoice.',
    },
    {
      method: 'GET',
      label: '/lnurlp/service/pay/verify/:uuid',
      url: new URL('/lnurlp/service/pay/verify/:uuid', siteUrl).toString(),
      description: 'Poll invoice settlement.',
    },
    {
      method: 'GET',
      label: '/lnurlp/service/withdraw',
      url: new URL('/lnurlp/service/withdraw', siteUrl).toString(),
      description: 'LNURL-withdraw discovery.',
    },
    {
      method: 'GET',
      label: '/.well-known/lnurl-auth/:username',
      url: loginUrl,
      description: 'LNURL-auth login discovery.',
    },
  ];

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b bg-muted/30">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-5 w-fit">
              <Zap className="mr-1.5 size-3.5" />
              Public LNURL playground
            </Badge>
            <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl">
              Pay, sign in, and test LNURL for any username.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Try the default address, change the username in the discovery URL,
              or scan wallet-ready QR codes for LNURL-pay, LNURL-auth, and
              LNURL-withdraw.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pay"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <Zap className="mr-2 size-4" />
                Pay with Lightning
              </Link>
              <Link
                href="#tester"
                className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Test the API
              </Link>
            </div>
          </div>

          <Card className="w-full">
            <CardHeader className="items-center text-center">
              <CardTitle className="font-heading text-2xl">
                {lightningAddress}
              </CardTitle>
              <CardDescription>
                Scan or copy the default LNURL-pay discovery URL.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <QrCode value={payUrl} size={220} />
              <UrlWithCopy url={payUrl} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-3">
        <ActionLink
          href="/pay"
          icon={Zap}
          title="Receive sats"
          description="Open the dedicated LNURL-pay page with a focused QR and payment link."
        />
        <ActionLink
          href="/login"
          icon={KeyRound}
          title={loginEnabled ? 'Sign in' : 'Login disabled'}
          description="Use LNURL-auth when enabled, or confirm the current login availability."
        />
        <ActionLink
          href="/withdraw"
          icon={Wallet}
          title={withdrawEnabled ? 'Withdraw' : 'Withdraw disabled'}
          description="Review the LNURL-withdraw flow and current withdrawal availability."
        />
      </section>

      <section className="border-y bg-muted/20">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-2xl font-bold">Live surface</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These are the wallet-facing entry points currently exposed by
                this app.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium">LNURL-pay ready</p>
                  <p className="text-sm text-muted-foreground">
                    Default discovery points to {lightningAddress}; any username
                    path is accepted.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
                <Link2 className="mt-0.5 size-5 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Withdraw URL</p>
                  <p className="break-all text-sm text-muted-foreground">
                    {withdrawUrl ?? 'Disabled in public configuration'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div id="tester" className="scroll-mt-20">
            <PayTester
              minMsats={publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_SENDABLE}
              maxMsats={publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_SENDABLE}
              commentsAllowed={
                publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_COMMENTS_ALLOWED
              }
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <EndpointReference endpoints={endpoints} />
      </section>
    </main>
  );
}
