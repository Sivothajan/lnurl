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
import { fetchFastWithdrawUrl } from '@/lib/lnurl';

export const metadata: Metadata = {
  title: 'Withdraw',
  description: 'Withdraw sats via LNURL-withdraw.',
};

export const dynamic = 'force-dynamic';

export default async function WithdrawPage() {
  const withdrawUrl = await fetchFastWithdrawUrl();

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-center justify-center gap-6 px-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to home
      </Link>

      <h1 className="text-2xl font-bold">Withdraw via Lightning</h1>

      <Card className="w-full">
        <CardHeader className="items-center text-center">
          <CardTitle>LNURL-withdraw</CardTitle>
          <CardDescription>
            Withdrawals are reviewed manually before payout.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_WITHDRAW_ALLOWED ? (
            <>
              <QrCode value={withdrawUrl} size={200} />
              <div className="flex w-full items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
                  {withdrawUrl}
                </code>
                <CopyButton text={withdrawUrl} />
                <a
                  href={withdrawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                Scan this QR with your Lightning wallet to request a withdrawal
                of sats.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              LNURL-withdraw is currently disabled on this site.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
