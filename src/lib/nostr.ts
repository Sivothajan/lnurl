import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

const HEX64 = /^[0-9a-fA-F]{64}$/;

interface NostrEvent {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
}

function computeNostrEventId(event: {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}) {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

function verifyNostrEventSignature(event: NostrEvent) {
  if (
    typeof event.sig !== 'string' ||
    !/^[0-9a-fA-F]{128}$/.test(event.sig) ||
    typeof event.pubkey !== 'string' ||
    !HEX64.test(event.pubkey) ||
    typeof event.id !== 'string' ||
    !HEX64.test(event.id)
  ) {
    return false;
  }

  try {
    return schnorr.verify(
      hexToBytes(event.sig),
      hexToBytes(event.id),
      hexToBytes(event.pubkey)
    );
  } catch {
    return false;
  }
}

export interface ValidatedZapRequest {
  event: NostrEvent;
  pubkey: string;
  content: string;
  relays: string[];
  targetEventId?: string;
}

export type ValidateZapRequestResult =
  { ok: false; error: string } | { ok: true; zap: ValidatedZapRequest };

function isTags(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (tag) =>
        Array.isArray(tag) && tag.every((item) => typeof item === 'string')
    )
  );
}

function countTag(tags: string[][], name: string) {
  return tags.filter((tag) => tag[0] === name).length;
}

export function validateZapRequest(params: {
  raw: string;
  amountMsats: number;
  recipientPubkey: string;
}): ValidateZapRequestResult {
  const { raw, amountMsats, recipientPubkey } = params;

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'nostr must be valid JSON.' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'nostr must be a JSON object.' };
  }

  const event = parsed as Record<string, unknown>;

  if (event.kind !== 9734) {
    return {
      ok: false,
      error: 'nostr event must be of kind 9734 (zap request).',
    };
  }

  if (typeof event.pubkey !== 'string' || !HEX64.test(event.pubkey)) {
    return {
      ok: false,
      error: 'nostr event pubkey must be a valid 32-byte hex string.',
    };
  }

  if (
    typeof event.created_at !== 'number' ||
    !Number.isFinite(event.created_at)
  ) {
    return {
      ok: false,
      error: 'nostr event created_at must be a valid timestamp.',
    };
  }

  if (typeof event.content !== 'string') {
    return { ok: false, error: 'nostr event content must be a string.' };
  }

  if (!isTags(event.tags)) {
    return {
      ok: false,
      error: 'nostr event tags must be an array of string arrays.',
    };
  }

  const tags = event.tags;
  const pTags = tags.filter((tag) => tag[0] === 'p');

  if (pTags.length !== 1) {
    return { ok: false, error: 'nostr event must contain exactly one p tag.' };
  }

  const pTarget = pTags[0]?.[1];

  if (typeof pTarget !== 'string' || !HEX64.test(pTarget)) {
    return {
      ok: false,
      error: 'nostr event p tag must be a valid 32-byte hex string.',
    };
  }

  if (pTarget !== recipientPubkey) {
    return {
      ok: false,
      error: 'nostr event p tag does not match the recipient pubkey.',
    };
  }

  if (countTag(tags, 'e') > 1) {
    return { ok: false, error: 'nostr event must contain at most one e tag.' };
  }

  if (countTag(tags, 'a') > 1) {
    return { ok: false, error: 'nostr event must contain at most one a tag.' };
  }

  if (countTag(tags, 'P') > 1) {
    return { ok: false, error: 'nostr event must contain at most one P tag.' };
  }

  if (countTag(tags, 'amount') > 1) {
    return {
      ok: false,
      error: 'nostr event must contain at most one amount tag.',
    };
  }

  const amountTag = tags.find((tag) => tag[0] === 'amount');

  if (amountTag) {
    const amountValue = amountTag[1];

    if (
      typeof amountValue !== 'string' ||
      !/^\d+$/.test(amountValue) ||
      Number(amountValue) !== amountMsats
    ) {
      return {
        ok: false,
        error: 'nostr event amount tag does not match the requested amount.',
      };
    }
  }

  const computedId = computeNostrEventId({
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: 9734,
    tags,
    content: event.content,
  });

  if (typeof event.id === 'string' && event.id !== computedId) {
    return { ok: false, error: 'nostr event id is invalid.' };
  }

  const sigEvent: NostrEvent = {
    id: computedId,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: 9734,
    tags,
    content: event.content,
    sig: typeof event.sig === 'string' ? event.sig : undefined,
  };

  if (!verifyNostrEventSignature(sigEvent)) {
    return { ok: false, error: 'nostr event signature verification failed.' };
  }

  const targetEventId = tags.find((tag) => tag[0] === 'e')?.[1];

  if (targetEventId !== undefined && !HEX64.test(targetEventId)) {
    return {
      ok: false,
      error: 'nostr event e tag must be a valid 32-byte hex string.',
    };
  }

  return {
    ok: true,
    zap: {
      event: { ...sigEvent },
      pubkey: event.pubkey,
      content: event.content,
      relays: tags.find((tag) => tag[0] === 'relays')?.slice(1) ?? [],
      targetEventId,
    },
  };
}
