import { JsonRpcProvider } from 'ethers';

// Replace with your RPC URL
const RPC_URL =
  process.env.VERCEL_ENV === 'production'
    ? 'https://blessnet-sepolia-testnet.rpc.caldera.xyz/http' // 'https://blessnet.calderachain.xyz/http'
    : 'https://blessnet-sepolia-testnet.rpc.caldera.xyz/http';

export const provider = new JsonRpcProvider(RPC_URL);
