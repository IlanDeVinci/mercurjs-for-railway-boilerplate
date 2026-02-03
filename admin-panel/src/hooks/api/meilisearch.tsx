import { useMutation, useQuery } from "@tanstack/react-query";

import { sdk } from "@lib/client";
import { queryKeysFactory } from "@lib/query-key-factory";

type MeiliSearchStatus = {
  appId: string;
  productIndex: boolean;
};

export const meiliQueryKeys = queryKeysFactory("meilisearch");

export const useSyncMeilisearch = () => {
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/meilisearch", {
        method: "POST",
      }),
  });
};

export const useMeilisearch = () => {
  return useQuery<MeiliSearchStatus>({
    queryKey: ["meilisearch"],
    queryFn: () => sdk.client.fetch("/admin/meilisearch", { method: "GET" }),
  });
};
