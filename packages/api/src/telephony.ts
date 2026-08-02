import type {
  CallAttempt,
  CallAttemptListResponse,
  CallAttemptResponse,
  CallRecording,
  CallRecordingResponse,
  CreateCallRecordingInput,
  InitiateCallInput,
  UpdateCallAttemptInput,
} from "@mudrax/types";
import type { AxiosInstance } from "axios";
import { normalizeAxiosError } from "./errors";

export interface ListCallsParams {
  leadId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}

export interface TelephonyApi {
  listCalls: (params?: ListCallsParams) => Promise<CallAttempt[]>;
  initiateCall: (input: InitiateCallInput) => Promise<CallAttempt>;
  updateCall: (id: string, input: UpdateCallAttemptInput) => Promise<CallAttempt>;
  listRecordings: (callAttemptId: string) => Promise<CallRecording[]>;
  createRecording: (
    callAttemptId: string,
    input: CreateCallRecordingInput,
  ) => Promise<CallRecording>;
  /** Upload on-device audio so Web CRM can play it (multipart field `audio`). */
  uploadRecordingAudio: (
    callAttemptId: string,
    recordingId: string,
    file: { uri: string; name: string; type: string },
  ) => Promise<CallRecording>;
}

export function createTelephonyApi(http: AxiosInstance): TelephonyApi {
  return {
    async listCalls(params = {}) {
      try {
        const { data } = await http.get<CallAttemptListResponse>("/api/telephony/calls", {
          params,
        });
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async initiateCall(input) {
      try {
        const { data } = await http.post<CallAttemptResponse>("/api/telephony/calls", input);
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async updateCall(id, input) {
      try {
        const { data } = await http.patch<CallAttemptResponse>(
          `/api/telephony/calls/${id}`,
          input,
        );
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async listRecordings(callAttemptId) {
      try {
        const { data } = await http.get<{ data: CallRecording[] }>(
          `/api/telephony/calls/${callAttemptId}/recordings`,
        );
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async createRecording(callAttemptId, input) {
      try {
        const { data } = await http.post<CallRecordingResponse>(
          `/api/telephony/calls/${callAttemptId}/recordings`,
          input,
        );
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },

    async uploadRecordingAudio(callAttemptId, recordingId, file) {
      try {
        const body = new FormData();
        // React Native FormData file shape.
        body.append("audio", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as unknown as Blob);
        const { data } = await http.post<CallRecordingResponse>(
          `/api/telephony/calls/${callAttemptId}/recordings/${recordingId}/audio`,
          body,
          {
            // Let the runtime set multipart boundary (required for RN uploads).
            headers: { "Content-Type": undefined as unknown as string },
            timeout: 120_000,
            maxBodyLength: 30 * 1024 * 1024,
            maxContentLength: 30 * 1024 * 1024,
          },
        );
        return data.data;
      } catch (error) {
        normalizeAxiosError(error);
      }
    },
  };
}
