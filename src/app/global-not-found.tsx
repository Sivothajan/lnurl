import './globals.css';

import { ArrowLeft, FileX } from 'lucide-react';
import type { Metadata } from 'next';
import { Baloo_Thambi_2, IBM_Plex_Mono, Inter } from 'next/font/google';

import { ThemeInitScript } from '@/components/custom/theme/theme-init-script';

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

export const metadata: Metadata = {
  title: '404 - Page Not Found | LNURL Playground',
  description: 'The page you are looking for does not exist.',
};

export default function GlobalNotFound() {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${ibmPlexMono.variable} ${balooThambi.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="flex h-full flex-col items-center justify-center bg-background text-foreground antialiased">
        <div className="flex max-w-md flex-col items-center px-4 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card shadow-2xl">
              <FileX className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="mb-2 text-6xl font-bold tracking-tighter text-foreground">
            404
          </h1>
          <h2 className="mb-4 text-2xl font-semibold text-muted-foreground">
            Page Not Found
          </h2>
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
            The page you&#39;re looking for doesn&#39;t exist or has been moved.
            Please check the URL or return home.
          </p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back Home
          </a>
        </div>
      </body>
    </html>
  );
}
