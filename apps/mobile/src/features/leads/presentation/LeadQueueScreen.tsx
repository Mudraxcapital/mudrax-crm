import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/core/theme";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { useMyCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import {
  canShowAssigneeFilter,
  resolveAssigneeFilterRole,
} from "@/features/leads/domain/assigneeScope";
import {
  useLeadAssignees,
  useLeadQueueItems,
} from "@/features/leads/hooks/useLeadWorkspace";
import { LEAD_STATUS_FILTER_OPTIONS } from "@/features/leads/domain/statusFilters";
import { AssigneeFilter } from "@/features/leads/presentation/components/AssigneeFilter";
import { FilterChipRow } from "@/features/leads/presentation/components/FilterChipRow";
import { LeadQueueCard } from "@/features/leads/presentation/components/LeadQueueCard";
import {
  useLeadWorkflowStore,
  type LeadStatusFilterKey,
} from "@/features/leads/store/leadWorkflowStore";
import type { RootStackParamList } from "@/navigation/types";
import { AppButton, EmptyState, LoadingState, Screen } from "@/shared/ui";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LeadQueueScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const listRef = useRef<FlatList>(null);
  const me = useSessionStore((s) => s.me);
  const sessionName = useSessionStore((s) => s.me?.user.fullName ?? s.session?.user?.fullName);
  const showAssigneeFilter = canShowAssigneeFilter(resolveAssigneeFilterRole(me));

  const campaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const campaignName = useLeadWorkflowStore((s) => s.selectedCampaignName);
  const statusFilter = useLeadWorkflowStore((s) => s.statusFilter);
  const searchText = useLeadWorkflowStore((s) => s.searchText);
  const queueScrollOffset = useLeadWorkflowStore((s) => s.queueScrollOffset);
  const setStatusFilter = useLeadWorkflowStore((s) => s.setStatusFilter);
  const setSearchText = useLeadWorkflowStore((s) => s.setSearchText);
  const setQueueScrollOffset = useLeadWorkflowStore((s) => s.setQueueScrollOffset);
  const setSelectedCampaign = useLeadWorkflowStore((s) => s.setSelectedCampaign);

  const campaignsQuery = useMyCampaigns();
  const { assignees } = useLeadAssignees();
  const {
    items,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    statusUnavailable,
  } = useLeadQueueItems(Boolean(campaignId));

  const [localSearch, setLocalSearch] = useState(searchText);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didRestoreScroll = useRef(false);

  useEffect(() => {
    setLocalSearch(searchText);
  }, [searchText]);

  useEffect(() => {
    if (!campaignId || campaignName) return;
    const match = campaignsQuery.data?.find((campaign) => campaign.id === campaignId);
    if (match) setSelectedCampaign(match.id, match.name);
  }, [campaignId, campaignName, campaignsQuery.data, setSelectedCampaign]);

  useEffect(() => {
    didRestoreScroll.current = false;
  }, [campaignId, statusFilter, searchText]);

  useEffect(() => {
    if (didRestoreScroll.current || !campaignId || queueScrollOffset <= 0 || items.length === 0) {
      return;
    }
    didRestoreScroll.current = true;
    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: queueScrollOffset, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [campaignId, items.length, queueScrollOffset]);

  const assigneeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of assignees) map.set(user.id, user.fullName);
    return map;
  }, [assignees]);

  const onSearchChange = useCallback(
    (value: string) => {
      setLocalSearch(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => setSearchText(value), 300);
    },
    [setSearchText],
  );

  if (!campaignId) {
    return (
      <Screen>
        <EmptyState
          title="Select a campaign"
          description="Choose a campaign to load the lead queue. All leads, stats, and filters stay scoped to that campaign."
          actionLabel="Choose campaign"
          onAction={() => navigation.navigate("Main", { screen: "Campaigns" })}
        />
      </Screen>
    );
  }

  if (isLoading && items.length === 0 && !statusUnavailable) {
    return (
      <Screen>
        <LoadingState label="Loading lead queue…" />
      </Screen>
    );
  }

  if (isError && items.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load leads"
          description={error instanceof Error ? error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ padding: 16, paddingBottom: 8, gap: 8 }}>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>Active campaign</Text>
        <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "800" }}>
          {campaignName ?? "Campaign"}
        </Text>
        <AppButton
          label="Change campaign"
          variant="ghost"
          onPress={() => navigation.navigate("Main", { screen: "Campaigns" })}
          style={{ marginBottom: 4 }}
        />

        <TextInput
          value={localSearch}
          onChangeText={onSearchChange}
          placeholder="Search name, phone, status"
          placeholderTextColor={colors.onSurfaceVariant}
          style={{
            borderWidth: 1,
            borderColor: colors.outline,
            backgroundColor: colors.surfaceVariant,
            color: colors.onSurface,
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            minHeight: 48,
          }}
        />

        <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: 4 }}>Status</Text>
        <FilterChipRow
          options={LEAD_STATUS_FILTER_OPTIONS}
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as LeadStatusFilterKey)}
        />

        <AssigneeFilter />
      </View>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 10, flexGrow: 1 }}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        onScroll={(event) => setQueueScrollOffset(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={64}
        ListEmptyComponent={
          <EmptyState
            title={statusUnavailable ? "Status unavailable" : "Queue is empty"}
            description={
              statusUnavailable
                ? "No matching lead stage exists for this status filter."
                : "No leads match the current campaign and filters."
            }
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <Text style={{ textAlign: "center", color: colors.onSurfaceVariant, padding: 12 }}>
              Loading more…
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <LeadQueueCard
            lead={item}
            assigneeName={
              showAssigneeFilter
                ? item.currentAssigneeUserId
                  ? (assigneeNameById.get(item.currentAssigneeUserId) ?? "Assigned")
                  : "Unassigned"
                : (sessionName ?? "You")
            }
            onPress={() =>
              navigation.navigate("LeadDetails", {
                leadId: item.id,
                campaignId,
              })
            }
          />
        )}
      />
    </Screen>
  );
}
