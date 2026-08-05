import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/core/theme";
import { useBootstrapSession } from "@/features/auth/hooks/useBootstrapSession";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { PostCallScreen } from "@/features/calling/presentation/PostCallScreen";
import { LeadDetailsScreen } from "@/features/leads/presentation/LeadDetailsScreen";
import { ForceChangePasswordScreen } from "@/features/profile/presentation/ForceChangePasswordScreen";
import { AuthNavigator } from "./AuthNavigator";
import { MainTabs } from "./MainTabs";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isHydrated = useBootstrapSession();
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const mustChangePassword = useSessionStore(
    (s) => !!s.me?.user.mustChangePassword || !!s.session?.user?.mustChangePassword,
  );
  const { colors, scheme } = useTheme();

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.secondary,
      background: colors.surface,
      card: colors.surfaceVariant,
      text: colors.onSurface,
      border: colors.outline,
      notification: colors.secondary,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          contentStyle: { backgroundColor: colors.surface },
          animation: "fade",
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{ headerShown: false, animation: "none" }}
          />
        ) : mustChangePassword ? (
          <Stack.Screen
            name="ForceChangePassword"
            component={ForceChangePasswordScreen}
            options={{ headerShown: false, animation: "none" }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false, animation: "none" }}
            />
            <Stack.Screen
              name="LeadDetails"
              component={LeadDetailsScreen}
              options={{ title: "Lead" }}
            />
            <Stack.Screen
              name="PostCall"
              component={PostCallScreen}
              options={{ title: "Disposition", headerBackVisible: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
