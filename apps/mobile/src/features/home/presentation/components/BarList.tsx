import { Text, View } from "react-native";
import { useTheme } from "@/core/theme";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
}

export function BarList({ data }: { data: BarListItem[] }) {
  const { colors } = useTheme();
  const max = Math.max(...data.map((item) => item.value), 1);

  if (data.length === 0) {
    return <Text style={{ color: colors.onSurfaceVariant, fontSize: 13 }}>No data yet.</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {data.map((item) => {
        const widthPct = Math.max(6, Math.round((item.value / max) * 100));
        return (
          <View key={item.key}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{ color: colors.onSurface, fontSize: 13, fontWeight: "600", flex: 1 }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 13, fontWeight: "700" }}>
                {item.value}
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.outline,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${widthPct}%`,
                  height: "100%",
                  backgroundColor: colors.secondary,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
