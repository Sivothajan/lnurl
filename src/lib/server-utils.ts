import { timingSafeEqual } from 'crypto';

import serverEnvConfig from '@/config/server.env.config';

export function verifyInternalSecret(provided: string | null | undefined) {
  const expected = serverEnvConfig.X_INTERNAL_SECRET;

  if (!provided || !expected) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
