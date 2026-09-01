import { Wallet, WALLET_REST_API_PROD_URL } from '@binance/wallet';
import { Prisma } from '@prisma/client';
import bolt11 from 'bolt11';
import { randomBytes } from 'crypto';
import { ec as secp256k1 } from 'elliptic';
import { v4 as uuidv4 } from 'uuid';

import publicEnvConfig from '@/config/public.env.config';
import serverEnvConfig from '@/config/server.env.config';
import { prisma } from '@/lib/prisma';

const binanceWallet = new Wallet({
  configurationRestAPI: {
    apiKey: serverEnvConfig.BINANCE_API_KEY,
    apiSecret: serverEnvConfig.BINANCE_API_SECRET,
    basePath: WALLET_REST_API_PROD_URL,
  },
});

export interface LnurlPayResponse {
  status: 'OK';
  tag: 'payRequest';
  commentAllowed: number;
  callback: string;
  minSendable: number;
  maxSendable: number;
  payerData?: {
    name?: { mandatory: boolean };
    email?: { mandatory: boolean };
    pubkey?: { mandatory: boolean };
    identifier?: { mandatory: boolean };
    auth?: { mandatory: boolean; k1: string };
  };
  metadata: string;
  nostr_pubkey?: string;
  nostrPubkey?: string;
  allowsNostr?: boolean;
}
export interface LnurlPayCallbackResponse {
  pr: string;
  routes: [];
  verify: string;
  disposable: boolean;
  successAction?:
    | { tag: 'message'; message: string }
    | { tag: 'url'; description: string; url: string };
}

export interface LnurlWithdrawResponse {
  status: 'OK';
  tag: 'withdrawRequest';
  callback: string;
  k1: string;
  defaultDescription: string;
  minWithdrawable: number;
  maxWithdrawable: number;
  balanceCheck?: string;
  payLink?: string;
}

export interface LnurlAddressRequestResponse {
  status: 'OK';
  tag: 'addressRequest';
  callback: string;
  k1: string;
  description: string;
}

export interface LnurlAddressRequestCallbackResponse {
  status: 'OK';
}

export interface LnurlWithdrawCallbackResponse {
  status: 'OK';
}

interface LightningPayRequestCreateData {
  invoice: string;
  sourceUrl?: string | null;
  coin: string;
  amountMsats: number;
  network: string;
  tag?: string | null;
  comment?: string | null;
  payerData?: Prisma.InputJsonValue | null;
  payerPubkey?: string | null;
  nostrPubkey?: string | null;
}

interface BinanceDepositRecord {
  address?: string;
  coin?: string;
  network?: string;
  status?: number | bigint;
}

interface BinanceWithdrawalRecord {
  address?: string;
  coin?: string;
  network?: string;
  status?: number | bigint;
}

type TagData =
  string | number | Buffer | { [key: string]: unknown } | Array<TagData>;

interface Bolt11Tag {
  tagName: string;
  data: TagData;
}

// ---------- DATABASE ----------

export async function getWithdrawRequest(k1: string) {
  return prisma.lightningWithdrawRequest.findUnique({
    where: { k1 },
  });
}

export async function saveWithdrawRequestData(k1: string, invoice: string) {
  const decoded = decodeBolt11Invoice(invoice);

  if (!decoded) {
    throw new Error('Invalid BOLT11 invoice');
  }

  const amountMsats = getBolt11InvoiceAmountMsats(invoice);

  if (amountMsats === null) {
    throw new Error('BOLT11 invoice does not contain a valid amount');
  }
  const tags = decoded.tags || [];
  const paymentHash =
    tags
      .find((tag: Bolt11Tag) => tag.tagName === 'payment_hash')
      ?.data?.toString() || null;
  const expiry = decoded.timeExpireDate
    ? new Date(decoded.timeExpireDate * 1000).toISOString()
    : null;

  return prisma.lightningWithdrawRequest.create({
    data: {
      k1,
      address: invoice,
      url: `https://lightningdecoder.com/${invoice}`,
      coin: 'BTC',
      amount: BigInt(amountMsats),
      network: 'LIGHTNING',
      prefix: decoded.prefix || null,
      payee_node: decoded.payeeNodeKey || null,
      payment_hash: paymentHash,
      expires_at: expiry,
      is_paid: false,
    },
  });
}

