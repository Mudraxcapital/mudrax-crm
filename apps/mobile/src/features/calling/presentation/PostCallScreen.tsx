import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import { MudraxApiError } from "@mudrax/api";
import type { CallDisposition } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import { completeCallDisposition } from "@/features/calling/data/callingRepository";
import {
  CALL_RESULT_OPTIONS,
  RING_PRESETS_SECONDS,
  formatCallDuration,
  inferCallResult,
  inferCallWasConnected,
  nearestRingPreset,
  splitCallTiming,
} from "@/features/calling/domain/callTiming";
import { createFollowup } from "@/features/followups/data/followupsRepository";
import {
  addLeadNote,
  changeLeadStage,
} from "@/features/leads/data/leadsRepository";
import {
  filterCallerLeadStages,
  findRingingStage,
} from "@/features/leads/domain/callerStages";
import {
  useCallerCatalog,
  useLeadStages,
  useNextLeadId,
  useOptimisticLeadStageUpdate,
  useWorkspaceLead,
} from "@/features/leads/hooks/useLeadWorkspace";
import type { RootStackParamList } from "@/navigation/types";
import {
  AppButton,
  FollowUpDateTimePicker,
  LoadingState,
  Screen,
  TextField,
} from "@/shared/ui";
import { formatDateTime } from "@/shared/utils/format";

type Route = RouteProp<RootStackParamList, "PostCall">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

interface FormValues {
  notes: string;
  stageId: string;
  lostReasonId?: string;
  followUpAt: Date | null;
  callResult: CallDisposition;
  ringSeconds: number;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof MudraxApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export function PostCallScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const userId = useSessionStore((s) => s.session?.user?.id);
  const {
    leadId,
    campaignId,
    callAttemptId,
    nextLeadId: routeNextLeadId,
    callStartedAtMs,
    verifiedDurationSeconds,
    dialElapsedSeconds,
    callLogVerified,
    recordingCaptured,
    recordingLogged,
    recordingError,
  } = route.params;

