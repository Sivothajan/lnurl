import { Loader2, Zap } from 'lucide-react';

export default function Loading() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-background px-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-5 flex size-16 items-center justify-center rounded-full border bg-card shadow-sm">
          <Zap className="size-7 text-primary drop-shadow-sm" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading
        </div>
      </div>
    </main>
  );
}
