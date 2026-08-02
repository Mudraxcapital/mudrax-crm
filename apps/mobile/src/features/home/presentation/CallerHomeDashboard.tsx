import { useEffect, useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { CallerHomeDashboard as CallerHomeDashboardData } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";
import type { RootStackParamList } from "@/navigation/types";
import { AppButton, StatTile } from "@/shared/ui";
import { formatTime } from "@/shared/utils/format";
import { DashboardSection } from "./components/DashboardSection";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CallerHomeDashboard({ data }: { data: CallerHomeDashboardData }) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const selectedCampaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const selectedCampaignName = useLeadWorkflowStore((s) => s.selectedCampaignName);
  const setSelectedCampaign = useLeadWorkflowStore((s) => s.setSelectedCampaign);
  const caller = data.caller;

  useEffect(() => {
    if (!selectedCampaignId || selectedCampaignName) return;
    const name = caller.campaigns.find((c) => c.id === selectedCampaignId)?.name ?? null;
    if (name) setSelectedCampaign(selectedCampaignId, name);
  }, [caller.campaigns, selectedCampaignId, selectedCampaignName, setSelectedCampaign]);

  const firstLeadId = useMemo(() => {
    if (!selectedCampaignId) return null;
    return caller.queue[0]?.id ?? null;
  }, [caller.queue, selectedCampaignId]);
  const firstName = data.fullName.split(" ")[0] ?? data.fullName;
  const campaignName =
    selectedCampaignName ??
    caller.campaigns.find((c) => c.id === selectedCampaignId)?.name ??
    "Select a campaign";

  return (
    <>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.onSurface, marginBottom: 4 }}>
        Caller workspace · {firstName}
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, marginBottom: 16 }}>{campaignName}</Text>

      {!selectedCampaignId ? (
        <>
          <AppButton
            label="Choose campaign"
            variant="call"
            onPress={() => navigation.navigate("Main", { screen: "Campaigns" })}
            style={{ marginBottom: 16 }}
          />
          <Text style={{ color: colors.onSurfaceVariant }}>
            Select a campaign to view your queue, stats, and start calling.
          </Text>
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            <StatTile label="Today's Assigned" value={caller.progress.assignedToday} />
            <StatTile label="Pending Calls" value={caller.progress.pendingCalls} />
            <StatTile label="Calls Today" value={caller.progress.callsToday} />
            <StatTile label="Follow-ups Done" value={caller.progress.completedCalls} />
            <StatTile label="Follow-ups Today" value={caller.progress.followUpsToday} />
          </View>

          <AppButton
            label="Start Calling"
            variant="call"
            disabled={!firstLeadId}
            onPress={() => {
              if (!firstLeadId || !selectedCampaignId) return;
              navigation.navigate("LeadDetails", {
                leadId: firstLeadId,
                campaignId: selectedCampaignId,
              });
            }}
            style={{ marginBottom: 16 }}
          />

          <DashboardSection title="Lead Queue" description="Open leads assigned to you">
            {caller.queue.length === 0 ? (
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                No open assigned leads for this campaign.
              </Text>
            ) : (
              <FlatList
                data={caller.queue.slice(0, 12)}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("LeadDetails", {
                        leadId: item.id,
                        campaignId: selectedCampaignId,
                      })
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: colors.onSurface }}>
                      {item.fullNameSnapshot}
                    </Text>
                    <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 12 }}>
                      {item.phoneSnapshot ?? "No phone"} · {item.currentStageName}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </DashboardSection>

          <DashboardSection title="Today's Follow-ups" description="Scheduled for you">
            {caller.followUps.length === 0 ? (
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>
                No follow-ups scheduled today.
              </Text>
            ) : (
              <FlatList
                data={caller.followUps}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() =>
                      navigation.navigate("LeadDetails", {
                        leadId: item.leadId,
                        campaignId: selectedCampaignId,
                      })
                    }
                    style={{
                      borderWidth: 1,
                      borderColor: colors.outline,
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: colors.onSurface }}>
                      {item.leadName}
                    </Text>
                    <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 12 }}>
                      {formatTime(item.scheduledFor)} · {item.status}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </DashboardSection>
        </>
      )}
    </>
  );
}
