'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { Address, Hex, Log, parseEventLogs } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import ENV from '../../lib/env';
import { ResolverFactoryABI } from './ResolverFactoryABI';
import { DeployedVariablesOutput } from './DeployedVariablesOutput';

const SCHEMA_REGISTRY_ADDRESS = ENV.SCHEMA_REGISTRY_ADDRESS as Address;
const EAS_CONTRACT_ADDRESS = ENV.EAS as Address;

const FACTORY_CONTRACT_ADDRESS = ENV.NEXT_PUBLIC_FACTORY_ADDRESS as Address;

const schemasToRegister = [
  {
    name: 'Role',
    schema: 'string role',
    revocable: true,
    envVarName: 'NEXT_PUBLIC_SCHEMA_UID_ROLE',
  },
  {
    name: 'Status (Non-revocable)',
    schema: 'string status',
    revocable: false,
    envVarName: 'NEXT_PUBLIC_SCHEMA_UID_STATUS_NON_REVOCABLE',
  },
  {
    name: 'Title/Comment',
    schema: 'string title,string comment',
    revocable: false,
    envVarName: 'NEXT_PUBLIC_SCHEMA_UID_TITLE_COMMENT',
  },
  {
    name: 'Status (Revocable)',
    schema: 'bool status',
    revocable: true,
    envVarName: 'NEXT_PUBLIC_SCHEMA_UID_STATUS_REVOCABLE',
  },
];

const DeploySchemaPage = () => {
  const { address: accountAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [resolverAddress, setResolverAddress] = useState<Address | null>(null);
  const [schemaUIDs, setSchemaUIDs] = useState<Record<string, Hex>>({});

  const resetDeploymentState = useCallback(() => {
    setIsDeploying(false);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});
  }, []);

  const handleDeploy = async () => {
    if (!isConnected || !walletClient || !publicClient || !accountAddress) {
      setDeploymentError('Please connect your wallet.');
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});

    let deployedResolverAddress: Address | null = null;
    const deployedSchemaUIDs: Record<string, Hex> = {};

    try {
      // 1. Deploy Resolver Contract via Factory
      setDeploymentError('Deploying Resolver contract via Factory...');
      if (
        !FACTORY_CONTRACT_ADDRESS ||
        FACTORY_CONTRACT_ADDRESS === '0xYOUR_FACTORY_CONTRACT_ADDRESS_HERE'
      ) {
        throw new Error(
          'Factory contract address is not set. Please set NEXT_PUBLIC_FACTORY_ADDRESS in your .env file.'
        );
      }

      // TODO: Confirm managerAddresses or make it configurable
      const managerAddresses = [accountAddress];
      console.log([
        EAS_CONTRACT_ADDRESS,
        SCHEMA_REGISTRY_ADDRESS,
        accountAddress,
        managerAddresses,
      ]);
      const factoryDeployTxHash = await walletClient.writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: ResolverFactoryABI,
        functionName: 'deployResolver',
        args: [
          EAS_CONTRACT_ADDRESS,
          SCHEMA_REGISTRY_ADDRESS,
          accountAddress,
          managerAddresses,
        ],
        account: accountAddress,
      });
      console.log('factoryDeployTxHash', factoryDeployTxHash);

      const factoryDeployReceipt = await publicClient.waitForTransactionReceipt(
        {
          hash: factoryDeployTxHash,
        }
      );

      if (factoryDeployReceipt.status === 'reverted') {
        throw new Error(
          'Factory deployment call for Resolver failed. Check transaction on block explorer.'
        );
      }

      // Parse event to get the new resolver address
      // and the schema UIDs
      const event = parseEventLogs({
        abi: ResolverFactoryABI,
        logs: factoryDeployReceipt.logs as Log[],
        eventName: 'ResolverDeployed',
      })[0];

      deployedResolverAddress = event.args.resolver;
      setResolverAddress(deployedResolverAddress);
      setDeploymentError(null); // Clear 'Deploying...' message

      setSchemaUIDs({
        MANAGER_UID: event.args.schemaUIDs[0],
        VILLAGER_UID: event.args.schemaUIDs[1],
        EVENT_UID: event.args.schemaUIDs[2],
        RESPONSE_UID: event.args.schemaUIDs[3],
        NEXT_PUBLIC_EAS_CONTRACT_ADDRESS: EAS_CONTRACT_ADDRESS,
        NEXT_PUBLIC_SCHEMA_REGISTRY_ADDRESS: SCHEMA_REGISTRY_ADDRESS,
        NEXT_PUBLIC_FACTORY_CONTRACT_ADDRESS: FACTORY_CONTRACT_ADDRESS,
      });
    } catch (error: any) {
      console.error('Deployment failed:', error);
      setDeploymentError(
        error.message || 'An unknown error occurred during deployment.'
      );
      // Rollback partial state if necessary, or indicate partial success
      if (!deployedResolverAddress) setResolverAddress(null);
      // Keep successfully registered UIDs for display if some succeeded before failure
    } finally {
      setIsDeploying(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Wallet Not Connected</AlertTitle>
          <AlertDescription>
            Please connect your wallet to deploy contracts and register schemas.
          </AlertDescription>
        </Alert>

        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Deploy Contracts & Register Schemas
      </h1>

      <div className="bg-card p-6 rounded-lg shadow-md">
        <Button
          onClick={handleDeploy}
          disabled={isDeploying || !isConnected || !walletClient}
          className="w-full mb-4"
          size="lg"
        >
          {isDeploying ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-5 w-5" />
          )}
          {isDeploying ? 'Processing Deployment...' : 'Start Full Deployment'}
        </Button>

        <Button
          onClick={resetDeploymentState}
          variant="outline"
          className="w-full mb-6"
          disabled={isDeploying}
        >
          Reset Deployment State
        </Button>

        {deploymentError && !isDeploying && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Deployment Error</AlertTitle>
            <AlertDescription>{deploymentError}</AlertDescription>
          </Alert>
        )}
        {isDeploying && deploymentError && (
          <Alert
            variant="default"
            className="mb-4 bg-blue-500/10 border-blue-500/50 text-blue-700 dark:text-blue-300"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Deployment in Progress</AlertTitle>
            <AlertDescription>{deploymentError}</AlertDescription>
          </Alert>
        )}

        {(resolverAddress || Object.keys(schemaUIDs).length > 0) &&
          !isDeploying &&
          !deploymentError && (
            <Alert variant="success" className="mb-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Deployment Successful!</AlertTitle>
              <AlertDescription>
                Contracts deployed and schemas registered successfully.
              </AlertDescription>
            </Alert>
          )}

        {Object.keys(schemaUIDs).length > 0 && (
          <div className="mb-4 p-3 bg-secondary rounded-md">
            <h3 className="font-semibold text-sm mb-1">
              Registered Schema UIDs:
            </h3>
            {schemasToRegister.map((schema) =>
              schemaUIDs[schema.envVarName] ? (
                <div key={schema.envVarName} className="text-xs mb-1">
                  <span className="font-medium">
                    {schema.name} ({schema.envVarName}):
                  </span>
                  <p className="text-muted-foreground break-all">
                    {schemaUIDs[schema.envVarName]}
                  </p>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* {resolverAddress && Object.keys(schemaUIDs).length > 0 && ( */}
        {
          <DeployedVariablesOutput
            resolverAddress={resolverAddress}
            envVarsFromDeployment={schemaUIDs}
          />
        }
      </div>
    </div>
  );
};

export default DeploySchemaPage;
