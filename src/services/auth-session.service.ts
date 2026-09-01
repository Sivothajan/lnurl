import { createHmac, timingSafeEqual } from 'crypto';

import serverEnvConfig from '@/config/server.env.config';

export const AUTH_SESSION_COOKIE_NAME = 'lnurl_auth_session';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sign(payload: string) {
  return createHmac('sha256', serverEnvConfig.SESSION_SECRET)
    .update(payload)
    .digest('hex');
}

function createAuthSessionValue(pubkey: string) {
  const payload = Buffer.from(
    JSON.stringify({ pubkey, exp: Date.now() + SESSION_TTL_SECONDS * 1000 })
  ).toString('base64url');
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function createAuthSessionCookie(pubkey: string) {
  return `${AUTH_SESSION_COOKIE_NAME}=${createAuthSessionValue(
    pubkey
  )}; HttpOnly; Path=/; Max-Age=${SESSION_TTL_SECONDS}; Secure; SameSite=Lax`;
}

export function readAuthSession(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }

  const namedCookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_SESSION_COOKIE_NAME}=`));

  const value = namedCookie
    ? namedCookie.slice(AUTH_SESSION_COOKIE_NAME.length + 1)
    : cookieHeader;
  const dotIndex = value.lastIndexOf('.');

  if (dotIndex <= 0) {
    return null;
  }

  const payload = value.slice(0, dotIndex);
  const signature = value.slice(dotIndex + 1);
  const expected = sign(payload);

  if (signature.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
      pubkey: string;
      exp: number;
    };

    if (typeof data.pubkey !== 'string' || typeof data.exp !== 'number') {
      return null;
    }

    if (Date.now() > data.exp) {
      return null;
    }

    return data.pubkey;
  } catch {
    return null;
  }
}

export function clearAuthSessionCookie() {
  return `${AUTH_SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; Secure; SameSite=Lax`;
}

// ---------- PENDING LOGIN POLLING ----------

interface PendingAuth {
  pubkey: string;
  createdAt: number;
}

const pendingAuths = new Map<string, PendingAuth>();

const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;

function prunePendingAuths() {
  const now = Date.now();

  for (const [k1, pending] of pendingAuths) {
    if (now - pending.createdAt > PENDING_AUTH_TTL_MS) {
      pendingAuths.delete(k1);
    }
  }
}

export function recordAuthSession(k1: string, pubkey: string) {
  prunePendingAuths();
  pendingAuths.set(k1, { pubkey, createdAt: Date.now() });
}

export function getAuthSession(k1: string) {
  prunePendingAuths();
  return pendingAuths.get(k1)?.pubkey ?? null;
}