export async function updateWithdrawStatus(k1: string, paid: boolean) {
  await prisma.lightningWithdrawRequest.update({
    where: { k1 },
    data: {
      is_paid: paid,
      paid_at: paid ? new Date() : null,
    },
  });
}

export async function updateWithdrawPayout(k1: string, withdrawId: string) {
  return prisma.lightningWithdrawRequest.update({
    where: { k1 },
    data: {
      withdraw_id: withdrawId,
      payout_status: 4,
      payout_submitted_at: new Date(),
    },
  });
}

export async function getPayRequest(uuid: string) {
  return prisma.lightningPayRequest.findUnique({
    where: { uuid },
  });
}

export async function savePayRequest(
  uuid: string,
  data: LightningPayRequestCreateData
) {
  const decoded = decodeBolt11Invoice(data.invoice);
  const tags = decoded?.tags || [];
  const paymentHash =
    tags
      .find((tag: Bolt11Tag) => tag.tagName === 'payment_hash')
      ?.data?.toString() || null;
  const expiry = decoded?.timeExpireDate
    ? new Date(decoded.timeExpireDate * 1000).toISOString()
    : null;

  return prisma.lightningPayRequest.create({
    data: {
      uuid,
      address: data.invoice,
      url: data.sourceUrl ?? null,
      coin: data.coin,
      amount: BigInt(data.amountMsats),
      network: data.network,
      prefix: decoded?.prefix || null,
      payee_node: decoded?.payeeNodeKey || null,
      payment_hash: paymentHash,
      expires_at: expiry,
      tag: data.tag ?? null,
      comment: data.comment ?? null,
      payer_data: data.payerData ?? undefined,
      payer_pubkey: data.payerPubkey ?? null,
      nostr_pubkey: data.nostrPubkey ?? null,
      is_paid: false,
    },
  });
}

export async function updatePayRequestStatus(
  uuid: string,
  paid: boolean,
  depositRecord?: Prisma.InputJsonObject | null
) {
  await prisma.lightningPayRequest.update({
    where: { uuid },
    data: {
      is_paid: paid,
      paid_at: paid ? new Date() : null,
      deposit_status: depositRecord?.status
        ? Number(depositRecord.status)
        : null,
      deposit_data: depositRecord ?? undefined,
      deposit_checked_at: new Date(),
    },
  });
}

// ---------- BOLT11 ----------

