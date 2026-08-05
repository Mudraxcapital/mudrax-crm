// ============================================================================
// Admin login brute-force protection (Redis-backed, non-suspending).
//
// Complements the global login rate limiter. Admins are not account-suspended
// on failed passwords (single-Admin recovery), so this layer applies:
//   1. A stricter per-email rate window for Admin addresses
//   2. A temporary cooldown after configurable consecutive failures
// Cooldown auto-expires — no second Admin needed to unlock.
// ============================================================================

import { checkRateLimit } from "@/infra/redis/rateLimit";
import { getRedis } from "@/infra/redis/client";
import { getPrimaryRoleName } from "@/modules/rbac";
import { getUserAuthProfileByEmail } from "@/modules/users";

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface AdminLoginProtectionConfig {
  /** Max Admin login posts per window (stricter than generic login RL). */
  rateLimit: number;
  rateWindowSeconds: number;
  /** Consecutive failures before temporary cooldown. */
  failThreshold: number;
  /** Cooldown duration in seconds (auto-expires). */
  cooldownSeconds: number;
}

export function getAdminLoginProtectionConfig(): AdminLoginProtectionConfig {
  return {
    rateLimit: envInt("ADMIN_LOGIN_RATE_LIMIT", 5),
    rateWindowSeconds: envInt("ADMIN_LOGIN_RATE_WINDOW_SECONDS", 60),
    failThreshold: envInt("ADMIN_LOGIN_FAIL_THRESHOLD", 10),
    cooldownSeconds: envInt("ADMIN_LOGIN_COOLDOWN_SECONDS", 900),
  };
}

function failKey(email: string): string {
  return `admin-login:fails:${email}`;
}

function lockKey(email: string): string {
  return `admin-login:lock:${email}`;
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const profile = await getUserAuthProfileByEmail(email);
  if (!profile) return false;
  const role = await getPrimaryRoleName(profile.id);
  return role === "Admin";
}

/**
 * Pre-auth checks for Admin addresses. Returns a user-facing error when blocked.
 * Non-Admin emails / unknown emails pass through (generic limiter still applies).
 */
export async function assertAdminLoginAllowed(
  email: string,
): Promise<{ blocked: true; error: string } | { blocked: false; isAdmin: boolean }> {
  const normalized = email.trim().toLowerCase();
  const isAdmin = await isAdminEmail(normalized);
  if (!isAdmin) {
    return { blocked: false, isAdmin: false };
  }

  const config = getAdminLoginProtectionConfig();
  const redis = await getRedis();

  if (redis) {
    const lockedFor = await redis.ttl(lockKey(normalized));
    if (lockedFor > 0) {
      const minutes = Math.max(1, Math.ceil(lockedFor / 60));
      return {
        blocked: true,
        error: `Too many failed Admin sign-in attempts. Try again in about ${minutes} minute(s).`,
      };
    }
  }

  const rate = await checkRateLimit({
    key: `login-admin:${normalized}`,
    limit: config.rateLimit,
    windowSeconds: config.rateWindowSeconds,
  });
  if (!rate.allowed) {
    return {
      blocked: true,
      error: "Too many Admin login attempts. Please wait a minute and try again.",
    };
  }

  return { blocked: false, isAdmin: true };
}

/** Record a failed Admin password attempt; may start a temporary cooldown. */
export async function recordAdminLoginFailure(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const isAdmin = await isAdminEmail(normalized);
  if (!isAdmin) return;

  const config = getAdminLoginProtectionConfig();
  const redis = await getRedis();
  if (!redis) return;

  const fails = await redis.incr(failKey(normalized));
  if (fails === 1) {
    await redis.expire(failKey(normalized), config.cooldownSeconds);
  }

  if (fails >= config.failThreshold) {
    await redis.set(lockKey(normalized), "1", { EX: config.cooldownSeconds });
    await redis.del(failKey(normalized));
  }
}

/** Clear Admin failure counters after a successful sign-in. */
export async function clearAdminLoginFailures(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const redis = await getRedis();
  if (!redis) return;
  await redis.del(failKey(normalized));
  await redis.del(lockKey(normalized));
}
