import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { FallbackProps } from 'react-error-boundary';

export const ErrorDisplay = ({ error, resetErrorBoundary }: FallbackProps) => {
  const handleReturnToDashboard = () => {
    // Reset the error boundary
    resetErrorBoundary();

    // Navigate to dashboard by reloading the extension
    // In a Chrome extension context, we can reload the current window
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Something went wrong. Don't worry, you can return to the dashboard to continue.
            </p>
            {error && (
              <details className="bg-muted rounded-md border p-2">
                <summary className="text-muted-foreground cursor-pointer text-xs font-medium">Error Details</summary>
                <pre className="text-destructive mt-2 overflow-auto text-xs">{error.message || String(error)}</pre>
              </details>
            )}
          </div>
          <Button onClick={handleReturnToDashboard} className="w-full" variant="default">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
