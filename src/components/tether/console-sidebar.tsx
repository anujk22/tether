"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BookOpen,
  History,
  Home,
  ListChecks,
  Network,
} from "lucide-react";

type SidebarNavKey = "home" | ConsoleView;

export type ConsoleView =
  | "cockpit"
  | "ledger"
  | "audit"
  | "policies"
  | "infrastructure";

export const consoleViews: Array<{
  key: ConsoleView;
  label: string;
  icon: LucideIcon;
  href: string;
}> = [
  { key: "cockpit", label: "Action Cockpit", icon: Activity, href: "/console" },
  { key: "ledger", label: "Ledger", icon: History, href: "/console?view=ledger" },
  {
    key: "audit",
    label: "Audit Trail",
    icon: ListChecks,
    href: "/console?view=audit",
  },
  {
    key: "policies",
    label: "Policies",
    icon: BookOpen,
    href: "/console?view=policies",
  },
  {
    key: "infrastructure",
    label: "Aurora DSQL",
    icon: Network,
    href: "/console?view=infrastructure",
  },
];

const sidebarViews: Array<{
  key: SidebarNavKey;
  label: string;
  icon: LucideIcon;
  href: string;
}> = [
  { key: "home", label: "Home", icon: Home, href: "/" },
  ...consoleViews,
];

function TetherLogoIcon() {
  return (
    <svg
      className="tether-logo-icon"
      viewBox="0 0 100 80"
      aria-hidden="true"
    >
      <path d="M 48 80 L 48 16 C 48 6, 42 0, 32 0 L 10 0 C 2 0, 2 18, 10 18 L 26 18 C 36 18, 40 22, 40 32 L 40 70 L 48 80 Z" fill="currentColor" />
      <path d="M 52 80 L 52 16 C 52 6, 58 0, 68 0 L 90 0 C 98 0, 98 18, 90 18 L 74 18 C 64 18, 60 22, 60 32 L 60 70 L 52 80 Z" fill="currentColor" />
    </svg>
  );
}

export function ConsoleSidebar({
  activeView = "cockpit",
  mode,
  onChange,
}: {
  activeView?: SidebarNavKey;
  mode?: "tabs" | "links";
  onChange?: (view: ConsoleView) => void;
}) {
  const usesTabs = mode === "tabs" || Boolean(onChange);

  return (
    <aside className="console-sidebar" aria-label="Tether control plane navigation">
      <div className="sidebar-brand">
        <TetherLogoIcon />
        <strong>Tether</strong>
        <span>Control plane</span>
      </div>
      <nav>
        {sidebarViews.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.key;
          const content = (
            <>
              <Icon aria-hidden="true" size={16} />
              {view.label}
            </>
          );

          if (usesTabs && onChange && view.key !== "home") {
            const consoleView = view.key as ConsoleView;

            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className="console-nav-item"
                data-active={isActive}
                key={view.key}
                onClick={() => onChange(consoleView)}
                type="button"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className="console-nav-item"
              data-active={isActive}
              href={view.href}
              key={view.key}
            >
              {content}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-art" aria-hidden="true">
        <Link
          className="sidebar-art-link"
          href="/console?demo=guided&key=tetherdemo2026"
          title="Launch Guided Demo"
        >
          <Image
            alt="Launch Guided Demo"
            height={816}
            priority
            src="/tether-assets/AstronautOnMiniMoonNoEffects.png"
            width={1448}
          />
        </Link>
      </div>
    </aside>
  );
}
