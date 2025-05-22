import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Address, Hex } from 'viem';
import ENV from '../../../lib/env';
import ResolverArtifact from '../Resolver.json';

const SCHEMA_REGISTRY_ADDRESS = ENV.SCHEMA_REGISTRY_ADDRESS as Address;
const EAS_CONTRACT_ADDRESS = ENV.EAS_CONTRACT_ADDRESS as Address;

interface ResolverDeploymentResult {
  success: boolean;
  address?: Address;
  txHash?: Hex;
  error?: string;
}

interface DeployResolverStepProps {
  onResolverDeployed: (result: ResolverDeploymentResult) => void;
  onNext: () => void;
  isWalletConnected: boolean;
  initialStatus?: 'pending' | 'success' | 'error';
  deployedAddress?: Address;
}

const DeployResolverStep: React.FC<DeployResolverStepProps> = ({
  onResolverDeployed,
  onNext,
  isWalletConnected,
  initialStatus = 'pending',
  deployedAddress,
}) => {
  const [status, setStatus] = useState<'pending' | 'deploying' | 'success' | 'error'>(
    deployedAddress ? 'success' : initialStatus
  );
  const [error, setError] = useState<string | undefined>(undefined);

  const { address: accountAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const handleDeployResolver = async () => {
    if (!walletClient || !publicClient || !accountAddress) {
      const errMsg = 'Wallet not connected or client not available.';
      setError(errMsg);
      setStatus('error');
      onResolverDeployed({ success: false, error: errMsg });
      return;
    }
    setError(undefined);
    setStatus('deploying');

    try {
      const hash = await walletClient.deployContract({
        abi: ResolverArtifact.abi,
        bytecode: ResolverArtifact.bytecode.object as Hex,
        account: accountAddress,
        args: [ENV.EAS],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === 'success' && receipt.contractAddress) {
        setStatus('success');
        onResolverDeployed({
          success: true,
          address: receipt.contractAddress,
          txHash: hash,
        });
      } else {
        const errMsg = `Resolver deployment failed or contract address not found. Status: ${receipt.status}`;
        setError(errMsg);
        setStatus('error');
        onResolverDeployed({ success: false, error: errMsg, txHash: hash });
      }
    } catch (e: any) {
      console.error('Resolver deployment error:', e);
      const errMsg = e.message || 'Unknown error during resolver deployment.';
      setError(errMsg);
      setStatus('error');
      onResolverDeployed({ success: false, error: errMsg });
    }
  };

  const isLoading = status === 'deploying';

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Step 1: Deploy Resolver Contract</CardTitle>
        <CardDescription>
          Deploy the EAS Resolver contract. This contract will be used to resolve schema UIDs.
          {deployedAddress && status === 'success' && (
            <span className="block text-xs text-green-600 mt-1">Already deployed at: {deployedAddress}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWalletConnected && (
          <p className="text-sm text-destructive">
            Please connect your wallet to proceed.
          </p>
        )}
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleDeployResolver}
            disabled={isLoading || status === 'success' || !isWalletConnected}
            className="w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'pending' && 'Deploy Resolver'}
            {status === 'deploying' && 'Deploying...'}
            {status === 'success' && 'Resolver Deployed'}
            {status === 'error' && 'Retry Deploy'}
          </Button>
          {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
          {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
        </div>
        {status === 'error' && error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
      {status === 'success' && (
        <CardFooter>
          <Button onClick={onNext} className="w-full">
            Next: Register Schemas
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DeployResolverStep;
