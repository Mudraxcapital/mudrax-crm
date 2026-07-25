import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Geist, Geist_Mono } from "next/font/google";
import { PATHNAME_HEADER, isCallerAllowedPath } from "@/infra/auth/callerAccess";
import { getCurrentUser } from "@/infra/auth/session";
import { isCallerWorkspaceUser, isInternalStaff } from "@/modules/rbac";
import { ThemeProvider } from "@/shared/ui/ThemeProvider";
import { ToastProvider } from "@/shared/ui/Toast";
import { AppShell } from "./_components/AppShell";
import { CommandPalette } from "./_components/CommandPalette";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mudrax CRM",
    template: "%s · Mudrax CRM",
  },
  description: "Mudrax CRM — Enterprise CRM for Mudrax Capitals",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const current = await getCurrentUser();
  const staff = current ? isInternalStaff(current.authContext) : false;
  const callerWorkspace = current ? isCallerWorkspaceUser(current.authContext) : false;
  const permissions = current ? Object.keys(current.authContext.permissions) : [];

  const headerStore = await headers();
  const pathname = headerStore.get(PATHNAME_HEADER) ?? "/";

  if (
    current?.session.user.mustChangePassword &&
    !pathname.startsWith("/change-password") &&
    !pathname.startsWith("/api/auth") &&
    !pathname.startsWith("/login")
  ) {
    redirect("/change-password");
  }

  if (current && callerWorkspace) {
    if (!isCallerAllowedPath(pathname)) {
      redirect("/unauthorized");
    }
  }

  const user = current
    ? {
        fullName: current.session.user.fullName,
        email: current.session.user.email ?? "",
        roles: current.authContext.roles.map((role) => role.name),
        permissions,
        isStaff: staff,
        isCallerWorkspace: callerWorkspace,
        loginAt: current.session.user.loginAt,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mudrax-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          <ToastProvider>
            <AppShell user={user}>{children}</AppShell>
            <CommandPalette
              enabled={staff}
              permissions={permissions}
              callerWorkspace={callerWorkspace}
            />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
