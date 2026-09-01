import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

interface ServerEnvConfig {
  // NTFY
  NTFY_USERNAME: string;
  NTFY_PASSWORD: string;
  NTFY_SERVER_DOMAIN: string;
  NTFY_CHANEL_NAME: string;
  NTFY_AUTH_HEADER: string;

  // Binance
  BINANCE_API_KEY: string;
  BINANCE_API_SECRET: string;
  BINANCE_NETWORK: string;

  // Sessions
  SESSION_SECRET: string;
  X_INTERNAL_SECRET: string;
}

const optionalString = z.string().optional().default('');
const stringWithDefault = (defaultValue: string) =>
  z.string().optional().default(defaultValue);

function base64(str: string) {
  return Buffer.from(str).toString('base64');
}

function basicAuth(user: string, pass: string) {
  return `Basic ${base64(`${user}:${pass}`)}`;
}

const env = createEnv({
  server: {
    NTFY_USERNAME: optionalString,
    NTFY_PASSWORD: optionalString,
    NTFY_SERVER_DOMAIN: optionalString,
    NTFY_CHANEL_NAME: optionalString,

    BINANCE_API_KEY: optionalString,
    BINANCE_API_SECRET: optionalString,
    BINANCE_NETWORK: stringWithDefault('LIGHTNING'),

    SESSION_SECRET: optionalString,
    X_INTERNAL_SECRET: optionalString,
  },
  experimental__runtimeEnv: process.env,
});

const serverEnvConfig: ServerEnvConfig = {
  // NTFY
  NTFY_USERNAME: env.NTFY_USERNAME,
  NTFY_PASSWORD: env.NTFY_PASSWORD,
  NTFY_SERVER_DOMAIN: env.NTFY_SERVER_DOMAIN,
  NTFY_CHANEL_NAME: env.NTFY_CHANEL_NAME,
  NTFY_AUTH_HEADER: basicAuth(env.NTFY_USERNAME, env.NTFY_PASSWORD),

  // Binance
  BINANCE_API_KEY: env.BINANCE_API_KEY,
  BINANCE_API_SECRET: env.BINANCE_API_SECRET,
  BINANCE_NETWORK: env.BINANCE_NETWORK,

  // Sessions
  SESSION_SECRET: env.SESSION_SECRET,
  X_INTERNAL_SECRET: env.X_INTERNAL_SECRET,
};

export default serverEnvConfig;
