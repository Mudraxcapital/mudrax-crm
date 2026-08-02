import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/core/theme";
import { useMyCampaigns } from "@/features/campaigns/hooks/useCampaigns";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";
import type { MainTabParamList } from "@/navigation/types";
import { EmptyState, LoadingState, Screen, StatusBadge } from "@/shared/ui";

type Nav = BottomTabNavigationProp<MainTabParamList, "Campaigns">;

export function CampaignsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const selectedCampaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const setSelectedCampaign = useLeadWorkflowStore((s) => s.setSelectedCampaign);
  const { data, isLoading, isError, refetch, isRefetching, error } = useMyCampaigns();

  if (isLoading && !data) {
    return (
      <Screen>
        <LoadingState label="Loading campaigns…" />
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load campaigns"
          description={error instanceof Error ? error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  if (!data?.length) {
    return (
      <Screen>
        <EmptyState
          title="No campaigns"
          description="No campaigns are visible with your current permissions."
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onSurface }}>
          Select campaign
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
          The active campaign scopes your lead queue, stats, and filters for this session.
        </Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const active = item.id === selectedCampaignId;
          return (
            <Pressable
              onPress={() => {
                setSelectedCampaign(item.id, item.name);
                navigation.navigate("LeadQueue", { campaignId: item.id });
              }}
              style={{
                backgroundColor: active ? colors.primaryContainer : colors.surfaceVariant,
                borderRadius: 16,
                padding: 16,
                borderWidth: active ? 2 : 1,
                borderColor: active ? colors.secondary : colors.outline,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 17,
                    fontWeight: "700",
                    color: colors.onSurface,
                  }}
                >
                  {item.name}
                </Text>
                <StatusBadge
                  label={active ? "Active" : item.status}
                  tone={active || item.status === "ACTIVE" ? "pending" : "neutral"}
                />
              </View>
              {item.description ? (
                <Text style={{ marginTop: 8, color: colors.onSurfaceVariant }} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
