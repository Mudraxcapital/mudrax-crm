import type { ReactNode } from "react";
import type { NavIcon } from "./nav";

const paths: Record<NavIcon, ReactNode> = {
  home: (
    <>
      <path d="M2.5 7.5L8 2.5l5.5 5V13a.5.5 0 01-.5.5H10V10H6v3.5H3a.5.5 0 01-.5-.5V7.5z" />
    </>
  ),
  crm: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </>
  ),
  customers: (
    <>
      <circle cx="6" cy="5.5" r="2" />
      <path d="M2.5 13c0-2 1.8-3.5 3.5-3.5S9.5 11 9.5 13" />
      <circle cx="11" cy="6" r="1.5" />
      <path d="M10 13c.2-1.4 1.3-2.5 2.8-2.5.4 0 .8.1 1.2.2" />
    </>
  ),
  leads: (
    <>
      <path d="M3 12.5V4.5A1.5 1.5 0 014.5 3h5L13 6.5v6A1.5 1.5 0 0111.5 14h-7A1.5 1.5 0 013 12.5z" />
      <path d="M9 3v3.5H13" />
    </>
  ),
  pipeline: (
    <>
      <rect x="2.5" y="3" width="3" height="10" rx="1" />
      <rect x="6.5" y="5" width="3" height="8" rx="1" />
      <rect x="10.5" y="7" width="3" height="6" rx="1" />
    </>
  ),
  followups: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </>
  ),
  calendar: (
    <>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 7h11M5.5 2.5v2M10.5 2.5v2" />
    </>
  ),
  activity: (
    <>
      <path d="M2.5 8h2.5l1.5-4 2.5 8 1.5-4H13.5" />
    </>
  ),
  campaigns: (
    <>
      <path d="M3 4.5l10 3.5L3 11.5V4.5z" />
      <path d="M7.5 8v4.5l2-1.2" />
    </>
  ),
  telephony: (
    <>
      <path d="M4.5 2.5h2l1 3-1.5 1.2a8 8 0 004.3 4.3L11.5 9.5l3 1v2a1.5 1.5 0 01-1.5 1.5A10.5 10.5 0 013 4A1.5 1.5 0 014.5 2.5z" />
    </>
  ),
  documents: (
    <>
      <path d="M4 2.5h5.5L13 6v7.5A1.5 1.5 0 0111.5 15h-7A1.5 1.5 0 013 13.5v-9A2 2 0 014 2.5z" />
      <path d="M9.5 2.5V6H13" />
    </>
  ),
  notifications: (
    <>
      <path d="M4 6.5a4 4 0 018 0c0 3.2 1.2 4 1.2 4H2.8S4 9.7 4 6.5z" />
      <path d="M6.8 13a1.2 1.2 0 002.4 0" />
    </>
  ),
  reports: (
    <>
      <path d="M3 13V8.5M7 13V3.5M11 13V6.5M13.5 13.5H2.5" />
    </>
  ),
  loans: (
    <>
      <rect x="2.5" y="4" width="11" height="8" rx="1.5" />
      <path d="M2.5 7h11M5.5 10h2" />
    </>
  ),
  org: (
    <>
      <path d="M3 13.5V5l5-2.5 5 2.5v8.5" />
      <path d="M6.5 13.5v-3h3v3" />
    </>
  ),
  settings: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 2.5v1.5M8 12v1.5M2.5 8H4M12 8h1.5M4 4l1 1M11 11l1 1M4 12l1-1M11 5l1-1" />
    </>
  ),
  admin: (
    <>
      <path d="M8 2.5l5.5 2.5v3.8c0 3.2-2.3 5.5-5.5 6.7-3.2-1.2-5.5-3.5-5.5-6.7V5L8 2.5z" />
    </>
  ),
  profile: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13.5c0-2.5 2.2-4 5-4s5 1.5 5 4" />
    </>
  ),
  history: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.5l2.5 1.5" />
    </>
  ),
  performance: (
    <>
      <path d="M2.5 12.5l3-4 2.5 2.5 5-6.5" />
      <path d="M10.5 4.5H13.5V7.5" />
    </>
  ),
};

export function NavIconSvg({ name, className }: { name: NavIcon; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}
