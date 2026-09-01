'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

import { ErrorPageFlag } from '@/components/custom/theme/error-page-flag';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <ErrorPageFlag />
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          The LNURL playground hit an unexpected error. Try again, or check the
          server logs if it keeps happening.
          {error.message && (
            <span className="mt-2 inline-block rounded bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive">
              Error: {error.message}
            </span>
          )}
        </p>
        <Button type="button" onClick={() => reset()} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </main>
  );
}
