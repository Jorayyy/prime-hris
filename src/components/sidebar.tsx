"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  CalendarDays,
  Wallet,
  Settings,
  ScrollText,
  UserRound,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Bell,
  HelpCircle,
  LogOut,
  Search,
} from "lucide-react";
import { cx, Avatar, Badge } from "@/components/ui";
import type { Role } from "@prisma/client";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: number;
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
      { href: "/employees", label: "Employees", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "HR", "MANAGER"] },
      { href: "/attendance", label: "Time & Attendance", icon: CalendarClock, roles: ["SUPER_ADMIN", "ADMIN", "HR", "PAYROLL", "MANAGER"] },
      { href: "/schedules", label: "Schedules", icon: CalendarDays, roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
      { href: "/leaves", label: "Leave Management", icon: CalendarDays },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/payroll", label: "Payroll", icon: Wallet, roles: ["SUPER_ADMIN", "ADMIN", "PAYROLL"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN", "ADMIN", "HR"] },
      { href: "/users", label: "User Accounts", icon: UserCog, roles: ["SUPER_ADMIN"] },
      { href: "/audit", label: "Audit Log", icon: ScrollText, roles: ["SUPER_ADMIN", "ADMIN"] },
    ],
  },
];

export default function Sidebar({ role, company }: { role: Role; company: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex h-full shrink-0 flex-col border-r border-border bg-white"
    >
      {/* Logo & Company */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-sm font-bold text-white shadow-md"
          >
            HR
          </motion.div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="truncate text-sm font-bold tracking-tight text-foreground"
              >
                {company}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Search Bar (when expanded) */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pt-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-light" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-lg bg-background pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-light focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const visible = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={group.section} className="mb-6">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-light"
                  >
                    {group.section}
                  </motion.p>
                )}
              </AnimatePresence>
              <ul className="space-y-1">
                {visible.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const isHovered = hoveredItem === item.href;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onMouseEnter={() => setHoveredItem(item.href)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={cx(
                          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted hover:bg-surface-hover hover:text-foreground"
                        )}
                      >
                        {/* Active indicator */}
                        {active && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}

                        <item.icon
                          className={cx(
                            "h-5 w-5 flex-shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted group-hover:text-foreground"
                          )}
                        />

                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              className="flex-1 truncate"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {/* Badge */}
                        {!collapsed && item.badge !== undefined && item.badge > 0 && (
                          <Badge variant="red" size="sm">
                            {item.badge}
                          </Badge>
                        )}

                        {/* Tooltip when collapsed */}
                        {collapsed && isHovered && (
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-white shadow-lg"
                          >
                            {item.label}
                          </motion.div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="border-t border-border p-3">
        <AnimatePresence>
          {!collapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
              <div className="flex-1" />
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                <Bell className="h-5 w-5" />
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                <HelpCircle className="h-5 w-5" />
              </button>
              <form action="/logout" method="post">
                <button
                  type="submit"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar name={role} size="md" status="online" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 overflow-hidden"
              >
                <p className="truncate text-sm font-semibold text-foreground">{role}</p>
                <p className="truncate text-xs text-muted">View Profile</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
