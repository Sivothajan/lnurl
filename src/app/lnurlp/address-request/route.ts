import {
  getLnurlpAddressRequestHandler,
  optionsHandler,
} from '@/controllers/lnurlp.controller';

export const runtime = 'nodejs';

export { getLnurlpAddressRequestHandler as GET };

export { optionsHandler as OPTIONS };
