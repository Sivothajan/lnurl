import type { Metadata } from 'next';

import { VerificationPageContent } from '../verification';

export const metadata: Metadata = {
  title: 'Verify request',
  description: 'Visually verify an LNURL-pay or LNURL-withdraw request.',
};

export const dynamic = 'force-dynamic';

export default async function VerifyIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <VerificationPageContent id={id} />;
}
