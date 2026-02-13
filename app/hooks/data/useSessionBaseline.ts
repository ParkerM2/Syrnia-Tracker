import { getSessionBaseline } from "@app/utils/storage-service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export const SESSION_BASELINE_QUERY_KEY = ["sessionBaseline"] as const;

/**
 * Simple query hook wrapping getSessionBaseline() from storage-service.
 * Listens for storage changes on `session_baseline` key to invalidate query cache.
 */
export const useSessionBaseline = () => {
  const queryClient = useQueryClient();

  const { data: baseline = null, isLoading } = useQuery({
    queryKey: SESSION_BASELINE_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getSessionBaseline();
      } catch {
        return null;
      }
    },
    staleTime: 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: "always",
  });

  useEffect(() => {
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
      if (areaName === "local" && changes.session_baseline) {
        queryClient.invalidateQueries({ queryKey: SESSION_BASELINE_QUERY_KEY });
        queryClient.refetchQueries({ queryKey: SESSION_BASELINE_QUERY_KEY, type: "active" });
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => {
      chrome.storage.onChanged.removeListener(storageListener);
    };
  }, [queryClient]);

  return { baseline, loading: isLoading };
};
