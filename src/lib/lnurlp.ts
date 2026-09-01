import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import publicEnvConfig from '@/config/public.env.config';
import { corsHeaders } from '@/lib/access';
import {
  consumeAuthChallenge,
  hasAuthChallenge,
  verifyAuthSignature,
} from '@/services/lnurlp.service';

type LnurlPayerData = Prisma.InputJsonObject;

export type PayerDataParseResult =
  | { payerData: LnurlPayerData | null; pubkey?: string | null; error?: never }
  | { error: string; payerData?: never; pubkey?: never };

function hasMandatoryPayerData() {
  return (
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_NAME_MANDATORY ||
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_MANDATORY ||
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_PUBKEY_MANDATORY ||
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_IDENTIFIER_MANDATORY
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePayerDataStringField(
  payerData: Record<string, unknown>,
  field: 'name' | 'email' | 'pubkey' | 'identifier',
  mandatory: boolean
) {
  const value = payerData[field];

  if (value === undefined || value === null) {
    return mandatory ? `${field} is required in payerdata.` : null;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${field} in payerdata must be a non-empty string.`;
  }

  if (value.length > 1024) {
    return `${field} in payerdata is too long.`;
  }

  if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'email in payerdata must be a valid email address.';
  }

  if (
    field === 'identifier' &&
    !/^[a-z0-9\-_.]+@[a-z0-9\-_.]+(?:\.[a-z0-9\-_.]+)+$/.test(value)
  ) {
    return 'identifier in payerdata must be a valid internet identifier (user@domain).';
  }

  if (
    field === 'pubkey' &&
    !/^(?:[0-9a-fA-F]{64}|0[23][0-9a-fA-F]{64}|04[0-9a-fA-F]{128})$/.test(value)
  ) {
    return 'pubkey in payerdata must be a valid secp256k1 public key hex string.';
  }

  return null;
}

function validatePayerDataAuthField(payerData: Record<string, unknown>): {
  error?: string;
  pubkey?: string;
} {
  const auth = payerData['auth'];

  if (auth === undefined || auth === null) {
    return {};
  }

  if (!isPlainObject(auth)) {
    return { error: 'auth in payerdata must be an object.' };
  }

  const { key, k1, sig } = auth;

  if (typeof k1 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(k1)) {
    return { error: 'auth k1 in payerdata must be 32 bytes hex.' };
  }

  if (!hasAuthChallenge(k1)) {
    return { error: 'auth challenge is unknown or expired.' };
  }

  const signatureError = verifyAuthSignature({ key, k1, sig });

  if (signatureError) {
    return { error: signatureError };
  }

  consumeAuthChallenge(k1);

  return { pubkey: key as string };
}

export function parseAndValidatePayerData(
  req: NextRequest
): PayerDataParseResult {
  const raw = req.nextUrl.searchParams.get('payerdata');

  if (!raw) {
    return hasMandatoryPayerData()
      ? { error: 'payerdata is required.' }
      : { payerData: null };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'payerdata must be valid JSON.' };
  }

  if (!isPlainObject(parsed)) {
    return { error: 'payerdata must be a JSON object.' };
  }

  const authResult = validatePayerDataAuthField(parsed);

  const fieldError = [
    validatePayerDataStringField(
      parsed,
      'name',
      publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_NAME_MANDATORY
    ),
    validatePayerDataStringField(
      parsed,
      'email',
      publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_MANDATORY
    ),
    validatePayerDataStringField(
      parsed,
      'pubkey',
      publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_PUBKEY_MANDATORY
    ),
    validatePayerDataStringField(
      parsed,
      'identifier',
      publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_IDENTIFIER_MANDATORY
    ),
    authResult.error ?? null,
  ].find((error): error is string => typeof error === 'string');

  if (fieldError) {
    return { error: fieldError };
  }

  return {
    payerData: parsed as LnurlPayerData,
    pubkey: authResult.pubkey ?? null,
  };
}

export function parseMsats(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const amount = Number(value);

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return null;
  }

  return amount;
}

export function getRequestOrigin(req: NextRequest) {
  const forwardedHost = req.headers
    .get('x-forwarded-host')
    ?.split(',')[0]
    ?.trim();

  const host = forwardedHost || req.headers.get('host') || req.nextUrl.host;

  if (!host) {
    return null;
  }

  const forwardedProtocol = req.headers
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();

  const requestProtocol = req.nextUrl.protocol.replace(':', '').toLowerCase();
  const protocol = forwardedProtocol || requestProtocol;

  if (protocol !== 'http' && protocol !== 'https') {
    return null;
  }

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function lnurlError(req: NextRequest, reason: string, status = 200) {
  return NextResponse.json(
    {
      status: 'ERROR' as const,
      reason,
    },
    {
      status,
      headers: corsHeaders(req, '*'),
    }
  );
}
