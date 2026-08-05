import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { useTheme } from "@/core/theme";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { changePassword } from "@/features/profile/data/profileRepository";
import { AppButton, Screen, TextField } from "@/shared/ui";

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/** Shown when mustChangePassword is set after create / Admin reset. */
export function ForceChangePasswordScreen() {
  const { colors } = useTheme();
  const signOut = useSessionStore((s) => s.signOut);
  const email = useSessionStore((s) => s.session?.user?.email ?? s.me?.user.email);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { control, handleSubmit } = useForm<PasswordForm>({
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
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password.");
    } finally {
      setSaving(false);
    }
  });

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: colors.onSurface }]}>Change your password</Text>
      <Text style={{ color: colors.onSurfaceVariant, marginBottom: 16, fontSize: 14 }}>
        Your administrator set a temporary password. Choose a new one before continuing
        {email ? ` (${email})` : ""}.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.outline },
        ]}
      >
        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, value } }) => (
            <TextField
              label="Current (temporary) password"
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
        {error ? <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
        <AppButton
          label="Update password"
          loading={saving}
          onPress={() => void onChangePassword()}
        />
      </View>

      <AppButton
        label="Sign out"
        variant="secondary"
        loading={loggingOut}
        onPress={() => {
          setLoggingOut(true);
          void signOut().finally(() => setLoggingOut(false));
        }}
        style={{ marginTop: 8 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
});
