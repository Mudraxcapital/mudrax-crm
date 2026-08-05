import type { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Campaigns: undefined;
  LeadQueue: { campaignId?: string } | undefined;
  Followups: undefined;
  Leaderboard: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ForceChangePassword: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  LeadDetails: { leadId: string; campaignId?: string };
  PostCall: {
    leadId: string;
    campaignId?: string;
    callAttemptId: string | null;
    nextLeadId?: string | null;
    /** Epoch ms from phone call log (preferred) or dialer open (fallback). */
    callStartedAtMs?: number;
    /**
     * Android CallLog.DURATION — connected talk time on modern devices
     * (0 when the remote never answered).
     */
    verifiedDurationSeconds?: number;
    /**
     * Wall-clock seconds from dialer open until call-log verification finished
     * (ringing + talk). Used to estimate ring time.
     */
    dialElapsedSeconds?: number;
    /** True when duration came from the device call log. */
    callLogVerified?: boolean;
    /** Android on-device recording was captured for this attempt. */
    recordingCaptured?: boolean;
    /** Recording metadata was logged to CRM (requires call.recording.log). */
    recordingLogged?: boolean;
    /** Native capture error / limitation message when capture failed. */
    recordingError?: string | null;
  };
};
