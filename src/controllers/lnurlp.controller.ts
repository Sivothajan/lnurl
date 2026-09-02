import { NextRequest, NextResponse } from 'next/server';

import publicEnvConfig from '@/config/public.env.config';
import { corsHeaders } from '@/lib/access';
import {
  getRequestOrigin,
  lnurlError,
  parseAndValidatePayerData,
  parseMsats,
} from '@/lib/lnurlp';
import type { ValidatedZapRequest } from '@/lib/nostr';
import { validateZapRequest } from '@/lib/nostr';
import { verifyInternalSecret } from '@/lib/server-utils';
import { getCurrentWeekTimestamp } from '@/lib/time';
import {
  AUTH_SESSION_COOKIE_NAME,
  clearAuthSessionCookie,
  createAuthSessionCookie,
  getAuthSession,
  readAuthSession,
  recordAuthSession,
} from '@/services/auth-session.service';
import {
  checkBinanceLightningDepositStatus,
  checkBinanceLightningWithdrawProcessing,
  checkBinanceLightningWithdrawStatus,
  consumeAddressRequestK1,
  consumeAuthChallenge,
  createBinanceLightningInvoice,
  generateK1,
  generateUUID,
  getBolt11InvoiceAmountMsats,
  getPayRequest,
  getWithdrawRequest,
  hasAddressRequestK1,
  hasAuthChallenge,
  isBolt11Invoice,
  issueAddressRequestK1,
  issueAuthChallenge,
  LnurlAddressRequestCallbackResponse,
  LnurlAddressRequestResponse,
  LnurlPayCallbackResponse,
  LnurlPayResponse,
  LnurlWithdrawCallbackResponse,
  LnurlWithdrawResponse,
  payBinanceLightningWithdraw,
  savePayRequest,
  saveWithdrawRequestData,
  updatePayRequestStatus,
  updateWithdrawPayout,
  updateWithdrawStatus,
  validateK1,
  verifyAuthSignature,
} from '@/services/lnurlp.service';
import {
  notifyAddressRequest,
  notifyWithdrawRequest,
} from '@/services/ntfy.service';

// ---------- COMMON ----------

export async function optionsHandler(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req, '*'),
  });
}

export async function postOptionsHandler(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req, '*', 'POST, OPTIONS'),
  });
}

// ---------- /lnurlp/check ----------

export async function getLnurlpCheckHandler(req: NextRequest) {
  return NextResponse.json(
    {
      status: 'OK',
      timestamp: getCurrentWeekTimestamp(),
    },
    {
      headers: corsHeaders(req, '*'),
    }
  );
}

// ---------- /.well-known/lnurlp/[username] ----------

