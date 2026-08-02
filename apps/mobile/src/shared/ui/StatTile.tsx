import { Text, View } from "react-native";
import { useTheme } from "@/core/theme";

interface StatTileProps {
  label: string;
  value: number | string;
}

export function StatTile({ label, value }: StatTileProps) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.outline,
      }}
    >
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 6 }}>
        {label}
      </Text>
      <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}
