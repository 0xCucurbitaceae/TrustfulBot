'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'; // Assuming Shadcn/ui components
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Terminal } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [groupId, setGroupId] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For initial config check
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkConfig() {
      try {
        const response = await fetch('/api/setup');
        if (response.ok) {
          const data = await response.json();
          if (data.groupId) {
            router.push('/'); // Already configured
          } else {
            setIsLoading(false); // Not configured, show form
          }
        } else {
          // Handle non-OK responses during check, e.g., server error
          const errorData = await response.json();
          setError(errorData.error || 'Failed to check configuration status.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to check config status', err);
        setError('An unexpected error occurred while checking configuration.');
        setIsLoading(false);
      }
    }
    checkConfig();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    if (!groupId.trim()) {
      setError('Telegram Group ID cannot be empty.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ groupId }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message || 'Configuration saved successfully!');
        setTimeout(() => router.push('/'), 2000); // Redirect after a short delay
      } else {
        setError(data.error || 'Failed to save configuration.');
      }
    } catch (err) {
      console.error('Failed to save config', err);
      setError('An unexpected error occurred while saving configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Telegram Group Setup</h1>
          <p className="text-muted-foreground">
            Configure your Telegram Group ID to enable bot functionalities.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert variant="success">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h2 className="mb-2 text-xl font-semibold">Instructions</h2>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Add a bot like <code>@RawDataBot</code> or <code>@getidsbot</code> to your Telegram group.</li>
            <li>The bot will post a message containing the group's chat ID.</li>
            <li>The Group ID is usually a long negative number (e.g., <code>-1001234567890</code>).</li>
            <li>Copy this ID and paste it below. You can remove the bot afterwards.</li>
          </ul>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="groupId" className="block text-sm font-medium text-foreground">
                Telegram Group ID
              </label>
              <Input
                id="groupId"
                type="text"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="e.g., -1001234567890"
                disabled={isSubmitting}
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Configuration
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          This setup can only be performed once. If a Group ID is already configured, you will be redirected.
        </p>
      </div>
    </div>
  );
}
