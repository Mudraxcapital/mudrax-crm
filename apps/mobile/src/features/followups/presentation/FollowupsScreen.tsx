import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@/core/theme";
import {
  completeFollowup,
  listFollowups,
  updateFollowup,
} from "@/features/followups/data/followupsRepository";
import type { RootStackParamList } from "@/navigation/types";
import {
  AppButton,
  EmptyState,
  FollowUpDateTimePicker,
  LoadingState,
  Screen,
  StatusBadge,
} from "@/shared/ui";
import { formatDateTime, isSameLocalDay } from "@/shared/utils/format";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FollowupsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["followups", "today"],
    queryFn: async () => {
      const result = await listFollowups();
      return result.data.filter(
        (item) =>
          isSameLocalDay(item.scheduledFor) &&
          item.status !== "COMPLETED" &&
          item.status !== "CANCELLED",
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeFollowup(id),
    onSuccess: () => void queryClient.invalidateQueries(),
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledFor }: { id: string; scheduledFor: string }) =>
      updateFollowup(id, { scheduledFor }),
    onSuccess: () => {
      setRescheduleId(null);
      void queryClient.invalidateQueries();
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

  if (query.isLoading && !query.data) {
    return (
      <Screen>
        <LoadingState label="Loading follow-ups…" />
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load follow-ups"
          description={query.error instanceof Error ? query.error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            title="No follow-ups today"
            description="You're clear — start calling from Home when ready."
          />
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.surfaceVariant,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.outline,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Pressable
                style={{ flex: 1 }}
                onPress={() => navigation.navigate("LeadDetails", { leadId: item.leadId })}
              >
                <Text style={{ fontWeight: "700", color: colors.onSurface, fontSize: 16 }}>
                  Lead {item.leadId.slice(0, 8)}…
                </Text>
                <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDateTime(item.scheduledFor)}
                </Text>
              </Pressable>
              <StatusBadge label={item.status} tone="active" />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Done"
                  variant="call"
                  loading={completeMutation.isPending}
                  onPress={() => completeMutation.mutate(item.id)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Reschedule"
                  variant="secondary"
                  onPress={() => setRescheduleId(item.id)}
                />
              </View>
            </View>
          </View>
        )}
      />
      {rescheduleId ? (
        <FollowUpDateTimePicker
          value={new Date(Date.now() + 60 * 60 * 1000)}
          onConfirm={(date) => {
            rescheduleMutation.mutate({
              id: rescheduleId,
              scheduledFor: date.toISOString(),
            });
          }}
          onCancel={() => setRescheduleId(null)}
        />
      ) : null}
    </Screen>
  );
}
