'use client';

import './globals.css';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Baloo_Thambi_2, IBM_Plex_Mono, Inter } from 'next/font/google';

import { ThemeClassSync } from '@/components/custom/theme/theme-class-sync';
import { Button } from '@/components/ui/button';

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const balooThambi = Baloo_Thambi_2({
  variable: '--font-baloo-thambi-2',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexMono.variable} ${balooThambi.variable} ${inter.variable} antialiased`}
    >
      <head />
      <body>
        <ThemeClassSync />
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>

            <h2 className="mb-2 text-2xl font-bold text-foreground">
              Critical System Failure
            </h2>

            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              A fatal error occurred while rendering the app. Try rebooting the
              interface. If the issue persists, contact{' '}
              <a
                href="mailto:support@example.com"
                className="text-primary underline"
              >
                support@example.com
              </a>
              .
              {error.message && (
                <span className="mt-2 inline-block rounded bg-destructive/10 px-2 py-1 font-mono text-xs text-destructive">
                  Error: {error.message}
                </span>
              )}
            </p>

            <Button type="button" onClick={() => reset()} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reboot System
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