export async function getLnurlpWellKnownHandler(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const { username } = await context.params;

  if (!username) {
    return lnurlError(req, 'Username is required.', 400);
  }
  if (username.length > 64) {
    return lnurlError(
      req,
      'Username is too long. Maximum length is 64 characters.',
      400
    );
  }

  const origin = getRequestOrigin(req);

  if (!origin) {
    return lnurlError(req, 'Unable to determine request origin.');
  }

  const hostname = new URL(origin).hostname;

  let user = username;
  let tag: string | null = null;

  const plusIndex = username.indexOf('+');

  if (plusIndex >= 0) {
    user = username.slice(0, plusIndex);
    tag = username.slice(plusIndex + 1);

    if (!user) {
      return lnurlError(req, 'Username is required.', 400);
    }

    if (!tag) {
      return lnurlError(req, 'Tag cannot be empty.', 400);
    }
  }

  const isEmailIdentifier =
    publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_IDENTIFIER;

  const identifierType = isEmailIdentifier ? 'text/email' : 'text/identifier';

  const identifier = isEmailIdentifier ? `${user}@${hostname}` : user;

  const description = tag
    ? isEmailIdentifier
      ? `Sats for email: ${identifier} with tag: ${tag}`
      : `Sats for identifier: ${identifier} with tag: ${tag}`
    : isEmailIdentifier
      ? `Sats for email: ${identifier}`
      : `Sats for identifier: ${identifier}`;

  const metadata: Array<[string, string]> = [
    [identifierType, identifier],
    ['text/plain', description],
  ];

  if (tag) {
    metadata.push(['text/tag', tag]);
  }

  if (publicEnvConfig.NEXT_PUBLIC_LNURLP_LONG_DESCRIPTION) {
    metadata.push([
      'text/long-desc',
      publicEnvConfig.NEXT_PUBLIC_LNURLP_LONG_DESCRIPTION,
    ]);
  }

  const payerData: LnurlPayResponse['payerData'] = {
    name: {
      mandatory: publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_NAME_MANDATORY,
    },
    email: {
      mandatory: publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_EMAIL_MANDATORY,
    },
    pubkey: {
      mandatory: publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_PUBKEY_MANDATORY,
    },
    identifier: {
      mandatory: publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_IDENTIFIER_MANDATORY,
    },
  };

  if (publicEnvConfig.NEXT_PUBLIC_LNURLP_AUTH_ALLOWED) {
    payerData.auth = {
      mandatory: false,
      k1: issueAuthChallenge(),
    };
  }

  const body: LnurlPayResponse = {
    status: 'OK',
    tag: 'payRequest',
    callback: new URL('/lnurlp/callback/pay', origin).toString(),
    minSendable: publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_SENDABLE,
    maxSendable: publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_SENDABLE,
    commentAllowed: publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_COMMENTS_ALLOWED
      ? 255
      : 0,
    payerData,
    metadata: JSON.stringify(metadata),
  };

  if (publicEnvConfig.NEXT_PUBLIC_LNURLP_ALLOWS_NOSTR) {
    if (publicEnvConfig.NEXT_PUBLIC_NOSTR_PUBLIC_KEY) {
      body.nostr_pubkey = publicEnvConfig.NEXT_PUBLIC_NOSTR_PUBLIC_KEY;
    }

    if (publicEnvConfig.NEXT_PUBLIC_NOSTR_HEX_PUBLIC_KEY) {
      body.nostrPubkey = publicEnvConfig.NEXT_PUBLIC_NOSTR_HEX_PUBLIC_KEY;
    }

    body.allowsNostr = true;
  }

  return NextResponse.json(body, {
    headers: corsHeaders(req, '*'),
  });
}

// ---------- /.well-known/lnurl-auth/[username] ----------

export async function getLnurlpWellKnownAuthHandler(
  req: NextRequest,
  _context: { params: Promise<{ username: string }> }
) {
  if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_LOGIN_ALLOWED) {
    return lnurlError(req, 'LNURL-auth is not available.');
  }

  const origin = getRequestOrigin(req);

  if (!origin) {
    return lnurlError(req, 'Unable to determine request origin.');
  }

  const k1 = issueAuthChallenge();

  return NextResponse.json(
    {
      tag: 'login',
      k1,
      callback: new URL('/lnurlp/callback/auth', origin).toString(),
    },
    {
      headers: corsHeaders(req, '*'),
    }
  );
}

// ---------- /lnurlp/callback/auth ----------

export async function getLnurlpCallbackAuthHandler(req: NextRequest) {
  try {
    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_LOGIN_ALLOWED) {
      return lnurlError(req, 'LNURL-auth is not available.');
    }

    const searchParams = req.nextUrl.searchParams;
    const k1 = searchParams.get('k1');
    const key = searchParams.get('key');
    const sig = searchParams.get('sig');

    if (typeof k1 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(k1)) {
      return lnurlError(req, 'auth k1 must be 32 bytes hex.');
    }

    if (
      typeof key !== 'string' ||
      (!/^0[23][0-9a-fA-F]{64}$/.test(key) && !/^04[0-9a-fA-F]{128}$/.test(key))
    ) {
      return lnurlError(
        req,
        'auth key must be a valid secp256k1 public key hex string.'
      );
    }

    if (typeof sig !== 'string' || !/^30[0-9a-fA-F]+$/.test(sig)) {
      return lnurlError(req, 'auth sig must be a DER-encoded hex string.');
    }

    if (!hasAuthChallenge(k1)) {
      return lnurlError(req, 'auth challenge is unknown or expired.');
    }

    const signatureError = verifyAuthSignature({ key, k1, sig });

    if (signatureError) {
      return lnurlError(req, signatureError);
    }

    consumeAuthChallenge(k1);
    recordAuthSession(k1, key);

    const sessionCookie = createAuthSessionCookie(key);

    return NextResponse.json(
      {
        status: 'OK',
        pubkey: key,
      },
      {
        headers: {
          ...corsHeaders(req, '*'),
          'Set-Cookie': sessionCookie,
        },
      }
    );
  } catch (err) {
    console.error('Error in /lnurlp/callback/auth:', err);

    return lnurlError(req, 'Unable to process the login request.');
  }
}

