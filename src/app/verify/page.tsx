import type { Metadata } from 'next';

import { VerificationPageContent } from './verification';

export const metadata: Metadata = {
  title: 'Verify',
  description: 'Visually verify LNURL-pay and LNURL-withdraw requests.',
};

export const dynamic = 'force-dynamic';

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ uuid?: string; id?: string; k1?: string }>;
}) {
  const params = await searchParams;

  return <VerificationPageContent id={params.uuid ?? params.k1 ?? params.id} />;
}
