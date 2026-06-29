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

function PixelMark() {
  return (
    <span className="console-pixel-mark" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </span>
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
        <PixelMark />
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
        <Image
          alt=""
          height={816}
          priority
          src="/tether-assets/AstronautOnMiniMoonNoEffects.png"
          width={1448}
        />
      </div>
    </aside>
  );
}
