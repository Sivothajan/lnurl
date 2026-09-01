import { ExternalLink } from 'lucide-react';

import { CopyButton } from '@/components/custom/lnurl-auth/CopyButton';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export interface PlaygroundEndpoint {
  method: 'GET' | 'POST';
  label: string;
  url: string;
  description: string;
}

function MethodContainer({
  method,
  children,
}: {
  method: 'GET' | 'POST';
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-md border p-3 transition-colors sm:flex-row sm:items-center ${
        method === 'GET'
          ? 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/30'
          : 'border-amber-300/60 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/30'
      }`}
    >
      {children}
    </div>
  );
}

export function EndpointReference({
  endpoints,
}: {
  endpoints: PlaygroundEndpoint[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Endpoints</CardTitle>
        <CardDescription>
          All LNURL endpoints on this site. Copy any URL to call it directly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {endpoints.map((endpoint) => (
          <MethodContainer key={endpoint.label} method={endpoint.method}>
            <Badge
              variant={endpoint.method === 'POST' ? 'secondary' : 'outline'}
              className={`mt-0.5 shrink-0 ${
                endpoint.method === 'GET'
                  ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                  : 'border-amber-500 text-amber-700 dark:text-amber-400'
              }`}
            >
              {endpoint.method}
            </Badge>
            <div className="min-w-0 flex-1 space-y-1">
              <code className="block break-all text-xs">{endpoint.label}</code>
              <p className="text-sm text-muted-foreground">
                {endpoint.description}
              </p>
            </div>
            <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
              <CopyButton text={endpoint.url} />
              <a
                href={endpoint.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border bg-background p-2 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          </MethodContainer>
        ))}
      </CardContent>
    </Card>
  );
}
