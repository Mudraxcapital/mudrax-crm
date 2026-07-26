// ============================================================================
// src/infra/auth/index.ts
// ============================================================================

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authenticateUser,
  AccountNotActiveError,
  InvalidCredentialsError,
} from "@/modules/auth";
import { authConfig } from "./config";
import { clientIpFromForwarded } from "./clientIp";

/** Surfaced to loginAction — credentials were valid but account is not Active. */
class AccountDisabledSignIn extends CredentialsSignin {
  code = "account_disabled";
}

class AccountSuspendedSignIn extends CredentialsSignin {
  code = "account_suspended";
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials, request) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) {
          return null;
        }

        try {
          const user = await authenticateUser({
            email,
            password,
            ipAddress: clientIpFromForwarded(request.headers.get("x-forwarded-for")),
            userAgent: request.headers.get("user-agent"),
          });
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            fullName: user.fullName,
            organizationId: user.organizationId,
            sessionVersion: user.sessionVersion,
            sessionId: user.sessionId,
            mustChangePassword: user.mustChangePassword,
          };
        } catch (error) {
          if (error instanceof AccountNotActiveError) {
            throw error.status === "SUSPENDED"
              ? new AccountSuspendedSignIn()
              : new AccountDisabledSignIn();
          }
          if (error instanceof InvalidCredentialsError) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = user.organizationId;
        token.fullName = user.fullName;
        token.sessionVersion =
          typeof user.sessionVersion === "number" ? user.sessionVersion : 0;
        token.sessionId = user.sessionId;
        token.mustChangePassword = !!user.mustChangePassword;
        token.loginAt = new Date().toISOString();
      }
      if (trigger === "update" && session && typeof session === "object") {
        const patch = session as { mustChangePassword?: boolean; sessionVersion?: number };
        if (typeof patch.mustChangePassword === "boolean") {
          token.mustChangePassword = patch.mustChangePassword;
        }
        if (typeof patch.sessionVersion === "number") {
          token.sessionVersion = patch.sessionVersion;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId;
      }
      if (token.organizationId) {
        session.user.organizationId = token.organizationId;
      }
      if (token.fullName) {
        session.user.fullName = token.fullName;
      }
      session.user.sessionVersion =
        typeof token.sessionVersion === "number" ? token.sessionVersion : 0;
      session.user.sessionId = typeof token.sessionId === "string" ? token.sessionId : "";
      session.user.mustChangePassword = !!token.mustChangePassword;
      session.user.loginAt = token.loginAt ?? new Date().toISOString();
      return session;
    },
  },
  events: {
    async signOut(message) {
      const token = "token" in message ? message.token : null;
      const sessionId = token && typeof token.sessionId === "string" ? token.sessionId : null;
      if (sessionId) {
        const { endLoginSession } = await import("@/modules/users");
        await endLoginSession(sessionId, "LOGOUT").catch(() => undefined);
      }
    },
  },
});
