import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        gcTime: 1000 * 60 * 30,
        // Offline-friendly: keep prior data while refetching.
        placeholderData: (previousData: unknown) => previousData,
        networkMode: "offlineFirst",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
      },
    },
  });
}
