'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Hex, Address, parseEventLogs, Log } from 'viem';
import ENV from '../../lib/env';
import ResolverArtifact from './Resolver.json';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  AlertCircle,
} from 'lucide-react';

import StartDeploymentScreen from './components/StartDeploymentScreen';
import DeploymentStepperComponent from './components/DeploymentStepperComponent';
import DeployResolverStep from './components/DeployResolverStep';
import RegisterSchemasStep, {
  SchemaToRegister as ComponentSchemaToRegister,
} from './components/RegisterSchemasStep';
import DeploymentSummaryStep from './components/DeploymentSummaryStep';
import { useAccount, useChains, usePublicClient, useWalletClient } from 'wagmi';
import { SchemaRegistryAbi } from './SchemaRegistryAbi';

const SCHEMA_REGISTRY_ADDRESS = ENV.SCHEMA_REGISTRY_ADDRESS as Address;
const EAS_CONTRACT_ADDRESS = ENV.EAS as Address;

const LOCAL_STORAGE_KEY = 'deploySchemaProgress_v2';

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

interface SchemaDeploymentInfo {
  name: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  uid?: Hex;
  txHash?: Hex;
  errorMessage?: string;
}

interface DeployedInfo {
  resolverStatus: 'pending' | 'loading' | 'success' | 'error';
  resolverAddress?: Address;
  resolverTxHash?: Hex;
  resolverError?: string;
  schemas: SchemaDeploymentInfo[];
}

const initialSchemaState = (): SchemaDeploymentInfo[] =>
  schemasToRegister.map((s) => ({ name: s.name, status: 'pending' }));

const stepperSteps = [
  'Deploy Resolver',
  'Register Schemas',
  'Summary & Deploy',
];

