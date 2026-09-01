import publicEnvConfig from '@/config/public.env.config';

export function getSiteUrl() {
  return (
    publicEnvConfig.NEXT_PUBLIC_SITE_URL || 'https://lnurlp.vercel.app'
  ).replace(/\/$/, '');
}

export async function fetchFastWithdrawUrl() {
  const siteUrl = getSiteUrl();
  const serviceUrl = new URL('/lnurlp/service/withdraw', siteUrl).toString();

  try {
    const response = await fetch(serviceUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return serviceUrl;
    }

    const body = (await response.json()) as {
      status?: string;
      tag?: string;
      k1?: string;
      callback?: string;
      defaultDescription?: string;
      minWithdrawable?: number;
      maxWithdrawable?: number;
    };

    if (
      body.status !== 'OK' ||
      body.tag !== 'withdrawRequest' ||
      typeof body.k1 !== 'string' ||
      !/^[0-9a-fA-F]{64}$/.test(body.k1) ||
      typeof body.callback !== 'string'
    ) {
      return serviceUrl;
    }

    const fastUrl = new URL('/lnurlp/service/withdraw', siteUrl);

    fastUrl.searchParams.set('tag', 'withdrawRequest');
    fastUrl.searchParams.set('k1', body.k1);
    fastUrl.searchParams.set('callback', body.callback);

    if (typeof body.minWithdrawable === 'number') {
      fastUrl.searchParams.set('minWithdrawable', String(body.minWithdrawable));
    }

    if (typeof body.maxWithdrawable === 'number') {
      fastUrl.searchParams.set('maxWithdrawable', String(body.maxWithdrawable));
    }

    if (typeof body.defaultDescription === 'string') {
      fastUrl.searchParams.set('defaultDescription', body.defaultDescription);
    }

    return fastUrl.toString();
  } catch {
    return serviceUrl;
  }
}
