"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TabItem<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

export type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** underline: page navigation. segmented: a small inline choice. */
  variant?: "underline" | "segmented";
  /** Required when you render TabPanel: ties tabs to panels. */
  idPrefix?: string;
  "aria-label": string;
  className?: string;
};

export const tabId = (prefix: string, value: string) => `${prefix}-tab-${value}`;
export const panelId = (prefix: string, value: string) =>
  `${prefix}-panel-${value}`;

/**
 * WAI-ARIA tabs with automatic activation: arrow keys / Home / End move and
 * select. State lives in the parent; this renders buttons only.
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  variant = "underline",
  idPrefix = "tabs",
  className,
  ...rest
}: TabsProps<T>) {
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const enabled = items.filter((i) => !i.disabled);
    const index = enabled.findIndex((i) => i.value === value);
    if (index === -1) return;
    e.preventDefault();
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % enabled.length;
    if (e.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = enabled.length - 1;
    const target = enabled[next]!;
    onValueChange(target.value);
    document.getElementById(tabId(idPrefix, target.value))?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      onKeyDown={onKeyDown}
      className={cn(
        variant === "underline"
          ? "flex gap-6 overflow-x-auto border-b border-border [scrollbar-width:none]"
          : "inline-flex gap-0.5 rounded-md bg-muted p-0.5",
        className
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={tabId(idPrefix, item.value)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, item.value)}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "whitespace-nowrap text-sm font-medium transition-colors duration-150 ease-out disabled:opacity-50",
              variant === "underline"
                ? [
                    "relative h-11 text-muted-foreground hover:text-foreground aria-selected:text-foreground",
                    "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-200 after:ease-out aria-selected:after:scale-x-100",
                  ]
                : "h-8 rounded-[5px] px-3 text-muted-foreground hover:text-foreground aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-[0_0_0_1px_var(--border)]"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

/** Renders its children only while active. Pair with Tabs via the same idPrefix. */
export function TabPanel({
  idPrefix = "tabs",
  value,
  active,
  className,
  children,
}: {
  idPrefix?: string;
  value: string;
  active: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return (
    <div
      role="tabpanel"
      id={panelId(idPrefix, value)}
      aria-labelledby={tabId(idPrefix, value)}
      className={className}
    >
      {children}
    </div>
  );
}
