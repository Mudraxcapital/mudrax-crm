import { Text, View } from "react-native";
import { useTheme } from "@/core/theme";

interface StatusBadgeProps {
  label: string;
  tone?: "pending" | "active" | "closed" | "neutral";
}

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  const { colors } = useTheme();
  const bg =
    tone === "pending"
      ? colors.badgePending
      : tone === "active"
        ? colors.badgeActive
        : tone === "closed"
          ? colors.badgeClosed
          : colors.primaryContainer;
  const fg =
    tone === "neutral" ? colors.onPrimaryContainer : colors.onPrimary;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}