// ---------- /lnurlp/callback/auth/status ----------

export async function getLnurlpCallbackAuthStatusHandler(req: NextRequest) {
  try {
    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_LOGIN_ALLOWED) {
      return lnurlError(req, 'LNURL-auth is not available.');
    }

    const k1 = req.nextUrl.searchParams.get('k1');

    if (typeof k1 !== 'string' || !/^[0-9a-fA-F]{64}$/.test(k1)) {
      return lnurlError(req, 'auth k1 must be 32 bytes hex.');
    }

    const pubkey = getAuthSession(k1);

    if (!pubkey) {
      return NextResponse.json(
        { authenticated: false },
        { headers: corsHeaders(req, '*') }
      );
    }

    return NextResponse.json(
      {
        authenticated: true,
        pubkey,
      },
      {
        headers: {
          ...corsHeaders(req, '*'),
          'Set-Cookie': createAuthSessionCookie(pubkey),
        },
      }
    );
  } catch (err) {
    console.error('Error in /lnurlp/callback/auth/status:', err);

    return lnurlError(req, 'Unable to check the login status.');
  }
}

// ---------- /lnurlp/callback/auth/logout ----------

export async function postLnurlpCallbackAuthLogoutHandler(req: NextRequest) {
  const origin = getRequestOrigin(req);
  const response = NextResponse.redirect(
    new URL('/login', origin ?? req.nextUrl.origin),
    303
  );

  response.headers.set('Set-Cookie', clearAuthSessionCookie());

  return response;
}

// ---------- /lnurlp/callback/pay ----------

export async function getLnurlpCallbackPayHandler(req: NextRequest) {
  try {
    const origin = getRequestOrigin(req);

    if (!origin) {
      return lnurlError(req, 'Unable to determine request origin.');
    }

    const amountMsats = parseMsats(req.nextUrl.searchParams.get('amount'));

    if (amountMsats === null) {
      return lnurlError(
        req,
        'Amount must be a positive integer in millisatoshis.'
      );
    }

    if (
      amountMsats < publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_SENDABLE ||
      amountMsats > publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_SENDABLE
    ) {
      return lnurlError(
        req,
        `Amount must be between ${publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_SENDABLE} and ${publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_SENDABLE} millisatoshis.`
      );
    }

    const commentParam = req.nextUrl.searchParams.get('comment');
    const comment = commentParam?.length ? commentParam : null;

    if (comment !== null) {
      if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_COMMENTS_ALLOWED) {
        return lnurlError(req, 'Comments are not allowed.');
      }

      if (comment.length > 255) {
        return lnurlError(
          req,
          'Comment is too long. Maximum length is 255 characters.'
        );
      }
    }

    const payerDataResult = parseAndValidatePayerData(req);

    if (payerDataResult.error) {
      return lnurlError(req, payerDataResult.error);
    }

    const nostrParam = req.nextUrl.searchParams.get('nostr');
    let zap: ValidatedZapRequest | null = null;

    if (nostrParam) {
      if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_ALLOWS_NOSTR) {
        return lnurlError(req, 'Nostr zaps are not allowed.');
      }

      const recipientPubkey = publicEnvConfig.NEXT_PUBLIC_NOSTR_HEX_PUBLIC_KEY;

      if (!recipientPubkey) {
        return lnurlError(req, 'Nostr recipient pubkey is not configured.');
      }

      const zapResult = validateZapRequest({
        raw: nostrParam,
        amountMsats,
        recipientPubkey,
      });

      if (!zapResult.ok) {
        return lnurlError(req, zapResult.error);
      }

      zap = zapResult.zap;
    }

    const sessionPubkey = readAuthSession(
      req.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null
    );
    const payerPubkey =
      zap?.pubkey ?? payerDataResult.pubkey ?? sessionPubkey ?? null;

    const finalComment =
      comment ?? (zap?.content ? zap.content.slice(0, 255) : null);

    const { invoice, binanceDeposit } =
      await createBinanceLightningInvoice(amountMsats);

    const uuid = generateUUID();

    await savePayRequest(uuid, {
      invoice,
      sourceUrl: binanceDeposit.url ?? null,
      coin: binanceDeposit.coin ?? publicEnvConfig.NEXT_PUBLIC_LNURLP_COIN,
      amountMsats,
      network: binanceDeposit.network,
      tag: zap ? 'zap' : null,
      comment: finalComment,
      payerData: zap
        ? {
            ...(payerDataResult.payerData ?? {}),
            nostr: {
              id: zap.event.id ?? null,
              pubkey: zap.event.pubkey,
              created_at: zap.event.created_at,
              kind: zap.event.kind,
              tags: zap.event.tags,
              content: zap.event.content,
              sig: zap.event.sig ?? null,
            },
          }
        : payerDataResult.payerData,
      payerPubkey,
      nostrPubkey: publicEnvConfig.NEXT_PUBLIC_NOSTR_PUBLIC_KEY ?? null,
    });

    const verifyUrl = new URL(
      `/lnurlp/service/pay/verify/${uuid}`,
      origin
    ).toString();
    const visualVerifyUrl = new URL(`/verify/${uuid}`, origin).toString();

    const successAction =
      publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_MESSAGE_IN_SUCCESS_ACTION
        ? {
            tag: 'message' as const,
            message: 'Thanks, sats received!',
          }
        : {
            tag: 'url' as const,
            description: 'Thanks for your sats, verify your payment',
            url: visualVerifyUrl,
          };

    const response: LnurlPayCallbackResponse = {
      pr: invoice,
      routes: [],
      verify: verifyUrl,
      disposable: zap
        ? true
        : publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_DISPOSABLE_ADDRESS,
      successAction,
    };

    return NextResponse.json(response, {
      headers: corsHeaders(req, '*'),
    });
  } catch (err) {
    console.error('Error in /lnurlp/callback/pay:', err);

    return lnurlError(req, 'Unable to create Lightning invoice.');
  }
}

