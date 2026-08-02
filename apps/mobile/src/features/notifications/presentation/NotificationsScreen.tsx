import { useEffect, useRef } from "react";
import { FlatList, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useTheme } from "@/core/theme";
import { listNotifications } from "@/features/notifications/data/notificationsRepository";
import { EmptyState, LoadingState, Screen, StatusBadge } from "@/shared/ui";
import { formatDateTime } from "@/shared/utils/format";

/** Expo Go (SDK 53+) does not support remote push; keep local reminders optional. */
const notificationsSupported = Constants.appOwnership !== "expo";

async function getNotificationsModule() {
  if (!notificationsSupported) return null;
  try {
    return await import("expo-notifications");
  } catch {
    return null;
  }
}

void getNotificationsModule().then((Notifications) => {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
});

function humanizeCode(code: string): string {
  const lower = code.toLowerCase();
  if (lower.includes("follow")) return "Follow-up reminder";
  if (lower.includes("assign") || lower.includes("lead")) return "New lead assignment";
  if (lower.includes("call")) return "Call update";
  if (lower.includes("email")) return "Email notification";
  if (lower.includes("sms")) return "SMS notification";
  const cleaned = code
    .split(/[._-]+/)
    .filter((part) => part.length > 0 && !/^\d+$/.test(part) && part !== "integration")
    .join(" ");
  return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : "Notification";
}

function notificationTitle(
  payload: Record<string, unknown>,
  templateCode: string | null,
  category: string,
): string {
  const title = payload.title ?? payload.subject ?? payload.message ?? payload.body;
  if (typeof title === "string" && title.trim() && !title.includes("integration.")) {
    return title.trim();
  }
  return humanizeCode(templateCode ?? category);
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const seenIds = useRef(new Set<string>());
  const primed = useRef(false);

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    void getNotificationsModule().then((Notifications) => {
      void Notifications?.requestPermissionsAsync();
    });
  }, []);

  useEffect(() => {
    const items = query.data ?? [];
    if (!primed.current) {
      for (const item of items) seenIds.current.add(item.id);
      primed.current = true;
      return;
    }

    void getNotificationsModule().then((Notifications) => {
      if (!Notifications) return;
      for (const item of items) {
        if (seenIds.current.has(item.id)) continue;
        seenIds.current.add(item.id);
        const code = (item.templateCode ?? item.category ?? "").toLowerCase();
        if (
          !(
            code.includes("follow") ||
            code.includes("lead") ||
            code.includes("assign") ||
            code.includes("reminder")
          )
        ) {
          continue;
        }
        void Notifications.scheduleNotificationAsync({
          content: {
            title: "Mudrax CRM",
            body: notificationTitle(item.payload, item.templateCode, item.category),
          },
          trigger: null,
        }).catch(() => undefined);
      }
    });
  }, [query.data]);

  if (query.isLoading && !query.data) {
    return (
      <Screen>
        <LoadingState label="Loading notifications…" />
      </Screen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <Screen>
        <EmptyState
          title="Couldn't load notifications"
          description={query.error instanceof Error ? query.error.message : "Please try again."}
          actionLabel="Retry"
          onAction={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const items = query.data ?? [];

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
            title={"You're all caught up"}
            description="Follow-up reminders and new lead assignments will show here."
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
              <Text style={{ flex: 1, fontWeight: "700", color: colors.onSurface }}>
                {notificationTitle(item.payload, item.templateCode, item.category)}
              </Text>
              <StatusBadge label={item.status} tone="neutral" />
            </View>
            <Text style={{ color: colors.onSurfaceVariant }}>
              {formatDateTime(item.createdAt)}
            </Text>
          </View>
        )}
      />
    </Screen>
  );
}
