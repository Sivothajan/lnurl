import { ArrowLeft, FileX } from 'lucide-react';
import Link from 'next/link';

import { ErrorPageFlag } from '@/components/custom/theme/error-page-flag';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground antialiased">
      <ErrorPageFlag />
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
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back Home
        </Link>
      </div>
    </main>
  );
}
