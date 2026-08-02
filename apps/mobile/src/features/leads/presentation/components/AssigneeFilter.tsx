import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTheme } from "@/core/theme";
import { useLeadAssignees } from "@/features/leads/hooks/useLeadWorkspace";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";

export function AssigneeFilter() {
  const { colors } = useTheme();
  const assigneeUserId = useLeadWorkflowStore((s) => s.assigneeUserId);
  const setAssigneeUserId = useLeadWorkflowStore((s) => s.setAssigneeUserId);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { showFilter, assignees, isLoading } = useLeadAssignees(search);

  if (!showFilter) return null;

  const selected = assignees.find((user) => user.id === assigneeUserId);
  const label = selected?.fullName ?? "All assignees";

  return (
    <View style={{ marginTop: 8 }}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        style={{
          borderWidth: 1,
          borderColor: colors.outline,
          backgroundColor: colors.surfaceVariant,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: 48,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>Assignee</Text>
        <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: 2 }}>{label}</Text>
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.outline,
            borderRadius: 14,
            backgroundColor: colors.surface,
            padding: 10,
            maxHeight: 260,
          }}
        >
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search assignee"
            placeholderTextColor={colors.onSurfaceVariant}
            style={{
              borderWidth: 1,
              borderColor: colors.outline,
              backgroundColor: colors.surfaceVariant,
              color: colors.onSurface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 8,
            }}
          />
          <Pressable
            onPress={() => {
              setAssigneeUserId(null);
              setOpen(false);
            }}
            style={{ paddingVertical: 10, paddingHorizontal: 8 }}
          >
            <Text
              style={{
                color: !assigneeUserId ? colors.secondary : colors.onSurface,
                fontWeight: !assigneeUserId ? "700" : "500",
              }}
            >
              All
            </Text>
          </Pressable>
          {isLoading ? (
            <Text style={{ color: colors.onSurfaceVariant, padding: 8 }}>Loading…</Text>
          ) : (
            assignees.slice(0, 40).map((user) => {
              const selectedUser = user.id === assigneeUserId;
              return (
                <Pressable
                  key={user.id}
                  onPress={() => {
                    setAssigneeUserId(user.id);
                    setOpen(false);
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 8 }}
                >
                  <Text
                    style={{
                      color: selectedUser ? colors.secondary : colors.onSurface,
                      fontWeight: selectedUser ? "700" : "500",
                    }}
                  >
                    {user.fullName}
                  </Text>
                  {user.roleName ? (
                    <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                      {user.roleName}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}
