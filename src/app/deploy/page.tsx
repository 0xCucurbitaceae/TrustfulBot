'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  Edit3,
  ExternalLink,
  Hash,
  KeyRound,
  Loader2,
  Settings,
  UserCircle2,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect, useCallback } from 'react';
import { Address, Hex, Log, parseEventLogs } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import ENV from '../../lib/env';
import { ResolverFactoryABI } from './ResolverFactoryABI';
import { DeployedVariablesOutput } from './DeployedVariablesOutput';
import { Web3Button } from '../../shared/components/Web3Button';

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

export default function DeploySchemaPage() {
  const { address: connectedAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [resolverAddress, setResolverAddress] = useState<Address | null>(null);
  const [schemaUIDs, setSchemaUIDs] = useState<Record<string, Hex>>({});
  const [managerAddressInput, setManagerAddressInput] = useState<string>('');
  const [copiedCommands, setCopiedCommands] = useState(false);

  const resetDeploymentState = useCallback(() => {
    setIsDeploying(false);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});
    setManagerAddressInput('');
  }, []);

  const handleDeploy = async () => {
    if (!connectedAddress || !walletClient || !publicClient) {
      setDeploymentError('Please connect your wallet and ensure it is ready.');
      return;
    }

    const isValidEthereumAddress = (address: string): address is Address => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    let finalManagerAddresses: Address[];
    if (managerAddressInput.trim() !== '') {
      if (!isValidEthereumAddress(managerAddressInput.trim())) {
        setDeploymentError('Invalid Manager Address format.');
        return;
      }
      finalManagerAddresses = [managerAddressInput.trim() as Address];
    } else {
      finalManagerAddresses = [connectedAddress];
    }

    setIsDeploying(true);
    setDeploymentError(null);
    setResolverAddress(null);
    setSchemaUIDs({});

    let deployedResolverAddress: Address | null = null;
    const deployedSchemaUIDs: Record<string, Hex> = {};

    try {
      if (
        !FACTORY_CONTRACT_ADDRESS ||
        FACTORY_CONTRACT_ADDRESS === '0xYOUR_FACTORY_CONTRACT_ADDRESS_HERE'
      ) {
        setDeploymentError(
          'Factory contract address is not set. Please set NEXT_PUBLIC_FACTORY_ADDRESS in your .env file.'
        );
        return;
      }

      console.log([
        EAS_CONTRACT_ADDRESS,
        SCHEMA_REGISTRY_ADDRESS,
        finalManagerAddresses,
      ]);
      const factoryDeployTxHash = await walletClient.writeContract({
        address: FACTORY_CONTRACT_ADDRESS,
        abi: ResolverFactoryABI,
        functionName: 'deployResolver',
        args: [
          EAS_CONTRACT_ADDRESS,
          SCHEMA_REGISTRY_ADDRESS,
          finalManagerAddresses,
        ],
        account: connectedAddress,
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

      const event = parseEventLogs({
        abi: ResolverFactoryABI,
        logs: factoryDeployReceipt.logs as Log[],
        eventName: 'ResolverDeployed',
      })[0];

      deployedResolverAddress = event.args.resolver;
      setResolverAddress(deployedResolverAddress);
      setDeploymentError(null);

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
      if (!deployedResolverAddress) setResolverAddress(null);
    } finally {
      setIsDeploying(false);
    }
  };
const commands = `setup - setup your account and check in to the village
addbadge - add a new badge
attest - give an attestation
badges - see available badges
`;
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 text-center">
        TrustfulBot Deployment
      </h1>

      <div className="mb-8 p-4 bg-sky-50 border border-sky-200 rounded-lg shadow-sm">
        <div className="flex items-center mb-3">
          <ClipboardList className="h-6 w-6 mr-2 text-sky-600" />
          <h2 className="text-xl font-semibold text-sky-700">
            Quick Setup Guide
          </h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Follow these steps to deploy your TrustfulBot instance and configure
          your Telegram bot.
        </p>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="botfather-commands"
              className="block text-sm font-medium text-gray-700"
            >
              BotFather Commands:
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(commands);
                setCopiedCommands(true);
                setTimeout(() => setCopiedCommands(false), 2000);
              }}
            >
              <Copy className="h-4 w-4 mr-1" />
              {copiedCommands ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <Textarea
            id="botfather-commands"
            readOnly
            rows={4}
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-sky-500 focus:border-sky-500"
            value={commands}
          />
          <p className="text-xs text-gray-500 mt-1">
            Copy and paste these commands when setting up your bot with
            BotFather on Telegram.
          </p>
        </div>

        <h3 className="text-lg font-semibold text-sky-600 mt-4 mb-2 pl-2">
          Before You Deploy:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700 pl-4">
          <li className="flex items-start">
            <Bot className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>
              Create Telegram Bot via{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline font-medium"
              >
                BotFather{' '}
                <ExternalLink className="inline-block h-3 w-3 ml-0.5" />
              </a>{' '}
              (and get your <code>BOT_TOKEN</code>).
            </span>
          </li>
          <li className="flex items-start">
            <Edit3 className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>
              Choose a PLATFORM name (e.g., "MyCommunity"). This will be part of
              your schema names.
            </span>
          </li>
          <li className="flex items-start">
            <KeyRound className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>
              Get a Bless Net API Key from the{' '}
              <a
                href="https://bless.net/dashboard/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline font-medium"
              >
                Bless Net Dashboard{' '}
                <ExternalLink className="inline-block h-3 w-3 ml-0.5" />
              </a>
              .
            </span>
          </li>
        </ol>
        <p className="mt-2 text-xs text-gray-600 pl-4">
          The <code>BOT_TOKEN</code>, <code>PLATFORM</code> name, and Bless Net
          API Key (<code>BLESSNET_API_KEY</code> &{' '}
          <code>BLESSNET_API_ACCOUNT</code>) will be needed for your{' '}
          <code>.env.local</code> file after deployment.
        </p>

        <p className="mt-4 text-xs text-gray-600 pl-2">
          The Manager Address below is for the on-chain resolver contract. It
          defaults to your connected wallet if left empty.
        </p>
      </div>

      <div className="mb-4">
        <label
          htmlFor="managerAddress"
          className="block text-sm font-medium text-foreground mb-1"
        >
          Optional: Manager Address (defaults to connected wallet)
        </label>
        <Input
          id="managerAddress"
          type="text"
          placeholder="0x... (Leave blank to use connected wallet)"
          value={managerAddressInput}
          onChange={(e) => setManagerAddressInput(e.target.value)}
          className="w-full"
          disabled={isDeploying}
        />
      </div>

      <Web3Button
        targetChainId={Number(ENV.CHAIN_ID)}
        buttonClassName="w-full mt-4 text-lg px-6 py-3"
      >
        <Button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="w-full mt-4"
          size="lg"
        >
          {isDeploying ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Settings className="mr-2 h-5 w-5" />
          )}
          {isDeploying ? 'Deploying...' : 'Deploy Resolver & Schemas'}
        </Button>
      </Web3Button>

      {deploymentError && (
        <Alert variant="destructive" className="mt-4">
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
          <h3 className="font-semibold mb-1">Registered Schema UIDs:</h3>
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

      {resolverAddress && Object.keys(schemaUIDs).length > 0 && (
        <>
          <DeployedVariablesOutput
            resolverAddress={resolverAddress}
            envVarsFromDeployment={schemaUIDs}
          />
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center mb-3">
              <Database className="h-6 w-6 mr-2 text-green-600" />
              <h2 className="text-xl font-semibold text-green-700">
                Important: Database Setup
              </h2>
            </div>
            <p className="text-gray-700 mb-2 pl-1">
              After deploying your TrustfulBot to Vercel and ensuring it&apos;s
              running with the correct environment variables, you need to set up
              its database schema in Supabase. This allows the bot to store user
              data.
            </p>
            <p className="text-gray-700 pl-1">
              Go to your Supabase project&apos;s SQL Editor and run the
              migration script found here:
            </p>
            <div className="mt-2 pl-1">
              <a
                href="https://github.com/0xCucurbitaceae/TrustfulBot/blob/58545c1206bc571e2633c3a527594b9b09c27cc8/scripts/supabase-migration.sql"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                View Supabase Migration SQL on GitHub
                <ExternalLink size={14} className="ml-1.5" />
              </a>
            </div>
            <p className="mt-3 text-xs text-gray-600 pl-1">
              This script will create the necessary <code>users</code> table for
              your bot to function correctly.
            </p>
          </div>
        </>
      )}
      <div className="mb-8 mt-8 p-4 bg-sky-50 border border-sky-200 rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-sky-700 mb-3">
          After Deployment & Initial Setup:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li className="flex items-start">
            <Users className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>Invite your newly deployed bot to your Telegram group.</span>
          </li>
          <li className="flex items-start">
            <Hash className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>
              In the Telegram group, run the <code>/whoamigroup</code> command
              with your bot to get the <code>GROUP_ID</code>.
            </span>
          </li>
          <li className="flex items-start">
            <Settings className="h-4 w-4 mr-2 mt-0.5 inline-block flex-shrink-0 text-sky-500" />
            <span>
              Navigate to your deployed app's <code>/setup</code> page (e.g.,{' '}
              <code>https://your-app-url.vercel.app/setup</code>) and paste the{' '}
              <code>GROUP_ID</code>.
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
