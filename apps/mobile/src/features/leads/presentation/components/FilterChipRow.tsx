import { Pressable, ScrollView, Text } from "react-native";
import { useTheme } from "@/core/theme";

export function FilterChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
    >
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: selected ? colors.secondary : colors.primaryContainer,
              borderWidth: 1,
              borderColor: selected ? colors.secondary : colors.outline,
            }}
          >
            <Text
              style={{
                color: selected ? colors.onSecondary : colors.onPrimaryContainer,
                fontWeight: "600",
                fontSize: 13,
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
