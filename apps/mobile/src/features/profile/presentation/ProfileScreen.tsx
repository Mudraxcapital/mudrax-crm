import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { useTheme } from "@/core/theme";
import { useAuthMe, useRoleNames } from "@/features/auth/hooks/usePermissions";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import {
  canUseAndroidCallRecording,
  chooseDialerMediaPath,
  getDialerMediaPath,
  resetDialerMediaPath,
} from "@/features/calling/services/callRecording";
import { changePassword } from "@/features/profile/data/profileRepository";
import { profileDisplayName } from "@/features/profile/domain/profileDisplay";
import { AppButton, Screen, TextField, UserAvatar } from "@/shared/ui";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Mirrors web `roleMaySelfServiceChangePassword` — every fixed role. */
function canSelfServiceChangePassword(primaryRole: string | null | undefined): boolean {
  return (
    primaryRole === "Admin" ||
    primaryRole === "Manager" ||
    primaryRole === "Team Lead" ||
    primaryRole === "Caller"
  );
}

export function ProfileScreen() {
  const { colors, preference, setPreference, scheme } = useTheme();
  const session = useSessionStore((s) => s.session);
  const me = useAuthMe();
  const roleNames = useRoleNames();
  const signOut = useSessionStore((s) => s.signOut);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mediaPathLabel, setMediaPathLabel] = useState<string | null>(null);
  const [mediaPathConfigured, setMediaPathConfigured] = useState(false);
  const recordingSupported = canUseAndroidCallRecording();

  const refreshMediaPath = () => {
    const folder = getDialerMediaPath();
    setMediaPathConfigured(Boolean(folder?.configured));
    setMediaPathLabel(folder?.displayName ?? null);
  };

  useEffect(() => {
    if (Platform.OS !== "android" || !recordingSupported) return;
    refreshMediaPath();
  }, [recordingSupported]);

  const { control, handleSubmit, reset } = useForm<PasswordForm>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onChangePassword = handleSubmit(async (values) => {
    setSaving(true);
    setError(null);
    try {
      await changePassword(values);
      reset();
      setShowPasswordForm(false);
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  });

  const displayName = profileDisplayName(
    me?.user,
    session?.user?.fullName ?? session?.user?.name,
  );
  const email = me?.user.email ?? session?.user?.email ?? "—";
  const phone = me?.user.phone?.trim() || "—";
  const rolesLabel = roleNames.length > 0 ? roleNames.join(", ") : "Member";
  const userId = me?.user.id ?? session?.user?.id ?? "";
  const showChangePassword = canSelfServiceChangePassword(me?.hierarchy.primaryRole);

  return (
    <Screen scroll>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
        ]}
      >
        <View style={styles.identityRow}>
          <UserAvatar
            userId={userId}
            name={displayName}
            profilePhotoUrl={me?.user.profilePhotoUrl}
            size={72}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.name, { color: colors.onSurface }]} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
              {email}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={1}>
              {phone}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 12, fontSize: 13 }}>
          Role: {rolesLabel} · Theme: {scheme}
        </Text>
        {me ? (
          <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 12 }}>
            {me.permissions.length} permissions ·{" "}
            {me.isCallerWorkspace ? "Caller workspace" : "Enterprise workspace"}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Appearance</Text>
      <Text style={{ color: colors.onSurfaceVariant, marginBottom: 10, fontSize: 13 }}>
        Switch between light and dark mode.
      </Text>
      <View style={styles.row}>
        {(["system", "light", "dark"] as const).map((option) => {
          const selected = preference === option;
          return (
            <Pressable
              key={option}
              onPress={() => void setPreference(option)}
              style={styles.themePressable}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: selected ? colors.secondary : colors.primaryContainer,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selected ? colors.onSecondary : colors.onPrimaryContainer,
                      fontWeight: "700",
                      textTransform: "capitalize",
                    }}
                  >
                    {option}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {showChangePassword ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Security</Text>
          <Pressable
            onPress={() => setShowPasswordForm((open) => !open)}
            style={{ marginBottom: 12 }}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surfaceVariant,
                    borderColor: colors.outline,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ color: colors.onSurface, fontWeight: "700" }}>Change password</Text>
                <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 13 }}>
                  {showPasswordForm
                    ? "Hide form"
                    : "Tap to update your password (you will be signed out afterward)"}
                </Text>
              </View>
            )}
          </Pressable>

          {showPasswordForm ? (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.outline,
                  marginBottom: 16,
                },
              ]}
            >
              <Controller
                control={control}
                name="currentPassword"
                render={({ field: { onChange, value } }) => (
                  <TextField
                    label="Current password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="newPassword"
                render={({ field: { onChange, value } }) => (
                  <TextField
                    label="New password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <TextField
                    label="Confirm password"
                    secureTextEntry
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
              {error ? (
                <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text>
              ) : null}
              <AppButton
                label="Update password"
                loading={saving}
                onPress={() => void onChangePassword()}
              />
            </View>
          ) : null}
        </>
      ) : null}

      {recordingSupported ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
            Call recording (Media Path)
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, marginBottom: 10, fontSize: 13 }}>
            TeleCRM-style sync: enable Record all calls in Samsung Phone or ODialer, then select
            that recordings folder here. Mudrax imports the file after each CRM call.
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
            ]}
          >
            <Text style={{ color: colors.onSurface, fontWeight: "700" }}>
              {mediaPathConfigured
                ? mediaPathLabel ?? "Folder selected"
                : "No folder selected"}
            </Text>
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 4, fontSize: 13 }}>
              {mediaPathConfigured
                ? "Dialer recordings in this folder will be imported after outbound CRM calls."
                : "Required for reliable import on most phones (same as TeleCRM Media Path)."}
            </Text>
            <AppButton
              label={mediaPathConfigured ? "Change folder" : "Select folder"}
              onPress={() => {
                void (async () => {
                  await chooseDialerMediaPath();
                  refreshMediaPath();
                })();
              }}
              style={{ marginTop: 12 }}
            />
            {mediaPathConfigured ? (
              <AppButton
                label="Clear folder"
                variant="secondary"
                onPress={() => {
                  void (async () => {
                    await resetDialerMediaPath();
                    refreshMediaPath();
                  })();
                }}
                style={{ marginTop: 8 }}
              />
            ) : null}
          </View>
        </>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Session</Text>
      <AppButton
        label="Log out"
        variant="danger"
        loading={loggingOut}
        onPress={() => {
          setLoggingOut(true);
          void signOut().finally(() => setLoggingOut(false));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
  },
  sectionTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  themePressable: {
    flex: 1,
  },
  themeChip: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
