import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/core/theme";

export function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceVariant,
        borderColor: colors.outline,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.onSurface }}>{title}</Text>
      {description ? (
        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4, marginBottom: 10 }}>
          {description}
        </Text>
      ) : (
        <View style={{ height: 10 }} />
      )}
      {children}
    </View>
  );
}
