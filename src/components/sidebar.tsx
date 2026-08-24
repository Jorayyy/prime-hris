"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarDays,
  Wallet,
  Settings,
  ScrollText,
  UserRound,
} from "lucide-react";
import { cx } from "@/components/ui";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
};

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/me", label: "My Space", icon: UserRound },
    ],
  },
  {
    section: "People",
    items: [
      { href: "/employees", label: "Employees", icon: Users, roles: ["ADMIN", "HR", "MANAGER"] },
      { href: "/attendance", label: "Time & Attendance", icon: CalendarClock, roles: ["ADMIN", "HR", "PAYROLL", "MANAGER"] },
      { href: "/schedules", label: "Schedules", icon: CalendarDays, roles: ["ADMIN", "HR"] },
      { href: "/leaves", label: "Leave Management", icon: CalendarDays },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/payroll", label: "Payroll", icon: Wallet, roles: ["ADMIN", "PAYROLL"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "HR"] },
      { href: "/audit", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
    ],
  },
];

export default function Sidebar({ role, company }: { role: Role; company: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--border)] bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--border)] px-5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-bold text-white">
          HR
        </span>
        <span className="truncate text-sm font-bold tracking-tight">{company}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const visible = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={group.section} className="mb-5">
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cx(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition",
                          active
                            ? "bg-blue-50 font-semibold text-[var(--brand)]"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                        )}
                      >
                        <item.icon className={cx("h-4 w-4", active && "text-[var(--brand)]")} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">Signed in as</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">{role}</p>
      </div>
    </aside>
  );
}
