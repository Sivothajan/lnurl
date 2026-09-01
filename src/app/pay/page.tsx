import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { CopyButton } from '@/components/custom/lnurl-auth/CopyButton';
import { QrCode } from '@/components/custom/lnurl-auth/QrCode';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import publicEnvConfig from '@/config/public.env.config';
import { getSiteUrl } from '@/lib/lnurl';

export const metadata: Metadata = {
  title: 'Pay',
  description: 'Pay sats via LNURL-pay.',
};

export default async function PayPage() {
  const siteUrl = getSiteUrl();
  const username = publicEnvConfig.NEXT_PUBLIC_LNURLP_USERNAME;
  const payUrl = new URL(`/.well-known/lnurlp/${username}`, siteUrl).toString();
  const host = new URL(siteUrl).hostname;
  const lightningAddress =
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_IDENTIFIER
      ? `${username}@${host}`
      : null;

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
          <CardTitle className="text-2xl">Pay via Lightning</CardTitle>
          {lightningAddress && (
            <p className="text-sm font-medium text-muted-foreground">
              {lightningAddress}
            </p>
          )}
          <CardDescription>
            Scan the QR or open the link in your Lightning wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <QrCode value={payUrl} size={200} />
          <div className="flex w-full items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
              {payUrl}
            </code>
            <CopyButton text={payUrl} />
            <a
              href={payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
          <p className="text-sm text-muted-foreground">
            You can also try the live API in the{' '}
            <Link href="/" className="underline">
              home page
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
