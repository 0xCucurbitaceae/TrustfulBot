/**
 * This file is here to allow AI to read the available environment variables
 */

const ENV = {
  // BLESSNET
  BLESSNET_API_ACCOUNT: process.env.BLESSNET_API_ACCOUNT!,
  BLESSNET_API_KEY: process.env.BLESSNET_API_KEY!,
  PLATFORM: process.env.PLATFORM!,
  // TELEGRAM
  BOT_TOKEN: process.env.BOT_TOKEN!,
  WEBHOOK_HOST: process.env.WEBHOOK_HOST!,
  GROUP_ID: Number(process.env.GROUP_ID!),
  // DATABASE
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE!,
  // RPC
  RPC_URL: process.env.RPC_URL! || 'https://blessnet.calderachain.xyz/http',
  CHAIN_ID: Number(process.env.CHAIN_ID! || 45513),
  // TRUSTFUL
  MANAGER_UID:
    process.env.MANAGER_UID! ||
    '0xad423f1e5500fa4ec171e226b79b26abf8757febcadc3b55bd6382cb64cc0c02',
  VILLAGER_UID:
    process.env.VILLAGER_UID! ||
    '0xd656e39f074b4c6ffdb97c97b2a223d6f589c0f980e5d87c3553dceebaf51cf7',
  EVENT_UID:
    process.env.EVENT_UID! ||
    '0x1f2a0871396c4c6697d9ee0ae62284b3bae6052fa29cdef0c169b9cef9e17465',
  RESPONSE_UID:
    process.env.RESPONSE_UID! ||
    '0xbe0d4949300f97a76d132208620157e9dbcc12bbd3717af4df31485e43bde2fd',
  // CONTRACTS
  RESOLVER: process.env.NEXT_PUBLIC_RESOLVER!,
  SCHEMA_REGISTRY_ADDRESS:
    process.env.NEXT_PUBLIC_SCHEMA_REGISTRY_ADDRESS! ||
    '0x11a459eCC1F3622c7Ba74105206a4B98EDD6D860',
  EAS:
    process.env.NEXT_PUBLIC_EAS! ||
    '0x63cdC79eC1b01E1Ba20344E0B1E412262df52734',
  ENTRYPOINT: '0x0000000000160d2F18960e14a6626eDEcBd16121',
};

export default ENV;