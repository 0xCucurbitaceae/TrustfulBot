/**
 * This file is here to allow AI to read the available environment variables
 */

const ENV = {
  // BLESSNET
  BLESSNET_API_ACCOUNT: process.env.BLESSNET_API_ACCOUNT!,
  BLESSNET_API_KEY: process.env.BLESSNET_API_KEY!,
  PLATFORM: "process.env.PLATFORM!",
  // TELEGRAM
  BOT_TOKEN: process.env.BOT_TOKEN!,
  WEBHOOK_HOST: process.env.WEBHOOK_HOST!,
  GROUP_ID: Number(process.env.GROUP_ID!),
  // DATABASE
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE!,
  // RPC
  RPC_URL: process.env.RPC_URL!,
  CHAIN_ID: Number(process.env.CHAIN_ID!),
  // TRUSTFUL
  MANAGER_UID: process.env.MANAGER_UID!,
  VILLAGER_UID: process.env.VILLAGER_UID!,
  EVENT_UID: process.env.EVENT_UID!,
  RESPONSE_UID: process.env.RESPONSE_UID!,
  // CONTRACTS
  RESOLVER: process.env.RESOLVER!,
  EAS: process.env.EAS!,
  ENTRYPOINT: '0x0000000000160d2F18960e14a6626eDEcBd16121',
};

export default ENV;