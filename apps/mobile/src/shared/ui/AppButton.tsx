import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from "react-native";
import { useTheme } from "@/core/theme";

type Variant = "primary" | "secondary" | "danger" | "call" | "ghost";

interface AppButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  loading?: boolean;
  variant?: Variant;
}

/**
 * NativeWind's css-interop can strip dynamic backgroundColor on Pressable.
 * Keep the fill on an inner View so the CTA stays visible.
 */
export function AppButton({
  label,
  loading,
  variant = "primary",
  disabled,
  style,
  ...rest
}: AppButtonProps) {
  const { colors } = useTheme();

  const background =
    variant === "primary"
      ? colors.primary
      : variant === "secondary"
        ? colors.primaryContainer
        : variant === "danger"
          ? colors.error
          : variant === "call"
            ? colors.call
            : "transparent";

  const foreground =
    variant === "primary"
      ? colors.onPrimary
      : variant === "secondary"
        ? colors.onPrimaryContainer
        : variant === "danger"
          ? colors.onError
          : variant === "call"
            ? colors.onCall
            : colors.secondary;

  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[styles.pressable, typeof style === "function" ? undefined : style]}
      {...rest}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.fill,
            {
              backgroundColor: background,
              borderWidth: variant === "ghost" ? 1 : 0,
              borderColor: colors.outline,
              opacity: isDisabled ? 0.55 : pressed ? 0.88 : 1,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={foreground} />
          ) : (
            <Text style={[styles.label, { color: foreground }]}>{label}</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  fill: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
  },
});
