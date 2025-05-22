import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Check, Copy, ExternalLink, RotateCcw } from 'lucide-react';

interface DeploymentSummaryStepProps {
  envOutput: string;
  onDeployToVercel: () => void;
  onStartOver: () => void;
  onPrevious: () => void;
}

const DeploymentSummaryStep: React.FC<DeploymentSummaryStepProps> = ({
  envOutput,
  onDeployToVercel,
  onStartOver,
  onPrevious,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(envOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Step 3: Deployment Summary & Deploy</CardTitle>
        <CardDescription>
          Review your generated environment variables and deploy your application to Vercel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="envOutput" className="block text-sm font-medium text-foreground mb-1">
            Generated .env variables:
          </label>
          <div className="relative">
            <Textarea id="envOutput" value={envOutput} readOnly rows={10} className="pr-10" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-7 w-7"
              aria-label={copied ? 'Copied' : 'Copy to clipboard'}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Copy these variables and add them to your Vercel project's environment settings.
          </p>
        </div>
        <Button onClick={onDeployToVercel} className="w-full">
          <ExternalLink className="mr-2 h-4 w-4" /> Deploy to Vercel
        </Button>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <RotateCcw className="mr-2 h-4 w-4" /> Previous: Register Schemas
        </Button>
        <Button variant="destructive" onClick={onStartOver}>
          <RotateCcw className="mr-2 h-4 w-4" /> Start Over
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DeploymentSummaryStep;