  const leadQuery = useWorkspaceLead(leadId, campaignId);
  const callerCatalogQuery = useCallerCatalog(leadQuery.data?.currentStageId);
  const staffCatalogQuery = useLeadStages();
  const filteredNextLeadId = useNextLeadId(leadId);
  const nextLeadId = filteredNextLeadId ?? routeNextLeadId ?? null;
  const optimisticStageUpdate = useOptimisticLeadStageUpdate();
  const [submitting, setSubmitting] = useState<"save" | "next" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const initializedStage = useRef(false);
  const startedAtMs = callStartedAtMs ?? Date.now();
  const hasVerifiedDuration = typeof verifiedDurationSeconds === "number";
  const callLogTalkSeconds = hasVerifiedDuration
    ? Math.max(0, Math.round(verifiedDurationSeconds))
    : null;
  const inferredConnected = inferCallWasConnected(callLogTalkSeconds);
  const inferredResult = inferCallResult(callLogTalkSeconds);
  const [wallDialSeconds, setWallDialSeconds] = useState(() =>
    typeof dialElapsedSeconds === "number"
      ? Math.max(0, Math.round(dialElapsedSeconds))
      : Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)),
  );

  useEffect(() => {
    // Dial wall-clock from LeadDetails is fixed once the call log settles.
    if (typeof dialElapsedSeconds === "number") {
      setWallDialSeconds(Math.max(0, Math.round(dialElapsedSeconds)));
      return;
    }
    const id = setInterval(() => {
      setWallDialSeconds(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAtMs, dialElapsedSeconds]);

  const stages = useMemo(() => {
    const raw =
      callerCatalogQuery.data?.stages?.length
        ? callerCatalogQuery.data.stages
        : (staffCatalogQuery.data?.stages ?? []);
    return filterCallerLeadStages(raw, leadQuery.data?.currentStageId);
  }, [
    callerCatalogQuery.data?.stages,
    staffCatalogQuery.data?.stages,
    leadQuery.data?.currentStageId,
  ]);

  const lostReasons =
    callerCatalogQuery.data?.lostReasons?.length
      ? callerCatalogQuery.data.lostReasons
      : (staffCatalogQuery.data?.lostReasons ?? []);

  const ringingStage = useMemo(() => findRingingStage(stages), [stages]);

  const initialTiming = splitCallTiming({
    connected: inferredConnected,
    callLogDurationSeconds: callLogTalkSeconds,
    dialElapsedSeconds: wallDialSeconds,
  });

  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues: {
      notes: "",
      stageId: "",
      lostReasonId: undefined,
      followUpAt: null,
      callResult: inferredResult,
      ringSeconds: nearestRingPreset(initialTiming.ringSeconds),
    },
  });

  // Default lead status: Ringing only when the call never connected.
  useEffect(() => {
    if (initializedStage.current) return;
    if (!stages.length) return;
    const preferred = inferredConnected
      ? (leadQuery.data?.currentStageId ?? stages[0]?.id ?? "")
      : (ringingStage?.id ?? leadQuery.data?.currentStageId ?? stages[0]?.id ?? "");
    if (!preferred) return;
    setValue("stageId", preferred);
    initializedStage.current = true;
  }, [
    stages,
    ringingStage?.id,
    leadQuery.data?.currentStageId,
    inferredConnected,
    setValue,
  ]);

  const selectedStageId = watch("stageId");
  const callResult = watch("callResult");
  const ringSeconds = watch("ringSeconds");
  const selectedStage = useMemo(
    () => stages.find((s) => s.id === selectedStageId),
    [stages, selectedStageId],
  );
  const needsLostReason = selectedStage?.closeOutcome === "LOST";
  const needsDndNote = Boolean(
    selectedStage &&
      (/^do\s*not\s*disturb$/i.test(selectedStage.name.trim()) ||
        /^dnd$/i.test(selectedStage.name.trim())),
  );
  const needsRequiredNote = needsLostReason || needsDndNote;
  const callResultMeta = CALL_RESULT_OPTIONS.find((o) => o.value === callResult);
  const isConnected = Boolean(callResultMeta?.connected);
  const timing = splitCallTiming({
    connected: isConnected,
    callLogDurationSeconds: callLogTalkSeconds,
    dialElapsedSeconds: wallDialSeconds,
    ringOverrideSeconds: ringSeconds,
  });
  const connectedSeconds = timing.talkSeconds;
  const elapsedSeconds = timing.totalSeconds;

  const save = async (values: FormValues, goNext: boolean) => {
    if (!values.stageId) {
      setError("Select a lead status.");
      return;
    }
    if (needsLostReason && !values.lostReasonId) {
      setError("Select a lost reason.");
      return;
    }
    if (needsLostReason && !values.notes.trim()) {
      setError("A note is required when marking a lead as Lost.");
      return;
    }
    if (needsDndNote && !values.notes.trim()) {
      setError("A note is required when marking a lead as Do Not Disturb.");
      return;
    }

    setSubmitting(goNext ? "next" : "save");
    setError(null);

    const failures: string[] = [];

    try {
      // Optional note for non-Lost/DND stages. Required notes are saved via changeLeadStage.
      if (!needsRequiredNote && values.notes.trim()) {
        try {
          await addLeadNote(leadId, values.notes.trim());
        } catch (err) {
          failures.push(errorMessage(err, "Could not save note."));
        }
      }

      if (values.followUpAt) {
        try {
          if (!userId) {
            throw new Error("Session expired — sign in again to schedule a follow-up.");
          }
          await createFollowup({
            leadId,
            triggerType: "FOLLOW_UP",
            scheduledFor: values.followUpAt.toISOString(),
            currentAssigneeUserId: userId,
          });
        } catch (err) {
          failures.push(errorMessage(err, "Could not create follow-up."));
        }
      }

      try {
        await changeLeadStage(leadId, {
          stageId: values.stageId,
          lostReasonId: needsLostReason ? values.lostReasonId : undefined,
          note: needsRequiredNote ? values.notes.trim() : undefined,
        });
        if (selectedStage) {
          optimisticStageUpdate(leadId, {
            currentStageId: selectedStage.id,
            currentStageName: selectedStage.name,
            currentStageBucket: String(selectedStage.bucket) as
              | "INITIAL"
              | "ACTIVE"
              | "CLOSED",
          });
        }
      } catch (err) {
        failures.push(errorMessage(err, "Could not update lead status."));
      }

      // Stamp talk time for connected calls (call-log duration). Leaderboard
      // counts durationSeconds as talk time for COMPLETED/connected statuses.
      if (callAttemptId) {
        try {
          const connected = Boolean(
            CALL_RESULT_OPTIONS.find((o) => o.value === values.callResult)?.connected,
          );
          const savedTiming = splitCallTiming({
            connected,
            callLogDurationSeconds: callLogTalkSeconds,
            dialElapsedSeconds: wallDialSeconds,
            ringOverrideSeconds: values.ringSeconds,
          });
          await completeCallDisposition(callAttemptId, {
            disposition: values.callResult,
            connected,
            durationSeconds: connected
              ? savedTiming.talkSeconds
              : savedTiming.ringSeconds,
          });
        } catch (err) {
          failures.push(errorMessage(err, "Could not update call attempt."));
        }
      }

      void queryClient.invalidateQueries({ queryKey: ["lead-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["lead-workspace"] });
      void queryClient.invalidateQueries({ queryKey: ["home-dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["followups"] });
      void queryClient.invalidateQueries({ queryKey: ["leaderboard"] });

      if (failures.length > 0) {
        setError(failures.join(" "));
        return;
      }

      if (goNext) {
        if (nextLeadId) {
          navigation.replace("LeadDetails", { leadId: nextLeadId, campaignId });
        } else {
          Alert.alert("No more leads available.", undefined, [
            {
              text: "OK",
              onPress: () => navigation.navigate("Main", { screen: "LeadQueue" }),
            },
          ]);
        }
      } else {
        navigation.navigate("Main", { screen: "LeadQueue" });
      }
    } finally {
      setSubmitting(null);
    }
  };

  const catalogLoading =
    (callerCatalogQuery.isLoading || staffCatalogQuery.isLoading) && stages.length === 0;

  if (leadQuery.isLoading || catalogLoading) {
    return (
      <Screen>
        <LoadingState label="Preparing disposition…" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.onSurface, marginBottom: 4 }}>
        Call disposition
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, marginBottom: 14 }}>
        {leadQuery.data?.fullNameSnapshot ?? "Lead"} · set status, notes, and follow-up
      </Text>

      <View
        style={{
          backgroundColor: colors.surfaceVariant,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.outline,
          padding: 14,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
          Call time · {leadQuery.data?.fullNameSnapshot ?? "this lead"}
        </Text>
        {callLogVerified ? (
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
            Verified from phone call log (not dialer-open timer)
          </Text>
        ) : null}
        {recordingCaptured ? (
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
            {recordingLogged
              ? "Call recording saved on this phone and logged in CRM"
              : "Call recording saved on this phone"}
          </Text>
        ) : recordingError ? (
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
            Recording unavailable: {recordingError}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>Ringing</Text>
            <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "800", marginTop: 2 }}>
              {formatCallDuration(timing.ringSeconds)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurfaceVariant, fontSize: 11 }}>Connected</Text>
            <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "800", marginTop: 2 }}>
              {isConnected ? formatCallDuration(connectedSeconds) : "—"}
            </Text>
          </View>
        </View>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 8 }}>
          {isConnected
            ? `Total dial ${formatCallDuration(elapsedSeconds)} · talk from phone call log${
                callLogVerified ? "" : " (estimate)"
              }`
            : inferredConnected
              ? "Phone call log shows talk time — mark Connected to keep it."
              : "Phone call log shows no talk time (never answered). Mark Connected only if they picked up."}
        </Text>
      </View>

      <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
        Call result
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {CALL_RESULT_OPTIONS.map((option) => {
          const selected = callResult === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => {
                setValue("callResult", option.value);
                if (option.connected) {
                  const next = splitCallTiming({
                    connected: true,
                    callLogDurationSeconds: callLogTalkSeconds,
                    dialElapsedSeconds: wallDialSeconds,
                  });
                  setValue("ringSeconds", nearestRingPreset(next.ringSeconds));
                }
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: selected ? colors.secondary : colors.primaryContainer,
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
      </View>

      {isConnected ? (
        <>
          <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
            Ring time (adjust if needed)
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
            Connected talk time comes from the phone call log and stays fixed. Ring time is
            dial length minus talk.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {RING_PRESETS_SECONDS.map((seconds) => {
              const selected = ringSeconds === seconds;
              return (
                <Pressable
                  key={seconds}
                  onPress={() => setValue("ringSeconds", seconds)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: selected ? colors.primary : colors.primaryContainer,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.onPrimary : colors.onPrimaryContainer,
                      fontWeight: "600",
                      fontSize: 12,
                    }}
                  >
                    {seconds === 0 ? "0s" : `${seconds}s`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
        Lead status
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {stages.map((stage) => {
          const selected = selectedStageId === stage.id;
          const isDnd =
            /^do\s*not\s*disturb$/i.test(stage.name.trim()) || /^dnd$/i.test(stage.name.trim());
          return (
            <Pressable
              key={stage.id}
              onPress={() => {
                setValue("stageId", stage.id);
                if (stage.closeOutcome !== "LOST") {
                  setValue("lostReasonId", undefined);
                }
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: selected ? colors.primary : colors.primaryContainer,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.onPrimary : colors.onPrimaryContainer,
                  fontWeight: isDnd ? "800" : "600",
                  fontSize: 13,
                }}
              >
                {stage.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {stages.length === 0 ? (
        <Text style={{ color: colors.error, marginBottom: 12 }}>
          No lead statuses available. Pull to refresh or check permissions.
        </Text>
      ) : null}

      {needsLostReason ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
            Lost reason
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {lostReasons.map((reason) => {
              const selected = watch("lostReasonId") === reason.id;
              return (
                <Pressable
                  key={reason.id}
                  onPress={() => setValue("lostReasonId", reason.id)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: selected ? colors.error : colors.primaryContainer,
                  }}
                >
                  <Text
                    style={{
                      color: selected ? colors.onError : colors.onPrimaryContainer,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {reason.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <Controller
        control={control}
        name="notes"
        render={({ field: { onChange, value } }) => (
          <TextField
            label={
              needsDndNote
                ? "Do Not Disturb note (required)"
                : needsLostReason
                  ? "Lost note (required)"
                  : "Notes"
            }
            value={value}
            onChangeText={onChange}
            multiline
            style={{ minHeight: 100, textAlignVertical: "top" }}
          />
        )}
      />
      {needsLostReason ? (
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 12 }}>
          A note is required when marking this lead as Lost.
        </Text>
      ) : null}
      {needsDndNote ? (
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 12 }}>
          A note is required when marking this lead as Do Not Disturb.
        </Text>
      ) : null}

      <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
        Follow-up
      </Text>
      <AppButton
        label={
          watch("followUpAt")
            ? `Follow-up: ${formatDateTime(watch("followUpAt")!.toISOString())}`
            : "Set follow-up date/time"
        }
        variant="secondary"
        onPress={() => setShowPicker(true)}
        style={{ marginBottom: 8 }}
      />
      {watch("followUpAt") ? (
        <AppButton
          label="Clear follow-up"
          variant="ghost"
          onPress={() => setValue("followUpAt", null)}
          style={{ marginBottom: 12 }}
        />
      ) : (
        <View style={{ height: 12 }} />
      )}
      {showPicker ? (
        <FollowUpDateTimePicker
          value={watch("followUpAt") ?? new Date(Date.now() + 60 * 60 * 1000)}
          onConfirm={(date) => {
            setShowPicker(false);
            setValue("followUpAt", date);
          }}
          onCancel={() => setShowPicker(false)}
        />
      ) : null}

      {error ? (
        <Text style={{ color: colors.error, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <AppButton
        label="Save"
        loading={submitting === "save"}
        disabled={Boolean(submitting)}
        onPress={() => void handleSubmit((values) => save(values, false))()}
        style={{ marginBottom: 10 }}
      />
      <AppButton
        label="Save & Next"
        variant="call"
        loading={submitting === "next"}
        disabled={Boolean(submitting)}
        onPress={() => void handleSubmit((values) => save(values, true))()}
      />
      {!nextLeadId ? (
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 8, textAlign: "center" }}>
          No more leads in this filtered queue.
        </Text>
      ) : null}
    </Screen>
  );
}
