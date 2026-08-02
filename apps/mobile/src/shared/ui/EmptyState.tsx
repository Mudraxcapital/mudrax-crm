import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/core/theme";
import { AppButton } from "./AppButton";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>{description}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  action: {
    alignSelf: "stretch",
    maxWidth: 280,
  },
});
