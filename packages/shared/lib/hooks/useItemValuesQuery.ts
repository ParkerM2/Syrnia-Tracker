import { getItemValues, saveItemValues } from '../utils/storage-service.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Query key for item values
export const ITEM_VALUES_QUERY_KEY = ['itemValues'] as const;

/**
 * Hook to access and manage item values using TanStack Query
 * Item values are stored as Record<string, string> where key is item name and value is GP value
 */
export const useItemValuesQuery = () => {
  const queryClient = useQueryClient();

  // Main query for item values
  const {
    data: itemValues = {},
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ITEM_VALUES_QUERY_KEY,
    queryFn: async () => {
      try {
        const values = await getItemValues();
        return values;
      } catch (err) {
        console.error('[useItemValuesQuery] Error loading item values:', err);
        return {};
      }
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Listen for storage changes and invalidate query
  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === 'local' && changes.drop_gp_values) {
        console.log('[useItemValuesQuery] drop_gp_values storage changed');
        queryClient.invalidateQueries({ queryKey: ITEM_VALUES_QUERY_KEY });
      }
    };

    chrome.storage.onChanged.addListener(storageListener);

    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);

  // Mutation for saving item values
  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      await saveItemValues(values);
    },
    onSuccess: (_, variables) => {
      // Optimistically update cache
      queryClient.setQueryData(ITEM_VALUES_QUERY_KEY, variables);
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ITEM_VALUES_QUERY_KEY });
    },
  });

  // Save function
  const save = async (values: Record<string, string>) => {
    try {
      await saveMutation.mutateAsync(values);
    } catch (error) {
      console.error('Error saving item values:', error);
      throw error;
    }
  };

  return {
    itemValues,
    loading: isLoading,
    isFetching,
    error: error as Error | null,
    save,
    isSaving: saveMutation.isPending,
  };
};
