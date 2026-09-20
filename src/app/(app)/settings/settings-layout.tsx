"use client";

import { useState } from "react";
import { cx } from "class-variance-authority";

interface SettingsSection {
  id: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export default function SettingsLayout({ sections }: { sections: SettingsSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  const current = sections.find((s) => s.id === active) ?? sections[0];

  return (
    <div className="flex gap-6">
      <nav className="sticky top-6 w-56 shrink-0 space-y-1 self-start rounded-xl border border-[var(--border)] bg-[var(--card)] p-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActive(section.id)}
            className={cx(
              "w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active === section.id
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            )}
          >
            {section.title}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
        {current && (
          <>
            <div>
              <h2 className="text-lg font-bold tracking-tight">{current.title}</h2>
              {current.subtitle && (
                <p className="mt-1 text-sm text-[var(--muted)]">{current.subtitle}</p>
              )}
            </div>
            {current.content}
          </>
        )}
      </div>
    </div>
  );
}
