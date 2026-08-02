import { useEffect, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Lead, LeadListResponse } from "@mudrax/types";
import { useAuthMe } from "@/features/auth/hooks/usePermissions";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import {
  canShowAssigneeFilter,
  filterAssigneesForRole,
  resolveAssigneeFilterRole,
} from "@/features/leads/domain/assigneeScope";
import { resolveStageIdForStatusFilter } from "@/features/leads/domain/statusFilters";
import {
  fetchAssignableUsers,
  fetchCallerCatalog,
  fetchLeadCatalog,
  fetchLeadQueuePage,
  fetchWorkspaceLead,
} from "@/features/leads/data/leadsRepository";
import {
  useLeadWorkflowStore,
  type LeadStatusFilterKey,
} from "@/features/leads/store/leadWorkflowStore";

const PAGE_SIZE = 40;

export interface LeadQueueFilters {
  campaignId: string | null;
  assigneeUserId: string | null;
  statusFilter: LeadStatusFilterKey;
  searchText: string;
  currentStageId: string | null;
}

export const leadKeys = {
  queue: (filters: LeadQueueFilters) =>
    [
      "lead-queue",
      filters.campaignId ?? "none",
      filters.assigneeUserId ?? "all",
      filters.currentStageId ?? filters.statusFilter,
      filters.searchText.trim() || "no-search",
    ] as const,
  detail: (id: string, campaignId?: string | null) =>
    ["lead-workspace", id, campaignId ?? "any"] as const,
  catalog: (stageId?: string | null) => ["caller-catalog", stageId ?? "all"] as const,
  stages: ["lead-stages"] as const,
  assignees: (search: string) => ["lead-assignees", search.trim() || "all"] as const,
};

export function useLeadQueueFilters(): LeadQueueFilters {
  const campaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const assigneeUserId = useLeadWorkflowStore((s) => s.assigneeUserId);
  const statusFilter = useLeadWorkflowStore((s) => s.statusFilter);
  const searchText = useLeadWorkflowStore((s) => s.searchText);
  const stagesQuery = useLeadStages();
  const currentStageId = useMemo(
    () => resolveStageIdForStatusFilter(statusFilter, stagesQuery.data?.stages ?? []),
    [statusFilter, stagesQuery.data?.stages],
  );

  return {
    campaignId,
    assigneeUserId,
    statusFilter,
    searchText,
    currentStageId,
  };
}

export function useLeadStages() {
  return useQuery({
    queryKey: leadKeys.stages,
    queryFn: fetchLeadCatalog,
    staleTime: 5 * 60_000,
  });
}

export function useLeadAssignees(search = "") {
  const me = useAuthMe();
  const role = resolveAssigneeFilterRole(me);
  const enabled = canShowAssigneeFilter(role);

  const query = useQuery({
    queryKey: leadKeys.assignees(search),
    queryFn: () => fetchAssignableUsers(search),
    enabled,
    staleTime: 60_000,
  });

  const assignees = useMemo(
    () => filterAssigneesForRole(query.data ?? [], role, search),
    [query.data, role, search],
  );

  return { ...query, role, showFilter: enabled, assignees };
}

export function useLeadQueue(enabled = true) {
  const me = useAuthMe();
  const role = resolveAssigneeFilterRole(me);
  const filters = useLeadQueueFilters();
  const selfUserId = useSessionStore((s) => s.session?.user?.id ?? null);

  const assignedToUserId =
    role === "caller" ? selfUserId : (filters.assigneeUserId ?? null);

  // Status chip with no matching stage → empty result (don't fall back to unfiltered).
  const statusUnavailable =
    filters.statusFilter !== "ALL" && !filters.currentStageId;

  return useInfiniteQuery({
    queryKey: leadKeys.queue({
      ...filters,
      assigneeUserId: assignedToUserId,
    }),
    enabled: enabled && Boolean(filters.campaignId) && !statusUnavailable,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const result = await fetchLeadQueuePage({
        campaignId: filters.campaignId,
        assignedToUserId,
        currentStageId: filters.currentStageId,
        search: filters.searchText.trim() || null,
        limit: PAGE_SIZE,
        offset: pageParam,
      });
      return result;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.data.length < lastPage.meta.limit) return undefined;
      return lastPage.meta.offset + lastPage.meta.limit;
    },
    staleTime: 30_000,
  });
}

export function useLeadQueueItems(enabled = true) {
  const queueQuery = useLeadQueue(enabled);
  const filters = useLeadQueueFilters();
  const statusUnavailable =
    filters.statusFilter !== "ALL" && !filters.currentStageId;

  const items = useMemo(() => {
    if (statusUnavailable) return [] as Lead[];
    return queueQuery.data?.pages.flatMap((page) => page.data) ?? [];
  }, [queueQuery.data, statusUnavailable]);

  return { ...queueQuery, items, statusUnavailable };
}

export function useNextLeadId(currentLeadId: string | null | undefined) {
  const { items } = useLeadQueueItems(Boolean(currentLeadId));
  return useMemo(() => {
    if (!currentLeadId) return null;
    const index = items.findIndex((lead) => lead.id === currentLeadId);
    if (index < 0 || index >= items.length - 1) return null;
    return items[index + 1]?.id ?? null;
  }, [items, currentLeadId]);
}

export function useWorkspaceLead(leadId: string, campaignId?: string | null) {
  const queryClient = useQueryClient();
  const nextLeadId = useNextLeadId(leadId);
  const activeCampaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const resolvedCampaignId = campaignId ?? activeCampaignId;

  const query = useQuery({
    queryKey: leadKeys.detail(leadId, resolvedCampaignId),
    queryFn: () => fetchWorkspaceLead(leadId, resolvedCampaignId),
    enabled: Boolean(leadId),
  });

  useEffect(() => {
    if (!nextLeadId) return;
    void queryClient.prefetchQuery({
      queryKey: leadKeys.detail(nextLeadId, resolvedCampaignId),
      queryFn: () => fetchWorkspaceLead(nextLeadId, resolvedCampaignId),
    });
  }, [nextLeadId, queryClient, resolvedCampaignId]);

  return { ...query, nextLeadId };
}

export function useCallerCatalog(currentStageId?: string | null) {
  return useQuery({
    queryKey: leadKeys.catalog(currentStageId),
    queryFn: () => fetchCallerCatalog(currentStageId),
  });
}

export function useOptimisticLeadStageUpdate() {
  const queryClient = useQueryClient();

  return (
    leadId: string,
    patch: Partial<Pick<Lead, "currentStageId" | "currentStageName" | "currentStageBucket">>,
  ) => {
    queryClient.setQueriesData<InfiniteData<LeadListResponse>>(
      { queryKey: ["lead-queue"] },
      (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            data: page.data.map((lead) =>
              lead.id === leadId ? { ...lead, ...patch } : lead,
            ),
          })),
        };
      },
    );
  };
}
