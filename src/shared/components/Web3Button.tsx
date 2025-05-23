"use client";

import { useAccount, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

interface Web3ButtonProps {
  children: React.ReactNode;
  targetChainId: number;
  buttonClassName?: string;
}

export const Web3Button = ({ children, targetChainId, buttonClassName }: Web3ButtonProps) => {
  const { chain, isConnected } = useAccount();
  const { chains: availableChains, switchChain, status: switchChainStatus, error: switchChainError } = useSwitchChain();

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal, mounted, authenticationStatus }) => {
          const ready = mounted && authenticationStatus !== 'loading';
          // Render a disabled button or null while RainbowKit is mounting or checking auth status
          if (!ready) {
            return (
              <Button className={buttonClassName} disabled>
                Loading Wallet...
              </Button>
            );
          }
          return (
            <Button onClick={openConnectModal} type="button" className={buttonClassName}>
              Connect
            </Button>
          );
        }}
      </ConnectButton.Custom>
    );
  }

  if (chain?.id !== targetChainId) {
    const targetChainDetails = availableChains.find(c => c.id === targetChainId);
    const buttonText = targetChainDetails
      ? `Switch to ${targetChainDetails.name}`
      : `Switch to Chain ID ${targetChainId}`;

    return (
      <Button
        onClick={() => switchChain?.({ chainId: targetChainId })}
        disabled={switchChainStatus === 'pending'}
        className={buttonClassName}
        variant="outline" // Consider a variant that indicates a warning or action needed
      >
        {switchChainStatus === 'pending' ? 'Switching Chain...' : buttonText}
        {switchChainError && (
          <span title={switchChainError.message} className="ml-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </span>
        )}
      </Button>
    );
  }

  // Connected and on the right chain
  return <>{children}</>;
};
