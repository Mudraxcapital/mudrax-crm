import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "@/core/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          marginBottom: 6,
          fontSize: 13,
          fontWeight: "600",
          color: colors.onSurface,
        }}
      >
        {label}
      </Text>
      <TextInput
        placeholderTextColor={colors.onSurfaceVariant}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.error : colors.outline,
            backgroundColor: colors.surfaceVariant,
            color: colors.onSurface,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            minHeight: 48,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text style={{ marginTop: 4, color: colors.error, fontSize: 12 }}>{error}</Text>
      ) : null}
    </View>
  );
}
