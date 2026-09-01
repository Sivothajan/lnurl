import { NextRequest } from 'next/server';

export function corsHeaders(
  req: NextRequest,
  customAllowedOrigin?: string,
  customAllowedMethods?: string,
  customAllowedHeaders?: string
) {
  const origin = customAllowedOrigin ?? req.nextUrl.origin ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': customAllowedMethods ?? 'GET, OPTIONS',
    'Access-Control-Allow-Headers': customAllowedHeaders ?? 'Content-Type',
  };
}
