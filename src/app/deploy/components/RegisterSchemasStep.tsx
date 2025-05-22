import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Address, Hex, decodeEventLog, Log } from 'viem';
import ENV from '../../../lib/env';
import { SchemaRegistryAbi } from '../SchemaRegistryAbi';

const SCHEMA_REGISTRY_ADDRESS = ENV.SCHEMA_REGISTRY_ADDRESS as Address;

export interface SchemaToRegister {
  name: string;
  schema: string;
  revocable: boolean;
  envVarName: string;
  uid: string | null;
  status: 'pending' | 'registering' | 'success' | 'error';
  errorMessage?: string;
}

interface SingleSchemaRegistrationResult {
  success: boolean;
  schemaIndex: number;
  uid?: Hex;
  txHash?: Hex;
  error?: string;
}

interface RegisterSchemasStepProps {
  schemas: SchemaToRegister[];
  onSingleSchemaRegistered: (result: SingleSchemaRegistrationResult) => void;
  onNext: () => void;
  onPrevious: () => void;
  isWalletConnected: boolean;
  resolverAddress: Address;
}

const RegisterSchemasStep: React.FC<RegisterSchemasStepProps> = ({
  schemas,
  onSingleSchemaRegistered,
  onNext,
  onPrevious,
  isWalletConnected,
  resolverAddress,
}) => {
  const allSchemasRegistered = schemas.every((s) => s.status === 'success');
  const [registeringSchemaIndex, setRegisteringSchemaIndex] = useState<number | null>(null);

  const { address: accountAddress } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const handleRegisterSingleSchema = async (schemaIndex: number, schemaToReg: SchemaToRegister) => {
    if (!walletClient || !publicClient || !accountAddress) {
      const errMsg = 'Wallet not connected or client not available.';
      onSingleSchemaRegistered({
        success: false,
        schemaIndex,
        error: errMsg,
      });
      return;
    }

    setRegisteringSchemaIndex(schemaIndex);

    try {
      const hash = await walletClient.writeContract({
        address: SCHEMA_REGISTRY_ADDRESS,
        abi: SchemaRegistryAbi,
        functionName: 'register',
        args: [schemaToReg.schema, resolverAddress, schemaToReg.revocable],
        account: accountAddress,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        const uid = receipt.logs[0].topics[0]

        if (uid) {
          onSingleSchemaRegistered({
            success: true,
            schemaIndex,
            uid: uid as Hex,
            txHash: hash,
          });
        } else {
          throw new Error('SchemaRegistered event not found or UID missing in logs.');
        }
      } else {
        throw new Error(`Schema registration transaction failed. Status: ${receipt.status}`);
      }
    } catch (e: any) {
      console.error(`Error registering ${schemaToReg.name}:`, e);
      onSingleSchemaRegistered({
        success: false,
        schemaIndex,
        error: e.message || `Failed to register ${schemaToReg.name}.`,
      });
    }
    setRegisteringSchemaIndex(null);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Step 2: Register Schemas</CardTitle>
        <CardDescription>
          Register the necessary schemas on the Schema Registry. Each schema needs to be registered individually.
          {resolverAddress && <span className="block text-xs text-muted-foreground mt-1">Using Resolver: {resolverAddress}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isWalletConnected && (
          <p className="text-sm text-destructive flex items-center">
            <XCircle className="mr-2 h-4 w-4" /> Please connect your wallet to register schemas.
          </p>
        )}
        {schemas.map((schema, index) => {
          const isLoading = registeringSchemaIndex === index;
          const displayStatus = isLoading ? 'registering' : schema.status;

          return (
            <div key={schema.name} className="p-4 border rounded-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold">{schema.name} Schema</h4>
                  <p className="text-xs text-muted-foreground">{schema.schema}</p>
                  <p className="text-xs text-muted-foreground">Revocable: {schema.revocable ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  {displayStatus === 'pending' && <Badge variant="outline">Pending</Badge>}
                  {displayStatus === 'registering' && <Badge variant="secondary">Registering...</Badge>}
                  {displayStatus === 'success' && <Badge variant="default">Registered</Badge>}
                  {displayStatus === 'error' && <Badge variant="destructive">Error</Badge>}
                </div>
              </div>

              <Button
                onClick={() => handleRegisterSingleSchema(index, schema)}
                disabled={isLoading || schema.status === 'success' || !isWalletConnected}
                className="w-full mb-2"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {displayStatus === 'pending' && `Register ${schema.name} Schema`}
                {displayStatus === 'registering' && 'Registering...'}
                {displayStatus === 'success' && `${schema.name} Schema Registered`}
                {displayStatus === 'error' && `Retry Register ${schema.name}`}
              </Button>
              {schema.status === 'success' && schema.uid && (
                <p className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> UID: {schema.uid}
                </p>
              )}
              {schema.status === 'error' && schema.errorMessage && (
                <p className="text-xs text-destructive flex items-center">
                  <XCircle className="mr-1 h-3 w-3" /> {schema.errorMessage}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Deploy Resolver
        </Button>
        <Button onClick={onNext} disabled={!allSchemasRegistered || !isWalletConnected}>
          Next: Summary & Deploy
        </Button>
      </CardFooter>
    </Card>
  );
};

export default RegisterSchemasStep;
