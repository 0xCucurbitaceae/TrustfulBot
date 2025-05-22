'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Hex, Address } from 'viem';
import { Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface DeployedVariablesOutputProps {
  resolverAddress: Address | null;
  envVarsFromDeployment: Record<string, Hex>;
}

const ENV_VAR_REGEX = /^[A-Za-z_][A-Za-z0-9_]*=.*$/;

export function DeployedVariablesOutput({
  resolverAddress,
  envVarsFromDeployment,
}: DeployedVariablesOutputProps) {
  const [copied, setCopied] = useState(false);
  const [isValidEnvFormat, setIsValidEnvFormat] = useState(true);

  const initialEnvOutput = useMemo(() => {
    let output = '';
    output +=
      'BOT_TOKEN=\nWEBHOOK_HOST=\nPLATFORM=\nGROUP_ID=\nBLESSNET_SCAN_API_KEY=\nBLESSNET_API_ACCOUNT=\n\n';

    const filteredVars = { ...envVarsFromDeployment };
    delete (filteredVars as any).NEXT_PUBLIC_RESOLVER_ADDRESS;

    output += Object.entries(filteredVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    return output;
  }, [envVarsFromDeployment]);

  const [editableEnvOutput, setEditableEnvOutput] = useState(initialEnvOutput);

  useEffect(() => {
    setEditableEnvOutput(initialEnvOutput);
  }, [initialEnvOutput]);

  useEffect(() => {
    const lines = editableEnvOutput.split('\n');
    let isValid = true;
    for (const line of lines) {
      if (line.trim() !== '' && !ENV_VAR_REGEX.test(line.trim())) {
        isValid = false;
        break;
      }
    }
    setIsValidEnvFormat(isValid);
  }, [editableEnvOutput]);

  const handleDeployToVercel = () => {
    if (!isValidEnvFormat || (!resolverAddress && Object.keys(envVarsFromDeployment).length === 0)) return;

    const repoUrl = 'https://github.com/0xCucurbitaceae/TrustfulBot';
    const params = new URLSearchParams();
    params.append('repository-url', repoUrl);

    const lines = editableEnvOutput.split('\n');
    const vercelEnvVars: Record<string, string> = {};
    const vercelEnvKeys: string[] = [];

    for (const line of lines) {
      if (line.trim() !== '') {
        const parts = line.split('=');
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (key) {
          vercelEnvVars[key] = value;
          vercelEnvKeys.push(key);
        }
      }
    }

    if (vercelEnvKeys.length === 0) return;

    params.append('env', vercelEnvKeys.join(','));

    for (const [key, value] of Object.entries(vercelEnvVars)) {
      params.append(key, value);
    }

    params.append(
      'envDescription',
      'Environment variables for your TrustfulBot instance deployed via Attest-Bot.'
    );
    params.append(
      'envLink',
      'https://github.com/0xCucurbitaceae/TrustfulBot#environment-variables'
    );
    params.append('integration-ids', 'oac_jUduyjQgOyzev1fjrW83NYOv');
    params.append('skippable-integrations', '1');

    const vercelDeployUrl = `https://vercel.com/new/clone?${params.toString()}`;
    window.open(vercelDeployUrl, '_blank');
  };

  return (
    <div
      className="mb-4 p-4 bg-muted/50 rounded-md"
      data-component-name="DeployedVariablesOutput"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">
          Deployed Variables (.env format)
        </h3>
        <div className="flex space-x-2">
          <Button
            onClick={() => {
              navigator.clipboard.writeText(editableEnvOutput);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
            disabled={!editableEnvOutput}
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy .env'}
          </Button>
          <Button
            onClick={handleDeployToVercel}
            variant="default"
            size="sm"
            className="flex items-center gap-1.5"
            disabled={!isValidEnvFormat || (!resolverAddress && Object.keys(envVarsFromDeployment).length === 0)}
          >
            <ExternalLink size={14} />
            Deploy to Vercel
          </Button>
        </div>
      </div>
      <Textarea
        value={editableEnvOutput}
        onChange={(e) => setEditableEnvOutput(e.target.value)}
        rows={10}
        className={`text-xs font-mono bg-background p-2 rounded w-full ${!isValidEnvFormat ? 'border-red-500 focus:border-red-500 ring-red-500 focus:ring-red-500' : 'border-input'}`}
        placeholder="Enter environment variables here, one per line (e.g., VAR_NAME=value)"
      />
      {!isValidEnvFormat && (
        <p className="text-xs text-red-500 mt-1 flex items-center">
          <AlertCircle size={14} className="mr-1" />
          Invalid format: Each line must be NAME=value. Empty lines are allowed.
        </p>
      )}
    </div>
  );
}
