"use client";

import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  History,
  ListChecks,
  Network,
} from "lucide-react";

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
  activeView?: ConsoleView;
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
        {consoleViews.map((view) => {
          const Icon = view.icon;
          const isActive = activeView === view.key;
          const content = (
            <>
              <Icon aria-hidden="true" size={16} />
              {view.label}
            </>
          );

          if (usesTabs && onChange) {
            return (
              <button
                aria-current={isActive ? "page" : undefined}
                className="console-nav-item"
                data-active={isActive}
                key={view.key}
                onClick={() => onChange(view.key)}
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
      <Link className="back-to-site" href="/">
        <ArrowLeft aria-hidden="true" size={15} />
        Back to site
        <ArrowRight aria-hidden="true" size={15} />
      </Link>
      <small>© 2026 Tether Systems, Inc.</small>
    </aside>
  );
}