// ---------- /lnurlp/service/pay/verify/[uuid] ----------

export async function getLnurlpServicePayVerifyHandler(
  req: NextRequest,
  context: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await context.params;

    if (!uuid) {
      return lnurlError(req, 'Payment request not found.', 404);
    }

    const record = await getPayRequest(uuid);
    const invoice = record?.address;

    if (!record || !invoice) {
      return lnurlError(req, 'Payment request not found.', 404);
    }

    const wasSettled = record.is_paid === true;
    const { settled, depositRecord } =
      await checkBinanceLightningDepositStatus(invoice);

    if (wasSettled !== settled || settled) {
      await updatePayRequestStatus(uuid, settled, depositRecord);
    }

    return NextResponse.json(
      {
        status: 'OK',
        settled,
        preimage: null,
        pr: invoice,
        payerPubkey: record.payer_pubkey ?? null,
      },
      {
        headers: corsHeaders(req, '*'),
      }
    );
  } catch (err) {
    console.error('Error in /lnurlp/service/pay/verify/[uuid]:', err);

    return lnurlError(req, 'Payment request not found.', 404);
  }
}

// ---------- /lnurlp/service/withdraw ----------

export async function getLnurlpServiceWithdrawHandler(req: NextRequest) {
  const origin = getRequestOrigin(req);

  if (!origin) {
    return lnurlError(req, 'Unable to determine request origin.');
  }

  if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_WITHDRAW_ALLOWED) {
    return lnurlError(req, 'LNURL-withdraw is not available.');
  }

  const serviceUrl = new URL('/lnurlp/service/withdraw', origin).toString();
  const payLink = new URL(
    `/.well-known/lnurlp/${publicEnvConfig.NEXT_PUBLIC_LNURLP_USERNAME}`,
    origin
  ).toString();

  const body: LnurlWithdrawResponse = {
    status: 'OK',
    tag: 'withdrawRequest',
    callback: new URL('/lnurlp/callback/withdraw', origin).toString(),
    k1: generateK1(),
    defaultDescription:
      publicEnvConfig.NEXT_PUBLIC_LNURLP_WITHDRAW_DEFAULT_DESCRIPTION,
    minWithdrawable: publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_WITHDRAWABLE,
    maxWithdrawable: publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_WITHDRAWABLE,
    balanceCheck: serviceUrl,
    payLink,
  };

  return NextResponse.json(body, {
    headers: corsHeaders(req, '*'),
  });
}

