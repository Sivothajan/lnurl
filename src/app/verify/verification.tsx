import bolt11 from 'bolt11';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

import { CopyButton } from '@/components/custom/lnurl-auth/CopyButton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSiteUrl } from '@/lib/lnurl';
import { getPayRequest, getWithdrawRequest } from '@/services/lnurlp.service';

type VerificationKind = 'pay' | 'withdraw';

interface DetailRow {
  label: string;
  value: string | number | null | undefined;
}

interface VerificationRecord {
  id: string;
  kind: VerificationKind;
  invoice: string;
  settled: boolean;
  createdAt: Date;
  updatedAt: Date;
  paidAt: Date | null;
  amountMsats: bigint;
  coin: string;
  network: string;
  verifyUrl: string;
  details: DetailRow[];
}

interface DecodedInvoice {
  complete: boolean | null;
  prefix: string | null;
  amountMsats: string | null;
  amountSats: string | null;
  timestamp: string | null;
  expiresAt: string | null;
  description: string | null;
  payeeNode: string | null;
  paymentHash: string | null;
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(value);
}

function formatMsats(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === 'bigint' ? Number(value) : Number(value);

  if (!Number.isFinite(numeric)) {
    return value.toString();
  }

  return `${numeric.toLocaleString('en')} msats`;
}

function getDecodedInvoice(invoice: string): DecodedInvoice | null {
  try {
    const decoded = bolt11.decode(invoice);

    return {
      complete: decoded.complete ?? null,
      prefix: decoded.prefix ?? null,
      amountMsats: decoded.millisatoshis ?? null,
      amountSats:
        decoded.satoshis === null || decoded.satoshis === undefined
          ? null
          : String(decoded.satoshis),
      timestamp: decoded.timestamp
        ? formatDate(new Date(decoded.timestamp * 1000))
        : null,
      expiresAt: decoded.timeExpireDate
        ? formatDate(new Date(decoded.timeExpireDate * 1000))
        : null,
      description: decoded.tagsObject.description ?? null,
      payeeNode: decoded.payeeNodeKey ?? null,
      paymentHash: decoded.tagsObject.payment_hash ?? null,
    };
  } catch {
    return null;
  }
}

async function getVerificationRecord(
  id: string
): Promise<VerificationRecord | null> {
  const siteUrl = getSiteUrl();
  const uuidLike =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      id
    );

  if (uuidLike) {
    const payRecord = await getPayRequest(id);

    if (payRecord) {
      return {
        id,
        kind: 'pay',
        invoice: payRecord.address,
        settled: payRecord.is_paid,
        createdAt: payRecord.created_at,
        updatedAt: payRecord.updated_at,
        paidAt: payRecord.paid_at,
        amountMsats: payRecord.amount,
        coin: payRecord.coin,
        network: payRecord.network,
        verifyUrl: new URL(
          `/lnurlp/service/pay/verify/${id}`,
          siteUrl
        ).toString(),
        details: [
          { label: 'Request type', value: payRecord.tag ?? 'pay' },
          { label: 'Comment', value: payRecord.comment },
          { label: 'Payer pubkey', value: payRecord.payer_pubkey },
          { label: 'Nostr pubkey', value: payRecord.nostr_pubkey },
          { label: 'Deposit status', value: payRecord.deposit_status },
          {
            label: 'Last checked',
            value: formatDate(payRecord.deposit_checked_at),
          },
        ],
      };
    }
  }

  const k1Like = /^[0-9a-fA-F]{64}$/.test(id);

  if (k1Like) {
    const withdrawRecord = await getWithdrawRequest(id);

    if (withdrawRecord) {
      return {
        id,
        kind: 'withdraw',
        invoice: withdrawRecord.address,
        settled: withdrawRecord.is_paid,
        createdAt: withdrawRecord.created_at,
        updatedAt: withdrawRecord.updated_at,
        paidAt: withdrawRecord.paid_at,
        amountMsats: withdrawRecord.amount,
        coin: withdrawRecord.coin,
        network: withdrawRecord.network,
        verifyUrl: new URL(
          `/lnurlp/service/withdraw/verify/${id}`,
          siteUrl
        ).toString(),
        details: [
          { label: 'K1', value: id },
          { label: 'Withdraw id', value: withdrawRecord.withdraw_id },
          { label: 'Payout status', value: withdrawRecord.payout_status },
          {
            label: 'Payout submitted',
            value: formatDate(withdrawRecord.payout_submitted_at),
          },
        ],
      };
    }
  }

  return null;
}

