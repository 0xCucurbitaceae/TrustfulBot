import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ethers } from 'ethers';
import ENV from './env';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves an ENS (Ethereum Name Service) name to an Ethereum address on mainnet.
 * Uses ENV.MAINNET_RPC_URL if available, otherwise falls back to a public RPC.
 * @param ensName The ENS name to resolve (e.g., "vitalik.eth").
 * @returns A promise that resolves to the Ethereum address string or null if not found or an error occurs.
 */
export async function resolveEnsName(
  ensName: string | undefined
): Promise<string | undefined> {
  if (!ensName) {
    return undefined;
  }
  if (ethers.isAddress(ensName)) {
    return ensName;
  }
  let provider;
  if (ENV.MAINNET_RPC_URL) {
    try {
      provider = new ethers.JsonRpcProvider(ENV.MAINNET_RPC_URL, 1);
      // Perform a quick check to see if the provider is functional for mainnet
      const network = await provider.getNetwork();
      if (network.chainId !== 1n) {
        // 1n is the chainId for Ethereum mainnet
        console.warn(
          `MAINNET_RPC_URL (${ENV.MAINNET_RPC_URL}) is not connected to Ethereum mainnet (chainId: ${network.chainId}). Falling back to public RPC.`
        );
        provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
      }
    } catch (error) {
      console.warn(
        `Failed to connect to MAINNET_RPC_URL (${ENV.MAINNET_RPC_URL}): ${error}. Falling back to public RPC.`
      );
      provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
    }
  } else {
    console.log(
      'MAINNET_RPC_URL not set. Falling back to public RPC for ENS resolution.'
    );
    provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
  }

  try {
    const address = await provider.resolveName(ensName);
    return address;
  } catch (error) {
    // Log specific errors if needed, e.g., ENS name not found vs. network issue
    // For 'bad result from backend' or 'ENS name not found', ethers.js usually returns null from resolveName directly.
    // Other errors might be network issues or misconfigurations.
    if (
      error.code === 'UNSUPPORTED_OPERATION' &&
      error.message.includes('resolveName')
    ) {
      console.warn(
        `ENS resolution for '${ensName}' is not supported by the provider or the name is invalid.`
      );
    } else if (error.code === 'NETWORK_ERROR') {
      console.error(
        `Network error while resolving ENS name '${ensName}':`,
        error
      );
    } else {
      console.error(`Error resolving ENS name '${ensName}':`, error);
    }
    return null;
  }
}