function decodeBolt11Invoice(invoice: string) {
  try {
    return bolt11.decode(invoice);
  } catch (err: unknown) {
    console.error(
      'BOLT11 decode error:',
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export function isBolt11Invoice(invoice: string) {
  try {
    const decoded = bolt11.decode(invoice);
    return decoded?.complete === true;
  } catch {
    return false;
  }
}

export function getBolt11InvoiceAmountMsats(invoice: string) {
  const decoded = decodeBolt11Invoice(invoice);

  if (!decoded) {
    return null;
  }

  const millisatoshis =
    decoded.millisatoshis === undefined || decoded.millisatoshis === null
      ? null
      : Number(decoded.millisatoshis);
  if (millisatoshis !== null && Number.isFinite(millisatoshis)) {
    return millisatoshis;
  }

  const satoshis =
    decoded.satoshis === undefined || decoded.satoshis === null
      ? null
      : Number(decoded.satoshis);

  if (satoshis !== null && Number.isFinite(satoshis)) {
    return satoshis * 1000;
  }

  return null;
}

// ---------- IDENTIFIERS ----------

export function generateK1() {
  return randomBytes(32).toString('hex');
}

export function generateUUID() {
  return uuidv4();
}

export function validateK1(k1: string) {
  if (typeof k1 !== 'string' || !k1.trim()) {
    return { isValid: false, reason: 'k1 empty' } as const;
  }

  if (!/^[0-9a-fA-F]+$/.test(k1)) {
    return { isValid: false, reason: 'not hex' } as const;
  }

  if (k1.length !== 64) {
    return { isValid: false, reason: 'must be 32 bytes hex' } as const;
  }

  return { isValid: true } as const;
}

// ---------- AUTH CHALLENGES (LUD-18 payerData.auth) ----------

const secp256k1Curve = new secp256k1('secp256k1');

interface AuthChallenge {
  createdAt: number;
}

const authChallenges = new Map<string, AuthChallenge>();

const AUTH_CHALLENGE_TTL_MS = 10 * 60 * 1000;

function pruneAuthChallenges() {
  const now = Date.now();

  for (const [k1, challenge] of authChallenges) {
    if (now - challenge.createdAt > AUTH_CHALLENGE_TTL_MS) {
      authChallenges.delete(k1);
    }
  }
}

export function issueAuthChallenge() {
  pruneAuthChallenges();

  const k1 = randomBytes(32).toString('hex');
  authChallenges.set(k1, { createdAt: Date.now() });

  return k1;
}

export function hasAuthChallenge(k1: string) {
  pruneAuthChallenges();
  return authChallenges.has(k1);
}

export function consumeAuthChallenge(k1: string) {
  pruneAuthChallenges();
  return authChallenges.delete(k1);
}

export function verifyAuthSignature(params: {
  key: unknown;
  k1: unknown;
  sig: unknown;
}) {
  if (typeof params.k1 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(params.k1)) {
    return 'auth k1 in payerdata must be 32 bytes hex.';
  }

  if (
    typeof params.key !== 'string' ||
    (!/^0[23][0-9a-fA-F]{64}$/.test(params.key) &&
      !/^04[0-9a-fA-F]{128}$/.test(params.key))
  ) {
    return 'auth key in payerdata must be a valid secp256k1 public key hex string.';
  }

  if (typeof params.sig !== 'string' || !/^30[0-9a-fA-F]+$/.test(params.sig)) {
    return 'auth sig in payerdata must be a DER-encoded hex string.';
  }

  try {
    const keyPair = secp256k1Curve.keyFromPublic(params.key, 'hex');
    const valid = secp256k1Curve.verify(params.k1, params.sig, keyPair);

    return valid ? null : 'auth signature verification failed.';
  } catch {
    return 'auth signature verification failed.';
  }
}

// ---------- ADDRESS REQUESTS (LUD-23) ----------

interface AddressRequestChallenge {
  createdAt: number;
}

const addressRequestChallenges = new Map<string, AddressRequestChallenge>();

const ADDRESS_REQUEST_TTL_MS = 10 * 60 * 1000;

function pruneAddressRequestChallenges() {
  const now = Date.now();

  for (const [k1, challenge] of addressRequestChallenges) {
    if (now - challenge.createdAt > ADDRESS_REQUEST_TTL_MS) {
      addressRequestChallenges.delete(k1);
    }
  }
}

export function issueAddressRequestK1() {
  pruneAddressRequestChallenges();

  const k1 = randomBytes(32).toString('hex');
  addressRequestChallenges.set(k1, { createdAt: Date.now() });

  return k1;
}

export function hasAddressRequestK1(k1: string) {
  pruneAddressRequestChallenges();
  return addressRequestChallenges.has(k1);
}

export function consumeAddressRequestK1(k1: string) {
  pruneAddressRequestChallenges();
  return addressRequestChallenges.delete(k1);
}

// ---------- BINANCE LIGHTNING ----------

function msatsToBtc(msats: number) {
  return Number((msats / 1000 / 100_000_000).toFixed(11));
}

export async function createBinanceLightningInvoice(amountMsats: number) {
  if (!Number.isSafeInteger(amountMsats) || amountMsats <= 0) {
    throw new Error('amountMsats must be a positive safe integer');
  }

  const amountBTC = msatsToBtc(amountMsats);
  const response = await binanceWallet.restAPI.depositAddress({
    coin: publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
    network: serverEnvConfig.BINANCE_NETWORK,
    amount: amountBTC,
    recvWindow: 60_000,
  });

  const data = await response.data();
  const invoice = data.address;

  if (!invoice) {
    throw new Error('Binance deposit-address response did not contain address');
  }

  if (serverEnvConfig.BINANCE_NETWORK === 'LIGHTNING') {
    if (!isBolt11Invoice(invoice)) {
      throw new Error('Binance did not return a valid BOLT11 invoice');
    }

    const invoiceMsats = getBolt11InvoiceAmountMsats(invoice);

    if (invoiceMsats !== amountMsats) {
      throw new Error(
        `Binance invoice amount mismatch: requested ${amountMsats} msats, got ${invoiceMsats ?? 'unknown'} msats`
      );
    }
  }

  return {
    invoice,
    binanceDeposit: {
      ...data,
      network: serverEnvConfig.BINANCE_NETWORK,
    },
  };
}

export async function checkBinanceLightningDepositStatus(invoice: string) {
  const response = await binanceWallet.restAPI.depositHistory({
    includeSource: true,
    coin: publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
    status: 1,
    limit: 100,
    recvWindow: 60_000,
  });

  const result = await response.data();
  const matchedRecord = Array.isArray(result)
    ? result.find((record) => {
        const deposit = record as BinanceDepositRecord;

        return (
          deposit.address === invoice &&
          deposit.coin === publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN &&
          (!deposit.network ||
            deposit.network === serverEnvConfig.BINANCE_NETWORK) &&
          Number(deposit.status) === 1
        );
      })
    : null;

  return {
    settled: Boolean(matchedRecord),
    depositRecord: matchedRecord
      ? (JSON.parse(JSON.stringify(matchedRecord)) as Prisma.InputJsonObject)
      : null,
  };
}

export async function checkBinanceLightningWithdrawStatus(invoice: string) {
  const response = await binanceWallet.restAPI.withdrawHistory({
    coin: publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
    status: 6,
    limit: 100,
    recvWindow: 60_000,
  });

  const result = await response.data();

  return (
    Array.isArray(result) &&
    result.some(
      (record: BinanceWithdrawalRecord) =>
        record.address === invoice &&
        record.coin === publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN &&
        (!record.network ||
          record.network === serverEnvConfig.BINANCE_NETWORK) &&
        Number(record.status) === 6
    )
  );
}

export async function checkBinanceLightningWithdrawProcessing(invoice: string) {
  const response = await binanceWallet.restAPI.withdrawHistory({
    coin: publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
    status: 4,
    limit: 100,
    recvWindow: 60_000,
  });

  const result = await response.data();

  return (
    Array.isArray(result) &&
    result.some(
      (record: BinanceWithdrawalRecord) =>
        record.address === invoice &&
        record.coin === publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN &&
        (!record.network ||
          record.network === serverEnvConfig.BINANCE_NETWORK) &&
        Number(record.status) === 4
    )
  );
}

export async function payBinanceLightningWithdraw(
  invoice: string,
  amountMsats: number,
  withdrawOrderId: string
) {
  if (!Number.isSafeInteger(amountMsats) || amountMsats <= 0) {
    throw new Error('amountMsats must be a positive safe integer');
  }

  const amountBTC = msatsToBtc(amountMsats);
  const response = await binanceWallet.restAPI.withdraw({
    coin: publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
    address: invoice,
    amount: amountBTC,
    network: serverEnvConfig.BINANCE_NETWORK,
    withdrawOrderId,
    recvWindow: 60_000,
  });

  return response.data();
}