// ---------- /lnurlp/callback/withdraw ----------

export async function getLnurlpCallbackWithdrawHandler(req: NextRequest) {
  try {
    const origin = getRequestOrigin(req);

    if (!origin) {
      return lnurlError(req, 'Unable to determine request origin.');
    }

    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_WITHDRAW_ALLOWED) {
      return lnurlError(req, 'LNURL-withdraw is not available.');
    }

    const k1 = req.nextUrl.searchParams.get('k1');
    const invoice = req.nextUrl.searchParams.get('pr');

    if (!k1) {
      return lnurlError(req, 'k1 is required.');
    }

    const k1Validation = validateK1(k1);

    if (!k1Validation.isValid) {
      return lnurlError(req, `k1 is invalid: ${k1Validation.reason}.`);
    }

    if (!invoice) {
      return lnurlError(req, 'pr is required.');
    }

    if (!isBolt11Invoice(invoice)) {
      return lnurlError(req, 'Invalid BOLT11 invoice.');
    }

    const amountMsats = getBolt11InvoiceAmountMsats(invoice);

    if (amountMsats === null) {
      return lnurlError(req, 'BOLT11 invoice does not contain a valid amount.');
    }

    if (
      amountMsats < publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_WITHDRAWABLE ||
      amountMsats > publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_WITHDRAWABLE
    ) {
      return lnurlError(
        req,
        `Amount must be between ${publicEnvConfig.NEXT_PUBLIC_LNURLP_MIN_WITHDRAWABLE} and ${publicEnvConfig.NEXT_PUBLIC_LNURLP_MAX_WITHDRAWABLE} millisatoshis.`
      );
    }

    const existing = await getWithdrawRequest(k1);

    if (existing) {
      return lnurlError(req, 'k1 has already been used.');
    }

    await saveWithdrawRequestData(k1, invoice);

    const visualVerifyUrl = new URL(`/verify/${k1}`, origin).toString();

    try {
      await notifyWithdrawRequest(invoice, amountMsats, k1, visualVerifyUrl);
    } catch (err) {
      console.error('Error notifying LNURL-withdraw request:', err);
    }

    const response: LnurlWithdrawCallbackResponse = { status: 'OK' };

    return NextResponse.json(response, {
      headers: corsHeaders(req, '*'),
    });
  } catch (err) {
    console.error('Error in /lnurlp/callback/withdraw:', err);

    return lnurlError(req, 'Unable to process the withdrawal request.');
  }
}

// ---------- /lnurlp/service/withdraw/verify/[k1] ----------

export async function getLnurlpServiceWithdrawVerifyHandler(
  req: NextRequest,
  context: { params: Promise<{ k1: string }> }
) {
  try {
    const { k1 } = await context.params;

    if (!k1) {
      return lnurlError(req, 'Withdrawal request not found.', 404);
    }

    const record = await getWithdrawRequest(k1);
    const invoice = record?.address;

    if (!record || !invoice) {
      return lnurlError(req, 'Withdrawal request not found.', 404);
    }

    const wasSettled = record.is_paid === true;
    const settled = await checkBinanceLightningWithdrawStatus(invoice);

    if (wasSettled !== settled) {
      await updateWithdrawStatus(k1, settled);
    }

    return NextResponse.json(
      {
        status: 'OK',
        settled,
        pr: invoice,
      },
      {
        headers: corsHeaders(req, '*'),
      }
    );
  } catch (err) {
    console.error('Error in /lnurlp/service/withdraw/verify/[k1]:', err);

    return lnurlError(req, 'Withdrawal request not found.', 404);
  }
}

// ---------- /lnurlp/service/withdraw/[k1]/pay ----------