function DetailList({ rows }: { rows: DetailRow[] }) {
  const visibleRows = rows.filter(
    (row) => row.value !== null && row.value !== undefined && row.value !== ''
  );

  if (visibleRows.length === 0) {
    return null;
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {visibleRows.map((row) => (
        <div key={row.label} className="min-w-0 rounded-lg border bg-card p-4">
          <dt className="text-xs font-medium uppercase text-muted-foreground">
            {row.label}
          </dt>
          <dd className="mt-2 break-words text-sm font-medium">
            {String(row.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function VerifySearchForm({ defaultId = '' }: { defaultId?: string }) {
  return (
    <form
      action="/verify"
      className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <label className="sr-only" htmlFor="uuid">
        UUID or k1
      </label>
      <input
        id="uuid"
        name="uuid"
        type="text"
        defaultValue={defaultId}
        placeholder="Paste a payment UUID or withdraw k1"
        className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/40"
      />
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
      >
        <Search className="size-4" />
        Verify
      </button>
    </form>
  );
}

export async function VerificationPageContent({ id }: { id?: string }) {
  const normalizedId = id?.trim() ?? '';
  const record = normalizedId
    ? await getVerificationRecord(normalizedId)
    : null;
  const decoded = record ? getDecodedInvoice(record.invoice) : null;
  const statusIcon = record?.settled ? CheckCircle2 : Clock3;
  const StatusIcon = record ? statusIcon : XCircle;

  return (
    <main className="min-h-svh bg-background text-foreground">
      <section className="border-b bg-muted/30">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
            <div className="min-w-0">
              <Badge variant="outline" className="mb-5 w-fit">
                <ShieldCheck className="mr-1.5 size-3.5" />
                Visual verify
              </Badge>
              <h1 className="font-heading text-3xl font-extrabold leading-tight sm:text-4xl">
                Check a Lightning request.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Paste a payment UUID or withdrawal k1 to see the stored request
                status, invoice, and decoded BOLT11 details.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lookup</CardTitle>
                <CardDescription>
                  Supports pay UUIDs and withdraw k1 values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <VerifySearchForm defaultId={normalizedId} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {record ? (
          <>
            <div className="min-w-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="break-words text-2xl">
                        {record.kind === 'pay'
                          ? 'LNURL-pay request'
                          : 'LNURL-withdraw request'}
                      </CardTitle>
                      <CardDescription className="mt-2 break-all">
                        {record.id}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={record.settled ? 'default' : 'secondary'}
                      className="w-fit"
                    >
                      <StatusIcon className="mr-1.5 size-3.5" />
                      {record.settled ? 'Settled' : 'Pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border bg-card p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Amount
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {formatMsats(record.amountMsats)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Asset
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {record.coin} / {record.network}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Created
                      </p>
                      <p className="mt-2 text-sm font-semibold">
                        {formatDate(record.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg border bg-muted p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Invoice</p>
                      <CopyButton text={record.invoice} />
                    </div>
                    <code className="block break-all text-xs leading-5">
                      {record.invoice}
                    </code>
                  </div>

                  <div className="min-w-0 rounded-lg border bg-muted p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Protocol verify URL</p>
                      <div className="flex items-center gap-1">
                        <CopyButton text={record.verifyUrl} />
                        <a
                          href={record.verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                          aria-label="Open protocol verify URL"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      </div>
                    </div>
                    <code className="block break-all text-xs leading-5">
                      {record.verifyUrl}
                    </code>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h2 className="font-heading text-xl font-bold">
                  Stored details
                </h2>
                <DetailList
                  rows={[
                    ...record.details,
                    { label: 'Paid at', value: formatDate(record.paidAt) },
                    { label: 'Updated', value: formatDate(record.updatedAt) },
                  ]}
                />
              </div>
            </div>

            <aside className="min-w-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ReceiptText className="size-4 text-primary" />
                    Decoded invoice
                  </CardTitle>
                  <CardDescription>
                    BOLT11 fields parsed from the saved invoice.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {decoded ? (
                    <DetailList
                      rows={[
                        {
                          label: 'Complete',
                          value:
                            decoded.complete === null
                              ? null
                              : decoded.complete
                                ? 'Yes'
                                : 'No',
                        },
                        { label: 'Prefix', value: decoded.prefix },
                        {
                          label: 'Amount',
                          value: formatMsats(decoded.amountMsats),
                        },
                        {
                          label: 'Satoshis',
                          value: decoded.amountSats,
                        },
                        { label: 'Timestamp', value: decoded.timestamp },
                        { label: 'Expires', value: decoded.expiresAt },
                        { label: 'Description', value: decoded.description },
                        { label: 'Payment hash', value: decoded.paymentHash },
                        { label: 'Payee node', value: decoded.payeeNode },
                      ]}
                    />
                  ) : (
                    <p className="text-sm leading-6 text-muted-foreground">
                      This invoice could not be decoded as BOLT11.
                    </p>
                  )}
                </CardContent>
              </Card>
            </aside>
          </>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader className="items-center text-center">
              <div className="mb-2 inline-flex size-11 items-center justify-center rounded-md bg-muted">
                <Wallet className="size-5 text-muted-foreground" />
              </div>
              <CardTitle>
                {normalizedId ? 'Request not found' : 'Paste an id to verify'}
              </CardTitle>
              <CardDescription className="max-w-xl">
                {normalizedId
                  ? 'No matching payment UUID or withdrawal k1 was found.'
                  : 'Use a UUID from an LNURL-pay callback or a k1 from an LNURL-withdraw request.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerifySearchForm defaultId={normalizedId} />
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
