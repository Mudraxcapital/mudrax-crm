// ============================================================================
// src/infra/auth/index.ts
//
// Full Auth.js v5 configuration — Node runtime only (the Credentials
// provider's `authorize` calls into `auth`'s `authenticateUser` use-case,
// which reaches Postgres through Prisma). Used by the Route Handler
// (src/app/api/auth/[...nextauth]/route.ts), Server Components, and Server
// Actions. `src/middleware.ts` uses the lighter `./config` instead.
// ============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  authenticateUser,
  AccountLockedError,
  AccountNotActiveError,
  InvalidCredentialsError,
} from "@/modules/auth";
import { authConfig } from "./config";

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
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
            ipAddress: request.headers.get("x-forwarded-for"),
            userAgent: request.headers.get("user-agent"),
          });
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            fullName: user.fullName,
            organizationId: user.organizationId,
          };
        } catch (error) {
          if (
            error instanceof InvalidCredentialsError ||
            error instanceof AccountLockedError ||
            error instanceof AccountNotActiveError
          ) {
            // Never expose *why* (username enumeration / lockout oracle) —
            // Auth.js surfaces a generic "CredentialsSignin" error to the client.
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = user.organizationId;
        token.fullName = user.fullName;
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
      return session;
    },
  },
});
