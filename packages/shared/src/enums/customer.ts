export const IDENTITY_CONFIDENCE_LEVELS = ["UNVERIFIED", "DECLARED", "VERIFIED"] as const;
export type IdentityConfidence = (typeof IDENTITY_CONFIDENCE_LEVELS)[number];

export const CUSTOMER_STATUSES = ["ACTIVE", "MERGED", "ARCHIVED"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const IDENTIFIER_TYPES = ["PAN", "AADHAAR", "PHONE", "EMAIL"] as const;
export type IdentifierType = (typeof IDENTIFIER_TYPES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];