export async function postLnurlpServiceWithdrawPayHandler(
  req: NextRequest,
  context: { params: Promise<{ k1: string }> }
) {
  try {
    if (!verifyInternalSecret(req.headers.get('x-internal-secret'))) {
      return lnurlError(req, 'Unauthorized.', 401);
    }

    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_WITHDRAW_ALLOWED) {
      return lnurlError(req, 'LNURL-withdraw is not available.');
    }

    const { k1 } = await context.params;

    if (!k1) {
      return lnurlError(req, 'Withdrawal request not found.', 404);
    }

    const record = await getWithdrawRequest(k1);
    const invoice = record?.address;

    if (!record || !invoice) {
      return lnurlError(req, 'Withdrawal request not found.', 404);
    }

    if (record.is_paid === true) {
      return lnurlError(req, 'Withdrawal is already settled.');
    }

    const processing = await checkBinanceLightningWithdrawProcessing(invoice);
    const settled = await checkBinanceLightningWithdrawStatus(invoice);

    if (processing || settled) {
      return lnurlError(
        req,
        'A payout for this invoice is already in progress.'
      );
    }

    const amountMsats = Number(record.amount);

    if (!Number.isSafeInteger(amountMsats) || amountMsats <= 0) {
      return lnurlError(req, 'Invalid withdrawal amount.');
    }

    const result = await payBinanceLightningWithdraw(invoice, amountMsats, k1);
    const withdrawId = result.id ?? null;

    if (withdrawId) {
      await updateWithdrawPayout(k1, withdrawId);
    }

    return NextResponse.json(
      {
        status: 'OK',
        k1,
        amountMsats,
        withdrawId,
      },
      {
        headers: corsHeaders(req, '*'),
      }
    );
  } catch (err) {
    console.error('Error in /lnurlp/service/withdraw/[k1]/pay:', err);

    return lnurlError(req, 'Unable to process the withdrawal payout.');
  }
}

// ---------- /lnurlp/address-request ----------

export async function getLnurlpAddressRequestHandler(req: NextRequest) {
  try {
    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_ADDRESS_REQUEST_ALLOWED) {
      return lnurlError(req, 'addressRequest is not available.');
    }

    const origin = getRequestOrigin(req);

    if (!origin) {
      return lnurlError(req, 'Unable to determine request origin.');
    }

    const response: LnurlAddressRequestResponse = {
      status: 'OK',
      tag: 'addressRequest',
      callback: new URL('/lnurlp/callback/address-request', origin).toString(),
      k1: issueAddressRequestK1(),
      description:
        publicEnvConfig.NEXT_PUBLIC_LNURLP_ADDRESS_REQUEST_DESCRIPTION,
    };

    return NextResponse.json(response, {
      headers: corsHeaders(req, '*'),
    });
  } catch (err) {
    console.error('Error in /lnurlp/address-request:', err);

    return lnurlError(req, 'Unable to process the address request.');
  }
}

// ---------- /lnurlp/callback/address-request ----------

export async function getLnurlpAddressRequestCallbackHandler(req: NextRequest) {
  try {
    if (!publicEnvConfig.NEXT_PUBLIC_LNURLP_IS_ADDRESS_REQUEST_ALLOWED) {
      return lnurlError(req, 'addressRequest is not available.');
    }

    const k1 = req.nextUrl.searchParams.get('k1');
    const address = req.nextUrl.searchParams.get('address');

    if (!k1) {
      return lnurlError(req, 'k1 is required.');
    }

    if (typeof address !== 'string' || !address.trim()) {
      return lnurlError(req, 'address is required.');
    }

    const k1Validation = validateK1(k1);

    if (!k1Validation.isValid) {
      return lnurlError(req, `k1 is invalid: ${k1Validation.reason}.`);
    }

    if (!hasAddressRequestK1(k1)) {
      return lnurlError(req, 'k1 is unknown or has already been used.');
    }

    if (
      !/^[a-z0-9\-_.+]+@[a-z0-9\-_.]+(?:\.[a-z0-9\-_.]+)+$/.test(address.trim())
    ) {
      return lnurlError(req, 'address must be a valid Lightning address.');
    }

    consumeAddressRequestK1(k1);

    try {
      await notifyAddressRequest(address.trim(), k1);
    } catch (err) {
      console.error('Error notifying address request:', err);
    }

    const response: LnurlAddressRequestCallbackResponse = { status: 'OK' };

    return NextResponse.json(response, {
      headers: corsHeaders(req, '*'),
    });
  } catch (err) {
    console.error('Error in /lnurlp/callback/address-request:', err);

    return lnurlError(req, 'Unable to process the address request.');
  }
}
