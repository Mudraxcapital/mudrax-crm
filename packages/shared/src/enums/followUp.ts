export const FOLLOW_UP_TRIGGER_TYPES = ["FOLLOW_UP", "CALL_LATER"] as const;
export type FollowUpTriggerType = (typeof FOLLOW_UP_TRIGGER_TYPES)[number];

export const FOLLOW_UP_STATUSES = [
  "SCHEDULED",
  "DUE",
  "COMPLETED",
  "MISSED",
  "ESCALATED",
  "CANCELLED",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const OPEN_FOLLOW_UP_STATUSES: FollowUpStatus[] = [
  "SCHEDULED",
  "DUE",
  "MISSED",
  "ESCALATED",
];
