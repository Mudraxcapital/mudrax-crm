// ============================================================================
// Enterprise password policy — shared by create, self-change, and Admin reset.
// Forgot-password / email OTP / SSO are intentionally out of scope; this policy
// stays additive so those can plug in later without changing call sites.
// ============================================================================

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
} as const;

export const PASSWORD_POLICY_HINT =
  "At least 8 characters, including uppercase, lowercase, and a number.";

/** Returns null when valid, otherwise a user-facing error message. */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < PASSWORD_POLICY.minLength) {
    return `Password must be at least ${PASSWORD_POLICY.minLength} characters.`;
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    return `Password must be at most ${PASSWORD_POLICY.maxLength} characters.`;
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (PASSWORD_POLICY.requireDigit && !/\d/.test(password)) {
    return "Password must include at least one number.";
  }
  return null;
}
