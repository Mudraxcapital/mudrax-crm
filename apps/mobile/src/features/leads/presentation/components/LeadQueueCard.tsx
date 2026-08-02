import { Pressable, Text, View } from "react-native";
import type { Lead } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import { extractPriority } from "@/features/leads/domain/statusFilters";
import { StatusBadge } from "@/shared/ui";
import { formatDateTime, formatPhone, stageTone } from "@/shared/utils/format";

export function LeadQueueCard({
  lead,
  assigneeName,
  onPress,
}: {
  lead: Lead;
  assigneeName?: string | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const priority = extractPriority(lead.fieldValues);

  return (
    <Pressable
      onPress={onPress}
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
          gap: 12,
          marginBottom: 6,
        }}
      >
        <Text style={{ flex: 1, fontSize: 17, fontWeight: "700", color: colors.onSurface }}>
          {lead.fullNameSnapshot}
        </Text>
        <StatusBadge
          label={lead.currentStageName}
          tone={stageTone(String(lead.currentStageBucket))}
        />
      </View>
      <Text style={{ color: colors.onSurfaceVariant }}>{formatPhone(lead.phoneSnapshot)}</Text>
      <Text style={{ color: colors.onSurfaceVariant, marginTop: 6, fontSize: 13 }}>
        {assigneeName ?? "Unassigned"}
        {" · "}
        Follow-up {formatDateTime(lead.nextActionAt)}
        {priority ? ` · Priority ${priority}` : ""}
      </Text>
    </Pressable>
  );
}
