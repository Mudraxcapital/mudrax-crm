import type { ComponentType } from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/core/theme";
import {
  useIsCallerWorkspace,
  usePermissionCodes,
} from "@/features/auth/hooks/usePermissions";
import { CampaignsScreen } from "@/features/campaigns/presentation/CampaignsScreen";
import { FollowupsScreen } from "@/features/followups/presentation/FollowupsScreen";
import { HomeScreen } from "@/features/home/presentation/HomeScreen";
import { LeadQueueScreen } from "@/features/leads/presentation/LeadQueueScreen";
import { LeaderboardScreen } from "@/features/leaderboard/presentation/LeaderboardScreen";
import { ProfileScreen } from "@/features/profile/presentation/ProfileScreen";
import { resolveMobileNavItems } from "./navConfig";
import type { MainTabParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

const SCREEN_MAP: Record<keyof MainTabParamList, ComponentType> = {
  Home: HomeScreen,
  Campaigns: CampaignsScreen,
  LeadQueue: LeadQueueScreen,
  Followups: FollowupsScreen,
  Leaderboard: LeaderboardScreen,
  Profile: ProfileScreen,
};

export function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const permissions = usePermissionCodes();
  const isCallerWorkspace = useIsCallerWorkspace();
  const items = resolveMobileNavItems(permissions, isCallerWorkspace);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.onPrimary,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.surface },
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: {
          backgroundColor: colors.surfaceVariant,
          borderTopColor: colors.outline,
          height: 56 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
      }}
    >
      {items.map((item) => (
        <Tab.Screen
          key={item.key}
          name={item.key}
          component={SCREEN_MAP[item.key]}
          options={{
            title: item.title,
            tabBarLabel: item.tabBarLabel,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? item.focusedIcon : item.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  tabItem: {
    paddingTop: 2,
  },
});
