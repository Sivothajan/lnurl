'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export function CopyButton({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('LNURL copied to clipboard');
    } catch {
      toast.error('Could not copy the LNURL');
    }
  };

  return (
    <Button type="button" variant="outline" size="icon" onClick={copy}>
      <Copy className="size-4" />
    </Button>
  );
}
