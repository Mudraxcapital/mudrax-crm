import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/core/theme";

interface ScreenProps extends ViewProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

export function Screen({
  children,
  scroll = false,
  refreshing,
  onRefresh,
  padded = true,
  style,
  ...rest
}: ScreenProps) {
  const { colors } = useTheme();

  const body = (
    <View style={[styles.flex, padded ? styles.padded : null, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.surface }]}>
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.surface }]} edges={["bottom"]}>
        {scroll ? (
          <ScrollView
            style={{ backgroundColor: colors.surface }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} />
              ) : undefined
            }
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16 },
  scrollContent: { flexGrow: 1 },
});
