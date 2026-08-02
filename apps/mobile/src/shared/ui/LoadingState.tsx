import { ActivityIndicator, Text, View } from "react-native";
import { useTheme } from "@/core/theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size="large" color={colors.secondary} />
      <Text style={{ color: colors.onSurfaceVariant }}>{label}</Text>
    </View>
  );
}
