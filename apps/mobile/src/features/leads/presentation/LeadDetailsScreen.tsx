import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, AppState, Platform, Pressable, Text, View } from "react-native";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MudraxApiError } from "@mudrax/api";
import type { CallRecording } from "@mudrax/types";
import { useTheme } from "@/core/theme";
import { useHasPermission } from "@/features/auth/hooks/usePermissions";
import { useSessionStore } from "@/features/auth/store/sessionStore";
import {
  listLeadCallRecordings,
  logCallAttempt,
  logCallRecording,
} from "@/features/calling/data/callingRepository";
import {
  canPlayLocalRecording,
  canUseAndroidCallRecording,
  playStoredCallRecording,
  stopStoredCallRecordingPlayback,
  tryArmCallRecording,
  tryDisarmCallRecording,
} from "@/features/calling/services/callRecording";
import { formatCallDuration } from "@/features/calling/domain/callTiming";
import { placeNativeCall } from "@/features/calling/services/nativeDialer";
import {
  ensureCallLogPermission,
  isCallLogVerificationAvailable,
  waitForRecordingSettled,
  waitForVerifiedOutboundCall,
} from "@/features/calling/services/verifyOutboundCall";
import { useSimPreferenceStore } from "@/features/calling/store/simPreferenceStore";
import {
  changeLeadStage,
  fetchCallerCatalog,
  fetchLeadCatalog,
} from "@/features/leads/data/leadsRepository";
import { findRingingStage } from "@/features/leads/domain/callerStages";
import { extractPriority } from "@/features/leads/domain/statusFilters";
import {
  useLeadAssignees,
  useLeadQueueItems,
  useOptimisticLeadStageUpdate,
  useWorkspaceLead,
  leadKeys,
} from "@/features/leads/hooks/useLeadWorkspace";
import { useLeadWorkflowStore } from "@/features/leads/store/leadWorkflowStore";
import type { RootStackParamList } from "@/navigation/types";
import {
  AppButton,
  EmptyState,
  LoadingState,
  Screen,
  StatusBadge,
} from "@/shared/ui";
import { formatDateTime, formatPhone, stageTone } from "@/shared/utils/format";

