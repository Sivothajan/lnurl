import serverEnvConfig from '@/config/server.env.config';
import { getTime } from '@/lib/time';

interface NotificationResult {
  success: boolean;
  error?: string;
}

async function sendNotification(
  title: string,
  message: string,
  channel = serverEnvConfig.NTFY_CHANEL_NAME,
  clickUrl = ''
): Promise<NotificationResult> {
  if (
    !serverEnvConfig.NTFY_USERNAME ||
    !serverEnvConfig.NTFY_PASSWORD ||
    !serverEnvConfig.NTFY_SERVER_DOMAIN ||
    !channel
  ) {
    return { success: false, error: 'Missing NTFY configuration' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
    Title: title,
    Priority: 'urgent',
    Tags: 'warning',
    Authorization: serverEnvConfig.NTFY_AUTH_HEADER,
  };

  if (clickUrl) {
    headers.Click = clickUrl;
  }

  try {
    const response = await fetch(
      `https://${serverEnvConfig.NTFY_SERVER_DOMAIN}/${channel}`,
      {
        method: 'POST',
        body: message,
        headers,
      }
    );

    if (!response.ok) {
      return { success: false, error: 'Failed to send notification' };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Failed to send notification' };
  }
}

export async function notifyWithdrawRequest(
  invoice: string,
  amountMsats: number,
  k1: string,
  verifyUrl: string
) {
  const message = [
    'For: LNURL Playground',
    `Time: ${getTime()}`,
    `Amount: ${amountMsats} msats`,
    `K1: ${k1}`,
    `Invoice: ${invoice}`,
    'Action: manually approve/reject this withdrawal on Binance.',
    '',
  ].join('\n');

  return sendNotification(
    'LNURL-withdraw Request - Manual Approval Needed',
    message,
    'lnurl-withdraw',
    verifyUrl
  );
}

export async function notifyAddressRequest(address: string, k1: string) {
  const message = [
    'For: LNURL Playground',
    `Time: ${getTime()}`,
    `Lightning address requested: ${address}`,
    `K1: ${k1}`,
    'Action: reply to the requester with the LNURL-pay address when ready.',
    '',
  ].join('\n');

  return sendNotification('LNURL addressRequest', message, 'lnurl-address');
}