const DeploySchemaPage = () => {
  const { address: accountAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chains = useChains();

  const [deploymentStarted, setDeploymentStarted] = useState(false);
  const [currentOverallStep, setCurrentOverallStep] = useState(0);
  const [pageError, setPageError] = useState<string | undefined>(undefined);
  const [deployedInfo, setDeployedInfo] = useState<DeployedInfo>(() => {
    const savedProgressRaw =
      typeof window !== 'undefined'
        ? localStorage.getItem(LOCAL_STORAGE_KEY)
        : null;
    if (savedProgressRaw) {
      try {
        const savedProgress = JSON.parse(savedProgressRaw);
        if (savedProgress && savedProgress.deployedInfo) {
          return {
            ...savedProgress.deployedInfo,
            resolverStatus:
              savedProgress.deployedInfo.resolverStatus === 'loading'
                ? 'pending'
                : savedProgress.deployedInfo.resolverStatus,
            schemas: savedProgress.deployedInfo.schemas.map(
              (s: SchemaDeploymentInfo) => ({
                ...s,
                status: s.status === 'loading' ? 'pending' : s.status,
              })
            ),
          };
        }
      } catch (e) {
        console.error(
          'Failed to parse saved progress during initial state setup:',
          e
        );
        if (typeof window !== 'undefined')
          localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
    return {
      resolverStatus: 'pending',
      schemas: initialSchemaState(),
    };
  });
  const [envOutput, setEnvOutput] = useState('');

  const resetDeploymentState = useCallback(() => {
    setDeployedInfo({
      resolverStatus: 'pending',
      schemas: initialSchemaState(),
    });
    setCurrentOverallStep(0);
    setEnvOutput('');
    setDeploymentStarted(false);
    if (typeof window !== 'undefined')
      localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const savedProgressRaw =
      typeof window !== 'undefined'
        ? localStorage.getItem(LOCAL_STORAGE_KEY)
        : null;
    if (savedProgressRaw) {
      try {
        const savedProgress = JSON.parse(savedProgressRaw);
        if (
          savedProgress &&
          savedProgress.deployedInfo &&
          typeof savedProgress.currentOverallStep === 'number' &&
          typeof savedProgress.deploymentStarted === 'boolean'
        ) {
          const {
            deployedInfo: loadedDeployedInfo,
            currentOverallStep: loadedStep,
            envOutput: loadedEnvOutput,
            deploymentStarted: loadedDeploymentStarted,
          } = savedProgress;

          const validatedSchemas = loadedDeployedInfo.schemas.map((s: any) => ({
            ...s,
            status: ['pending', 'success', 'error'].includes(s.status)
              ? s.status
              : 'pending',
          }));
          const validatedResolverStatus = [
            'pending',
            'success',
            'error',
          ].includes(loadedDeployedInfo.resolverStatus)
            ? loadedDeployedInfo.resolverStatus
            : 'pending';

          if (
            Array.isArray(validatedSchemas) &&
            validatedSchemas.length === schemasToRegister.length
          ) {
            setDeployedInfo((currentInfo) => {
              if (
                JSON.stringify(currentInfo.resolverStatus) ===
                  JSON.stringify(validatedResolverStatus) &&
                JSON.stringify(currentInfo.schemas) ===
                  JSON.stringify(validatedSchemas)
              ) {
                return currentInfo;
              }
              return {
                ...loadedDeployedInfo,
                resolverStatus: validatedResolverStatus,
                schemas: validatedSchemas,
              };
            });
            setCurrentOverallStep(loadedStep);
            if (loadedEnvOutput) setEnvOutput(loadedEnvOutput);
            setDeploymentStarted(loadedDeploymentStarted);
          } else {
            console.warn(
              'Invalid or mismatched saved progress structure (schemas), clearing localStorage.'
            );
            resetDeploymentState();
          }
        } else {
          console.warn(
            'Invalid saved progress structure, clearing localStorage.'
          );
          resetDeploymentState();
        }
      } catch (error) {
        console.error(
          'Failed to parse saved progress, clearing localStorage:',
          error
        );
        resetDeploymentState();
      }
    }
  }, [resetDeploymentState]);

  useEffect(() => {
    if (deploymentStarted && typeof window !== 'undefined') {
      const progressToSave = {
        deployedInfo: {
          ...deployedInfo,
          resolverStatus:
            deployedInfo.resolverStatus === 'loading'
              ? 'pending'
              : deployedInfo.resolverStatus,
          schemas: deployedInfo.schemas.map((s) => ({
            ...s,
            status: s.status === 'loading' ? 'pending' : s.status,
          })),
        },
        currentOverallStep,
        envOutput,
        deploymentStarted,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(progressToSave));
    }
  }, [deployedInfo, currentOverallStep, envOutput, deploymentStarted]);

  const handleResolverDeployedCallback = useCallback(
    (result: {
      success: boolean;
      address?: Address;
      txHash?: Hex;
      error?: string;
    }) => {
      setPageError(undefined);
      if (result.success && result.address) {
        setDeployedInfo((prev) => ({
          ...prev,
          resolverStatus: 'success',
          resolverAddress: result.address,
          resolverTxHash: result.txHash,
          resolverError: undefined,
        }));
      } else {
        setDeployedInfo((prev) => ({
          ...prev,
          resolverStatus: 'error',
          resolverAddress: undefined,
          resolverTxHash: result.txHash,
          resolverError:
            result.error || 'Unknown error during resolver deployment.',
        }));
        setPageError(
          `Resolver deployment failed: ${result.error || 'Unknown error'}`
        );
      }
    },
    []
  );

  const handleSingleSchemaRegisteredCallback = useCallback(
    (result: {
      success: boolean;
      schemaIndex: number;
      uid?: Hex;
      txHash?: Hex;
      error?: string;
    }) => {
      setPageError(undefined); // Clear previous page errors
      setDeployedInfo((prev) => {
        const newSchemas = [...prev.schemas];
        const schemaToUpdate = newSchemas[result.schemaIndex];

        if (result.success && result.uid) {
          newSchemas[result.schemaIndex] = {
            ...schemaToUpdate,
            status: 'success',
            uid: result.uid,
            txHash: result.txHash,
            errorMessage: undefined,
          };
        } else {
          newSchemas[result.schemaIndex] = {
            ...schemaToUpdate,
            status: 'error',
            uid: undefined, // Clear UID on error
            txHash: result.txHash, // Keep txHash if available
            errorMessage:
              result.error || `Failed to register ${schemaToUpdate.name}.`,
          };
          setPageError(
            `Failed to register ${schemaToUpdate.name}: ${
              result.error || 'Unknown error'
            }`
          );
        }
        return { ...prev, schemas: newSchemas };
      });
    },
    []
  );

  useEffect(() => {
    if (
      deployedInfo.resolverStatus === 'success' &&
      deployedInfo.resolverAddress &&
      deployedInfo.schemas.every((s) => s.status === 'success' && s.uid)
    ) {
      let output = `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${
        ENV.WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID'
      }\n`;
      output += `NEXT_PUBLIC_RPC_URL=${ENV.RPC_URL || 'YOUR_RPC_URL'}\n`;
      output += `NEXT_PUBLIC_CHAIN_ID=${
        (chains && chains[0]?.id) || ENV.CHAIN_ID || 'YOUR_CHAIN_ID'
      }\n`;
      output += `NEXT_PUBLIC_RESOLVER_ADDRESS=${deployedInfo.resolverAddress}\n`;
      output += `NEXT_PUBLIC_SCHEMA_REGISTRY_ADDRESS=${SCHEMA_REGISTRY_ADDRESS}\n`;
      output += `NEXT_PUBLIC_EAS_CONTRACT_ADDRESS=${EAS_CONTRACT_ADDRESS}\n`;

      schemasToRegister.forEach((schema, index) => {
        const deployedSchema = deployedInfo.schemas[index];
        if (deployedSchema && deployedSchema.uid) {
          output += `${schema.envVarName}=${deployedSchema.uid}\n`;
        }
      });
      setEnvOutput(output);
    }
  }, [deployedInfo, accountAddress, chains]);

  const handleDeployToVercel = () => {
    if (!envOutput) {
      setPageError('ENV variables not generated yet.');
      return;
    }
    const vercelProjectName = 'my-attestation-app';
    const encodedEnv = encodeURIComponent(envOutput.replace(/\n/g, '\n'));
    const vercelUrl = `https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fethereum-attestation-service%2Feas-typescript-template&env=${encodedEnv}&project-name=${vercelProjectName}&repository-name=${vercelProjectName}`;
    window.open(vercelUrl, '_blank');
  };

  const handleStartDeployment = () => {
    setDeploymentStarted(true);
    setCurrentOverallStep(0);
    setPageError(undefined);
  };

  const handleNextStep = () => {
    setCurrentOverallStep((prev) =>
      Math.min(prev + 1, stepperSteps.length - 1)
    );
  };

  const handlePreviousStep = () => {
    setCurrentOverallStep((prev) => Math.max(prev - 1, 0));
  };

  const schemasForStepComponent: ComponentSchemaToRegister[] =
    schemasToRegister.map((s, index) => {
      const deployedSchemaInfo = deployedInfo.schemas[index] || {
        name: s.name,
        status: 'pending',
      };
      return {
        name: s.name,
        schema: s.schema,
        revocable: s.revocable,
        envVarName: s.envVarName,
        uid: deployedSchemaInfo.uid || null,
        status: deployedSchemaInfo.status,
        errorMessage: deployedSchemaInfo.errorMessage, // Pass error message
      };
    });

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 min-h-screen">
      <h1 className="text-3xl font-bold text-center">EAS Schema Deployment</h1>

      {pageError && (
        <Alert variant="destructive" className="w-full max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      )}

      {!deploymentStarted ? (
        <StartDeploymentScreen onStart={handleStartDeployment} />
      ) : (
        <>
          <DeploymentStepperComponent
            currentStep={currentOverallStep}
            steps={stepperSteps}
          />

          {currentOverallStep === 0 && (
            <DeployResolverStep
              onResolverDeployed={handleResolverDeployedCallback}
              initialStatus={
                deployedInfo.resolverStatus === 'loading'
                  ? 'pending'
                  : deployedInfo.resolverStatus
              }
              deployedAddress={deployedInfo.resolverAddress}
              onNext={handleNextStep}
              isWalletConnected={isConnected}
            />
          )}

          {currentOverallStep === 1 && (
            <RegisterSchemasStep
              schemas={schemasForStepComponent} // Pass the mapped schemas
              onSingleSchemaRegistered={handleSingleSchemaRegisteredCallback} // Added callback
              onNext={handleNextStep}
              onPrevious={handlePreviousStep}
              isWalletConnected={isConnected}
              resolverAddress={deployedInfo.resolverAddress} // Pass resolver address
            />
          )}

          {currentOverallStep === 2 && (
            <DeploymentSummaryStep
              envOutput={envOutput}
              onDeployToVercel={handleDeployToVercel}
              onStartOver={resetDeploymentState}
              onPrevious={handlePreviousStep}
            />
          )}
        </>
      )}
    </div>
  );
};

export default DeploySchemaPage;
