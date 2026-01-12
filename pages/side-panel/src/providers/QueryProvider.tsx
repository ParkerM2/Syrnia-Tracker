import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Create a client with optimized settings for background refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Use staleTime to prevent unnecessary refetches
      staleTime: 1000, // 1 second - data is considered fresh for 1s
      // Use gcTime (formerly cacheTime) to keep data in cache
      gcTime: 5 * 60 * 1000, // 5 minutes
      // Refetch on window focus - but only if data is stale
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
      // Retry failed requests
      retry: 1,
      // Use background refetching - updates data without showing loading state
      refetchOnMount: false,
    },
  },
});

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
