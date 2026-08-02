import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { StaffHomeDashboard as StaffHomeDashboardData } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import type { RootStackParamList } from "@/navigation/types";
import { StatTile, StatusBadge } from "@/shared/ui";
import { formatDateTime, formatTime } from "@/shared/utils/format";
import { BarList } from "./components/BarList";
import { DashboardSection } from "./components/DashboardSection";
import { QuickLinkGrid } from "./components/QuickLinkGrid";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function StaffHomeDashboard({ data }: { data: StaffHomeDashboardData }) {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const firstName = data.fullName.split(" ")[0] ?? data.fullName;

  return (
    <>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.onSurface, marginBottom: 4 }}>
        Good day, {firstName}
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, marginBottom: 10 }}>
        Your enterprise workspace for loan DSA operations.
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <StatusBadge label={data.roles.join(", ") || "Member"} tone="active" />
        <StatusBadge label={data.email} tone="neutral" />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        {data.summary.customers != null ? (
          <StatTile label="Customers" value={data.summary.customers} />
        ) : null}
        {data.summary.leads != null ? <StatTile label="Leads" value={data.summary.leads} /> : null}
        {data.summary.activeCampaigns != null ? (
          <StatTile label="Active Campaigns" value={data.summary.activeCampaigns} />
        ) : null}
        <StatTile label="Permissions" value={data.permissionCount} />
      </View>

      {data.followUpStats ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          <StatTile label="Open Follow-ups" value={data.followUpStats.open} />
          <StatTile label="Due Today" value={data.followUpStats.dueToday} />
          <StatTile label="Completed Today" value={data.followUpStats.completedToday} />
        </View>
      ) : null}

      {data.campaignStats ? (
        <DashboardSection
          title="Campaign statistics"
          description={`${data.campaignStats.total} total · ${data.campaignStats.active} active`}
        >
          {data.campaignStats.byStatus.length === 0 ? (
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No campaigns yet.</Text>
          ) : (
            data.campaignStats.byStatus.map((entry) => (
              <View
                key={entry.status}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 6,
                }}
              >
                <StatusBadge label={entry.status} tone="neutral" />
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{entry.count}</Text>
              </View>
            ))
          )}
        </DashboardSection>
      ) : null}

      <DashboardSection
        title="Jump back in"
        description="Most-used areas of the product, filtered to your permissions."
      >
        <QuickLinkGrid links={data.quickLinks} />
      </DashboardSection>

      {data.leadsByStage.length > 0 ? (
        <DashboardSection title="Pipeline snapshot" description="Leads by stage">
          <BarList
            data={data.leadsByStage.map((entry) => ({
              key: entry.stageId,
              label: entry.stageName,
              value: entry.count,
            }))}
          />
        </DashboardSection>
      ) : null}

      {data.assignedWork.length > 0 ? (
        <DashboardSection title="Assigned work" description="Leads currently assigned to you">
          {data.assignedWork.map((lead) => (
            <Pressable
              key={lead.id}
              onPress={() =>
                navigation.navigate("LeadDetails", {
                  leadId: lead.id,
                  campaignId: lead.campaignId ?? undefined,
                })
              }
              style={{
                borderWidth: 1,
                borderColor: colors.outline,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontWeight: "700", color: colors.onSurface }}>
                {lead.fullNameSnapshot}
              </Text>
              <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 12 }}>
                {lead.currentStageName}
                {lead.nextActionAt ? ` · Next ${formatDateTime(lead.nextActionAt)}` : ""}
              </Text>
            </Pressable>
          ))}
        </DashboardSection>
      ) : null}

      {data.recentFollowUps.length > 0 ? (
        <DashboardSection title="Follow-ups due today">
          {data.recentFollowUps.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => navigation.navigate("LeadDetails", { leadId: item.leadId })}
              style={{
                borderWidth: 1,
                borderColor: colors.outline,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontWeight: "700", color: colors.onSurface }}>Lead follow-up</Text>
              <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 12 }}>
                {formatTime(item.scheduledFor)} · {item.status} · {item.triggerType}
              </Text>
            </Pressable>
          ))}
        </DashboardSection>
      ) : null}
    </>
  );
}
