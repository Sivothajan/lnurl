'use client';

import { Copy, ExternalLink, Loader2, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { QrCode } from '@/components/custom/lnurl-auth/QrCode';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PayTesterProps {
  minMsats: number;
  maxMsats: number;
  commentsAllowed: boolean;
}

interface PayResult {
  pr: string;
  verify: string;
  disposable: boolean;
  successAction?:
    | { tag: 'message'; message: string }
    | { tag: 'url'; description: string; url: string };
}

function formatSats(msats: number) {
  return `${msats / 1000}`;
}

export function PayTester({
  minMsats,
  maxMsats,
  commentsAllowed,
}: PayTesterProps) {
  const [amountSats, setAmountSats] = useState(formatSats(minMsats));
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PayResult | null>(null);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Could not copy the ${label.toLowerCase()}`);
    }
  };

  const submit = async () => {
    setError(null);
    setResult(null);

    const sats = Number(amountSats);

    if (!Number.isFinite(sats) || sats <= 0) {
      setError('Enter a positive amount in sats.');
      return;
    }

    const msats = Math.round(sats * 1000);

    if (msats < minMsats || msats > maxMsats) {
      setError(
        `Amount must be between ${formatSats(minMsats)} and ${formatSats(maxMsats)} sats.`
      );
      return;
    }

    const url = new URL('/lnurlp/callback/pay', window.location.origin);
    url.searchParams.set('amount', String(msats));

    if (comment.trim()) {
      url.searchParams.set('comment', comment.trim());
    }

    setLoading(true);

    try {
      const response = await fetch(url);
      const body = (await response.json()) as PayResult & {
        status?: string;
        reason?: string;
      };

      if (body?.status === 'ERROR') {
        setError(body.reason ?? 'The pay callback returned an error.');
        return;
      }

      setResult(body);
    } catch {
      setError('Request failed. Is the server reachable?');
    } finally {
      setLoading(false);
    }
  };

  const successActionText = result?.successAction
    ? result.successAction.tag === 'message'
      ? result.successAction.message
      : result.successAction.description
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Try the pay API live</CardTitle>
        <CardDescription>
          Calls <code className="text-xs">/lnurlp/callback/pay</code> and shows
          the response. Creates a real, unpaid invoice that expires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (sats)</Label>
            <Input
              id="amount"
              type="number"
              min={formatSats(minMsats)}
              max={formatSats(maxMsats)}
              step="1"
              value={amountSats}
              onChange={(event) => setAmountSats(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Input
              id="comment"
              maxLength={255}
              placeholder={
                commentsAllowed
                  ? 'Optional message for the payee'
                  : 'Comments are disabled on this site'
              }
              value={comment}
              disabled={!commentsAllowed}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={loading}
          className="w-full sm:w-fit"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Zap className="size-4" />
          )}
          {loading ? 'Creating invoice…' : 'Create invoice'}
        </Button>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3 rounded-md border bg-muted/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline">
                {result.disposable ? 'Disposable' : 'Standard'} invoice
              </Badge>
              {result.verify && (
                <Badge variant="secondary">verify available</Badge>
              )}
            </div>

            <div className="flex flex-col items-center gap-4">
              <QrCode value={result.pr} size={180} />

              <div className="w-full space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="text-xs text-muted-foreground">
                    BOLT11 invoice
                  </Label>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(result.pr, 'Invoice')}
                    >
                      <Copy className="size-3.5" />
                      Copy
                    </Button>
                    <a
                      href={`lightning:${result.pr}`}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </a>
                  </div>
                </div>
                <code className="block break-all rounded-md border bg-background px-3 py-2 text-xs">
                  {result.pr}
                </code>
              </div>
            </div>

            {successActionText && (
              <p className="text-sm text-muted-foreground">
                {successActionText}
              </p>
            )}

            {result.verify && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Verify URL
                </Label>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 max-[380px]:grid-cols-[minmax(0,1fr)_auto]">
                  <code className="min-w-0 break-all rounded-md border bg-background px-3 py-2 text-xs leading-5 max-[380px]:col-span-2">
                    {result.verify}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copy(result.verify!, 'Verify URL')}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <a
                    href={result.verify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
