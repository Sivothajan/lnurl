'use client';

import { Copy } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { QrCode } from '@/components/custom/lnurl-auth/QrCode';
import { Button } from '@/components/ui/button';

interface Discovery {
  tag: 'login';
  k1: string;
  callback: string;
}

interface StatusResponse {
  authenticated: boolean;
  pubkey?: string;
}

export function LoginPanel({ username }: { username: string }) {
  const [lnurlUrl, setLnurlUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'pending' | 'error'
  >('loading');
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (k1: string) => {
    try {
      const response = await fetch(
        `/lnurlp/callback/auth/status?k1=${encodeURIComponent(k1)}`,
        { cache: 'no-store' }
      );
      const body = (await response.json()) as StatusResponse;

      if (body.authenticated) {
        window.location.reload();
      }
    } catch {
      // Ignore transient polling failures.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const start = async () => {
      try {
        const response = await fetch(
          `/.well-known/lnurl-auth/${encodeURIComponent(username)}`,
          { cache: 'no-store' }
        );
        const body = (await response.json()) as Discovery;

        if (body.tag !== 'login' || !body.k1) {
          if (!cancelled) {
            setStatus('error');
            setError('LNURL-auth is not available on this site.');
          }
          return;
        }

        if (cancelled) return;

        setLnurlUrl(
          new URL(
            `/.well-known/lnurl-auth/${encodeURIComponent(username)}`,
            window.location.origin
          ).toString()
        );
        setStatus('ready');

        pollStatus(body.k1);
        pollTimer = setInterval(() => pollStatus(body.k1), 2000);
      } catch {
        if (!cancelled) {
          setStatus('error');
          setError('Failed to contact the login service.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
    };
  }, [pollStatus, username]);

  const copyUrl = async () => {
    if (!lnurlUrl) return;

    try {
      await navigator.clipboard.writeText(lnurlUrl);
      toast.success('LNURL-auth URL copied');
    } catch {
      toast.error('Could not copy the URL');
    }
  };

  if (status === 'loading') {
    return (
      <p className="text-center text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (status === 'error') {
    return <p className="text-center text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="w-full space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Open this link in your Lightning wallet, approve the login, and this
        page will pick up your session.
      </p>
      <div className="flex flex-col items-center gap-4">
        <QrCode value={lnurlUrl ?? ''} size={180} />
        <div className="flex w-full items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs">
            {lnurlUrl}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copyUrl}>
            <Copy className="size-4" />
          </Button>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Waiting for the wallet to approve the login…
      </p>
    </div>
  );
}