type Route = RouteProp<RootStackParamList, "LeadDetails">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LeadDetailsScreen() {
  const { colors } = useTheme();
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { leadId, campaignId: routeCampaignId } = route.params;
  const storeCampaignId = useLeadWorkflowStore((s) => s.selectedCampaignId);
  const campaignId = routeCampaignId ?? storeCampaignId ?? undefined;
  const userId = useSessionStore((s) => s.session?.user?.id);
  const sessionName = useSessionStore((s) => s.session?.user?.fullName ?? s.me?.user?.fullName);
  const preferredSlot = useSimPreferenceStore((s) => s.preferredSlot);
  const hydrateSims = useSimPreferenceStore((s) => s.hydrate);
  const sims = useSimPreferenceStore((s) => s.sims);
  const setPreferredSlot = useSimPreferenceStore((s) => s.setPreferredSlot);
  const canLogRecording = useHasPermission("call.recording.log");
  const recordingSupported = canUseAndroidCallRecording();
  const optimisticStageUpdate = useOptimisticLeadStageUpdate();
  const { assignees } = useLeadAssignees();
  const { items: queueItems } = useLeadQueueItems(Boolean(campaignId));

  const { data, isLoading, isError, error, refetch, nextLeadId } = useWorkspaceLead(
    leadId,
    campaignId,
  );
  const [calling, setCalling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [recordCall, setRecordCall] = useState(true);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const verifyCancelRef = useRef({ cancelled: false });
  const [pendingDial, setPendingDial] = useState<{
    phone: string;
    dialOpenedAtMs: number;
  } | null>(null);

  const recordingsQuery = useQuery({
    queryKey: ["lead-recordings", leadId],
    queryFn: () => listLeadCallRecordings(leadId),
    enabled: Boolean(leadId),
  });

  const assigneeName = useMemo(() => {
    const assigneeId =
      queueItems.find((lead) => lead.id === leadId)?.currentAssigneeUserId ?? userId ?? null;
    if (!assigneeId) return null;
    if (assigneeId === userId && sessionName) return sessionName;
    return assignees.find((user) => user.id === assigneeId)?.fullName ?? "Assigned";
  }, [assignees, leadId, queueItems, sessionName, userId]);

  const priority = useMemo(() => {
    if (!data?.fieldValues) return null;
    const entries = Object.entries(data.fieldValues).map(([internalKey, displayValue]) => ({
      internalKey,
      displayValue: displayValue ?? null,
    }));
    return extractPriority(entries);
  }, [data?.fieldValues]);

  useEffect(() => {
    void hydrateSims();
  }, [hydrateSims]);

  const openDisposition = (params: {
    callAttemptId: string | null;
    callStartedAtMs: number;
    verifiedDurationSeconds: number;
    dialElapsedSeconds: number;
    callLogVerified: boolean;
    recordingCaptured?: boolean;
    recordingLogged?: boolean;
    recordingError?: string | null;
  }) => {
    navigation.replace("PostCall", {
      leadId,
      campaignId,
      callAttemptId: params.callAttemptId,
      nextLeadId,
      callStartedAtMs: params.callStartedAtMs,
      verifiedDurationSeconds: params.verifiedDurationSeconds,
      dialElapsedSeconds: params.dialElapsedSeconds,
      callLogVerified: params.callLogVerified,
      recordingCaptured: params.recordingCaptured,
      recordingLogged: params.recordingLogged,
      recordingError: params.recordingError,
    });
  };

  /** Web parity: set lead stage to Ringing only after a real dial is verified. */
  const applyRingingOnCall = async () => {
    if (!data) return;
    try {
      let catalog = await fetchCallerCatalog(data.currentStageId).catch(() => null);
      if (!catalog?.stages?.length) {
        catalog = await fetchLeadCatalog();
      }
      const ringing = findRingingStage(catalog.stages);
      if (!ringing || ringing.id === data.currentStageId) return;
      await changeLeadStage(data.id, { stageId: ringing.id });
      optimisticStageUpdate(data.id, {
        currentStageId: ringing.id,
        currentStageName: ringing.name,
        currentStageBucket: String(ringing.bucket) as "INITIAL" | "ACTIVE" | "CLOSED",
      });
      void queryClient.invalidateQueries({
        queryKey: leadKeys.detail(data.id, campaignId),
      });
    } catch {
      // Non-blocking — disposition screen still defaults to Ringing.
    }
  };

  const finishVerifiedCall = async (phone: string, dialOpenedAtMs: number) => {
    verifyCancelRef.current = { cancelled: false };
    setVerifying(true);
    setCallError(null);
    let recordingCaptured = false;
    let recordingLogged = false;
    let recordingError: string | null = null;
    try {
      const match = await waitForVerifiedOutboundCall(phone, dialOpenedAtMs, {
        signal: verifyCancelRef.current,
      });
      if (verifyCancelRef.current.cancelled) {
        await tryDisarmCallRecording();
        setCallError("Verification cancelled. No call was logged.");
        return;
      }
      if (!match) {
        await tryDisarmCallRecording();
        setCallError(
          "No outbound call found in the phone call log. Opening the dial pad without tapping Call does not log anything.",
        );
        return;
      }

      // Let MediaRecorder finish after the call ends before we read the file.
      await waitForRecordingSettled({
        signal: verifyCancelRef.current,
        timeoutMs: 20_000,
      });

      const recordingSnap = await tryDisarmCallRecording();
      if (recordingSnap?.storageReference) {
        recordingCaptured = true;
      } else if (recordingSnap?.error) {
        recordingError = recordingSnap.error;
      } else if (recordCall) {
        recordingError =
          "No recording file was captured on this phone. Some devices block call audio.";
      }

      let callAttemptId: string | null = null;
      if (data) {
        try {
          const attempt = await logCallAttempt({
            leadId: data.id,
            customerId: data.customerId,
            toPhoneNumber: data.phoneSnapshot ?? phone,
            agentUserId: userId,
          });
          callAttemptId = attempt.id;
        } catch (err) {
          if (!(err instanceof MudraxApiError)) throw err;
          recordingError =
            recordingError ?? (err.message || "Call was placed but CRM call logging failed.");
        }
        void applyRingingOnCall();
      }

      if (callAttemptId && recordingSnap?.storageReference) {
        if (!canLogRecording) {
          recordingError =
            recordingError ??
            "Recording saved on phone, but this account cannot log recordings to CRM.";
        } else {
          try {
            const logged = await logCallRecording(callAttemptId, recordingSnap);
            recordingLogged = !logged.storageReference.startsWith("android-local://");
            if (!recordingLogged) {
              recordingError =
                recordingError ??
                "Recording saved on this phone, but upload to CRM failed — web cannot play it yet.";
            }
            void queryClient.invalidateQueries({ queryKey: ["lead-recordings", leadId] });
          } catch (err) {
            recordingError =
              recordingError ??
              (err instanceof Error
                ? err.message
                : "Call was recorded on device but CRM logging failed.");
          }
        }
      }

      void queryClient.invalidateQueries({ queryKey: ["lead-queue"] });
      const dialElapsedSeconds = Math.max(
        0,
        Math.round((Date.now() - dialOpenedAtMs) / 1000),
      );
      openDisposition({
        callAttemptId,
        callStartedAtMs: match.startedAtMs,
        verifiedDurationSeconds: Math.max(0, match.durationSeconds),
        dialElapsedSeconds,
        callLogVerified: true,
        recordingCaptured,
        recordingLogged,
        recordingError,
      });
    } catch (err) {
      await tryDisarmCallRecording();
      setCallError(err instanceof Error ? err.message : "Could not verify the call.");
    } finally {
      setVerifying(false);
    }
  };

  // tel: fallback returns immediately — wait until app is foreground, then verify call log.
  useEffect(() => {
    if (!pendingDial) return;
    const run = () => {
      const { phone, dialOpenedAtMs } = pendingDial;
      setPendingDial(null);
      void finishVerifiedCall(phone, dialOpenedAtMs);
    };
    if (AppState.currentState === "active") {
      run();
      return;
    }
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when pendingDial is set
  }, [pendingDial]);

  const goToNextLead = (targetNextId: string | null | undefined) => {
    if (targetNextId) {
      navigation.replace("LeadDetails", { leadId: targetNextId, campaignId });
      return;
    }
    Alert.alert("No more leads available.", undefined, [
      { text: "OK", onPress: () => navigation.navigate("Main", { screen: "LeadQueue" }) },
    ]);
  };

  const onSkip = () => {
    Alert.alert(
      "Skip Lead?",
      "Do you want to skip this lead without taking any action?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Skip",
          style: "destructive",
          onPress: () => goToNextLead(nextLeadId),
        },
      ],
    );
  };

  const onCall = async () => {
    if (!data?.phoneSnapshot) {
      setCallError("This lead has no phone number.");
      return;
    }
    if (Platform.OS !== "android") {
      setCallError("Call verification is only supported on Android.");
      return;
    }
    if (!isCallLogVerificationAvailable()) {
      setCallError(
        "Call verification needs a development/production build (not Expo Go) so Mudrax can read the phone call log.",
      );
      return;
    }

    setCalling(true);
    setCallError(null);
    try {
      const permitted = await ensureCallLogPermission();
      if (!permitted) {
        setCallError(
          "Call log permission is required. Without it, opening the dial pad alone could be faked as a call.",
        );
        return;
      }

      // Best-effort Android recording — never blocks dialing if it fails.
      if (recordCall && recordingSupported) {
        await tryArmCallRecording(data.phoneSnapshot);
      }

      // Do NOT CRM-log yet — only after the device call log shows an outbound dial.
      const dialOpenedAtMs = Date.now() - 3000;
      const dialResult = await placeNativeCall(data.phoneSnapshot, preferredSlot);

      if (dialResult.mode === "intent") {
        await finishVerifiedCall(data.phoneSnapshot, dialOpenedAtMs);
      } else {
        setPendingDial({ phone: data.phoneSnapshot, dialOpenedAtMs });
      }
    } catch (err) {
      await tryDisarmCallRecording();
      setCallError(err instanceof Error ? err.message : "Could not start the call.");
    } finally {
      setCalling(false);
    }
  };

  if (isLoading && !data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <EmptyState
          title="Lead unavailable"
          description={error instanceof Error ? error.message : "Lead not found."}
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll onRefresh={() => void refetch()}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.onSurface }}>
          {data.fullNameSnapshot}
        </Text>
        <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
          {data.leadSourceName}
          {data.campaignName ? ` · ${data.campaignName}` : ""}
        </Text>
        <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <StatusBadge
            label={data.currentStageName}
            tone={stageTone(String(data.currentStageBucket))}
          />
          {priority ? <StatusBadge label={`Priority ${priority}`} tone="neutral" /> : null}
        </View>
      </View>

      <Section title="Customer details" colors={colors}>
        <MetaRow label="Phone" value={formatPhone(data.phoneSnapshot)} colors={colors} />
        <MetaRow label="Email" value={data.emailSnapshot ?? "—"} colors={colors} />
        <MetaRow
          label="Campaign"
          value={data.campaignName ?? "Assigned campaign"}
          colors={colors}
        />
        <MetaRow label="Assigned user" value={assigneeName ?? "—"} colors={colors} />
        <MetaRow label="Current status" value={data.currentStageName} colors={colors} />
      </Section>

      <Section title="Contact numbers" colors={colors}>
        <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "700" }}>
          {formatPhone(data.phoneSnapshot)}
        </Text>
        {data.fieldValues.phone_alt || data.fieldValues.alternate_phone ? (
          <Text style={{ color: colors.onSurface, marginTop: 8 }}>
            {formatPhone(data.fieldValues.phone_alt ?? data.fieldValues.alternate_phone)}
          </Text>
        ) : (
          <Text style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
            No alternate numbers on file.
          </Text>
        )}
      </Section>

      <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
        Outgoing SIM
      </Text>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
        Preferred SIM is sent to the phone dialer. Your phone may still ask you to confirm the
        SIM when placing the call.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {sims.map((sim) => {
          const selected = preferredSlot === sim.slotIndex;
          return (
            <Pressable
              key={sim.slotIndex}
              onPress={() => void setPreferredSlot(sim.slotIndex)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: selected ? colors.secondary : colors.primaryContainer,
              }}
            >
              <Text
                style={{
                  color: selected ? colors.onSecondary : colors.onPrimaryContainer,
                  fontWeight: "700",
                }}
              >
                {sim.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {recordingSupported ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 8 }}>
            Call recording
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 8 }}>
            Android only. Recording starts when you tap Call and stops when the call ends. Put the
            call on speakerphone so the mic can pick up voice — otherwise the file may be silent.
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Pressable
              onPress={() => setRecordCall(true)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: recordCall ? colors.secondary : colors.primaryContainer,
              }}
            >
              <Text
                style={{
                  color: recordCall ? colors.onSecondary : colors.onPrimaryContainer,
                  fontWeight: "700",
                }}
              >
                Record on
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setRecordCall(false)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: !recordCall ? colors.secondary : colors.primaryContainer,
              }}
            >
              <Text
                style={{
                  color: !recordCall ? colors.onSecondary : colors.onPrimaryContainer,
                  fontWeight: "700",
                }}
              >
                Record off
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {verifying ? (
        <View
          style={{
            backgroundColor: colors.surfaceVariant,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.outline,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 6 }}>
            Waiting for a real call…
          </Text>
          <Text style={{ color: colors.onSurfaceVariant, marginBottom: 12, fontSize: 13 }}>
            Place the call from the dialer and hang up when done. Mudrax only logs after your
            phone call log shows an outbound call to this number — opening the dial pad alone
            does not count.
          </Text>
          <AppButton
            label="Cancel"
            variant="secondary"
            onPress={() => {
              verifyCancelRef.current.cancelled = true;
              void tryDisarmCallRecording();
            }}
          />
        </View>
      ) : (
        <AppButton
          label={calling ? "Opening dialer…" : "Call"}
          variant="call"
          loading={calling}
          onPress={() => void onCall()}
          style={{ marginBottom: 10, minHeight: 64 }}
        />
      )}
      {callError ? (
        <Text style={{ color: colors.error, marginBottom: 12 }}>{callError}</Text>
      ) : null}

      <AppButton
        label="Skip for Now"
        variant="secondary"
        onPress={onSkip}
        style={{ marginBottom: 20, minHeight: 56 }}
      />

      <Section title="Call recordings" colors={colors}>
        <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginBottom: 10 }}>
          Audio stays on this phone. CRM only stores the file reference — play recordings here
          on the device that made the call.
        </Text>
        {recordingsQuery.isLoading ? (
          <Text style={{ color: colors.onSurfaceVariant }}>Loading recordings…</Text>
        ) : (recordingsQuery.data?.length ?? 0) === 0 ? (
          <Text style={{ color: colors.onSurfaceVariant }}>No recordings logged yet.</Text>
        ) : (
          recordingsQuery.data!.map((recording) => (
            <RecordingRow
              key={recording.id}
              recording={recording}
              colors={colors}
              playing={playingRecordingId === recording.id}
              onPlay={async () => {
                if (playingRecordingId === recording.id) {
                  await stopStoredCallRecordingPlayback();
                  setPlayingRecordingId(null);
                  return;
                }
                if (!canPlayLocalRecording(recording.storageReference)) {
                  Alert.alert(
                    "Recording not on this phone",
                    "This file was saved on another device (or cleared). Web CRM cannot play android-local recordings.",
                  );
                  return;
                }
                const result = await playStoredCallRecording(recording.storageReference);
                if (!result.ok) {
                  Alert.alert("Could not play", result.error ?? "Playback failed.");
                  setPlayingRecordingId(null);
                  return;
                }
                setPlayingRecordingId(recording.id);
              }}
            />
          ))
        )}
      </Section>

      <Section title="Notes" colors={colors}>
        {data.notes.length === 0 ? (
          <Text style={{ color: colors.onSurfaceVariant }}>No notes yet.</Text>
        ) : (
          data.notes.map((note) => (
            <View key={note.id} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.onSurface }}>{note.body}</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                {formatDateTime(note.createdAt)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Follow-ups" colors={colors}>
        {data.followUps.length === 0 ? (
          <Text style={{ color: colors.onSurfaceVariant }}>No follow-ups scheduled.</Text>
        ) : (
          data.followUps.map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.onSurface, fontWeight: "600" }}>
                {item.triggerType} · {item.status}
              </Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                {formatDateTime(item.scheduledFor)}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Timeline / lead history" colors={colors}>
        {data.timeline.length === 0 ? (
          <Text style={{ color: colors.onSurfaceVariant }}>No history yet.</Text>
        ) : (
          data.timeline.slice(0, 30).map((item) => (
            <View key={item.id} style={{ marginBottom: 10 }}>
              <Text style={{ color: colors.onSurface, fontWeight: "600" }}>{item.summary}</Text>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
                {formatDateTime(item.at)}
              </Text>
            </View>
          ))
        )}
      </Section>
    </Screen>
  );
}

function MetaRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { onSurface: string; onSurfaceVariant: string };
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.onSurface, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function RecordingRow({
  recording,
  colors,
  playing,
  onPlay,
}: {
  recording: CallRecording;
  colors: {
    onSurface: string;
    onSurfaceVariant: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondary: string;
    onSecondary: string;
  };
  playing: boolean;
  onPlay: () => void | Promise<void>;
}) {
  const local = canPlayLocalRecording(recording.storageReference);
  const fileName = recording.storageReference.replace(/^android-local:\/\/call-recordings\//, "");
  return (
    <View
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.primaryContainer,
      }}
    >
      <Text style={{ color: colors.onPrimaryContainer, fontWeight: "700" }}>
        {recording.durationSeconds != null
          ? formatCallDuration(recording.durationSeconds)
          : "Recording"}{" "}
        · {formatDateTime(recording.startedAt)}
      </Text>
      <Text
        style={{ color: colors.onPrimaryContainer, fontSize: 11, marginTop: 4, opacity: 0.8 }}
        numberOfLines={1}
      >
        {fileName}
      </Text>
      <Pressable
        onPress={() => void onPlay()}
        style={{
          marginTop: 10,
          alignSelf: "flex-start",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          backgroundColor: colors.secondary,
          opacity: local || playing ? 1 : 0.55,
        }}
      >
        <Text style={{ color: colors.onSecondary, fontWeight: "700", fontSize: 13 }}>
          {playing ? "Stop" : local ? "Play on this phone" : "Not on this phone"}
        </Text>
      </Pressable>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: ReactNode;
  colors: { onSurface: string; surfaceVariant: string; outline: string };
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surfaceVariant,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.outline,
        marginBottom: 14,
      }}
    >
      <Text style={{ fontWeight: "700", color: colors.onSurface, marginBottom: 10 }}>{title}</Text>
      {children}
    </View>
  );
}
