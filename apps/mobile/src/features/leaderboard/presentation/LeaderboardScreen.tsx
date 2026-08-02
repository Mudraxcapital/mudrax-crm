import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LeaderboardCard, LeaderboardPreset, LeaderboardSort } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import { useLeaderboard } from "@/features/leaderboard/hooks/useLeaderboard";
import {
  formatLeaderboardDuration,
  formatLeaderboardNumber,
  formatLeaderboardPercent,
} from "@/features/leaderboard/domain/format";
import { EmptyState, LoadingState, Screen, StatTile, StatusBadge, UserAvatar } from "@/shared/ui";

const PRESETS: Array<{ value: LeaderboardPreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "this_year", label: "Year" },
];

const SORTS: Array<{ value: LeaderboardSort; label: string }> = [
  { value: "most_connections", label: "Connected" },
  { value: "most_calls", label: "Calls" },
  { value: "longest_talk_time", label: "Talk time" },
  { value: "highest_conversion", label: "Conversion" },
  { value: "most_won_leads", label: "Won" },
  { value: "most_follow_ups_completed", label: "Follow-ups" },
];

function RankBadge({ rank }: { rank: number | null }) {
  if (rank == null) {
    return <StatusBadge label="Total" tone="neutral" />;
  }
  const tone = rank === 1 ? "active" : rank <= 3 ? "pending" : "neutral";
  return <StatusBadge label={`#${rank}`} tone={tone} />;
}

function RankingRow({ card }: { card: LeaderboardCard }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
      ]}
    >
      <View style={styles.cardHeader}>
        <UserAvatar
          userId={card.id}
          name={card.name}
          profilePhotoUrl={card.profilePhotoUrl}
          size={40}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {card.designation}
            {card.teamSize != null ? ` · Team ${card.teamSize}` : ""}
          </Text>
        </View>
        <RankBadge rank={card.rank} />
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Calls</Text>
          <Text style={[styles.metricValue, { color: colors.onSurface }]}>
            {formatLeaderboardNumber(card.metrics.totalCalls)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Connected</Text>
          <Text style={[styles.metricValue, { color: colors.onSurface }]}>
            {formatLeaderboardNumber(card.metrics.connectedCalls)}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.onSurfaceVariant }]}>Talk</Text>
          <Text style={[styles.metricValue, { color: colors.onSurface }]}>
            {formatLeaderboardDuration(card.metrics.talkTimeSeconds)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.secondary : colors.primaryContainer,
              },
            ]}
          >
            <Text
              style={{
                color: selected ? colors.onSecondary : colors.onPrimaryContainer,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function LeaderboardScreen() {
  const { colors } = useTheme();
  const [preset, setPreset] = useState<LeaderboardPreset>("this_month");
  const [sortBy, setSortBy] = useState<LeaderboardSort>("most_connections");
  const { data, isLoading, isError, refetch, isRefetching, error } = useLeaderboard(preset, sortBy);

  const ranked = useMemo(
    () =>
      (data?.cards ?? [])
        .filter((card) => card.rank != null)
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [data?.cards],
  );

  if (isLoading && !data) {
    return (
      <Screen>
        <LoadingState label="Loading leaderboard…" />
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load leaderboard"
          description={error instanceof Error ? error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void refetch()}
        />
      </Screen>
    );
  }

  const summary = data?.detail.summary;

  return (
    <Screen scroll refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.onSurface }}>Leaderboard</Text>
      <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 14, fontSize: 13 }}>
        {data?.isCallerOnly
          ? "Your call, follow-up, and conversion performance."
          : "Hierarchy-scoped rankings across calls, talk time, and conversions."}
      </Text>

      <Text style={[styles.filterLabel, { color: colors.onSurfaceVariant }]}>Period</Text>
      <ChipRow options={PRESETS} value={preset} onChange={setPreset} />
      <Text style={[styles.filterLabel, { color: colors.onSurfaceVariant, marginTop: 10 }]}>
        Rank by
      </Text>
      <ChipRow options={SORTS} value={sortBy} onChange={setSortBy} />

      {summary ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, marginBottom: 8 }}>
          <StatTile label="Connected" value={formatLeaderboardNumber(summary.connectedCalls)} />
          <StatTile
            label="Talk time"
            value={formatLeaderboardDuration(summary.totalTalkTimeSeconds)}
          />
          <StatTile label="Converted" value={formatLeaderboardNumber(summary.leadsConverted)} />
          <StatTile label="Conversion" value={formatLeaderboardPercent(summary.conversionRate)} />
        </View>
      ) : null}

      <Text
        style={{
          fontWeight: "700",
          fontSize: 16,
          color: colors.onSurface,
          marginTop: 12,
          marginBottom: 10,
        }}
      >
        Rankings
      </Text>

      {ranked.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Adjust the period or wait for call activity."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {ranked.map((card) => (
            <RankingRow key={card.id} card={card} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  chips: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minHeight: 36,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metrics: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  metric: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
});
