'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Hex, Address, parseEventLogs, Log, zeroAddress } from 'viem';
import ENV from '../../lib/env';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  AlertCircle,
} from 'lucide-react';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useWalletClient,
} from 'wagmi';
import { SchemaRegistryAbi } from './SchemaRegistryAbi';
import { ResolverFactoryABI } from './ResolverFactoryABI';
import { TrustfulResolverABI } from '@/abis/TrustfulResolverABI';
import { ConnectButton } from '@rainbow-me/rainbowkit';

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
  const [copied, setCopied] = useState(false);
  const [resolverActionSchemas, setResolverActionSchemas] = useState<
    Record<string, Hex[]>
  >({});

  const resetDeploymentState = useCallback(() => {
    setIsDeploying(false);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});
    setCopied(false);
    setResolverActionSchemas({});
  }, []);

  const envOutput = Object.entries(schemaUIDs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const handleDeploy = async () => {
    if (!isConnected || !walletClient || !publicClient || !accountAddress) {
      setDeploymentError('Please connect your wallet.');
      return;
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});
    setCopied(false);
    setResolverActionSchemas({});

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
        NEXT_PUBLIC_RESOLVER_ADDRESS: deployedResolverAddress,
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

  const handleCopy = () => {
    navigator.clipboard.writeText(envOutput.replace(/\\n/g, '\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {resolverAddress && (
          <div className="mb-4 p-3 bg-secondary rounded-md">
            <h3 className="font-semibold text-sm">
              Resolver Contract Address:
            </h3>
            <p className="text-xs text-muted-foreground break-all">
              {resolverAddress}
            </p>
          </div>
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

        {Object.keys(resolverActionSchemas).length > 0 && (
          <div className="mb-4 p-3 bg-muted/50 rounded-md">
            <h3 className="font-semibold text-sm mb-1">
              Schemas by Action from Resolver:
            </h3>
            {Object.entries(resolverActionSchemas).map(([actionKey, uids]) => (
              <div key={actionKey} className="text-xs mb-2">
                <p className="font-medium">{actionKey}:</p>
                {uids.length > 0 ? (
                  <ul className="list-disc list-inside pl-2">
                    {uids.map((uid, index) => (
                      <li
                        key={index}
                        className="text-muted-foreground break-all"
                      >
                        {uid.startsWith('Error:') ? (
                          <span className="text-red-500">{uid}</span>
                        ) : (
                          uid
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground italic">
                    No UIDs returned for this action.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {envOutput && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">
              Environment Variables
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              Copy these values into your Vercel project settings or a local{' '}
              <code>.env.local</code> file for your frontend application.
            </p>
            <div className="relative bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap break-all">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="absolute top-2 right-2 h-7 w-7 p-0"
              >
                <Copy className="h-4 w-4" />
                {copied && <span className="text-xs ml-1">Copied!</span>}
              </Button>
              {envOutput.split('\\n').map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeploySchemaPage;
