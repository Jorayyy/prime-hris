"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Command,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
  X,
  ChevronRight,
  Clock,
  CalendarDays,
  Wallet,
  Users,
  CalendarClock,
  Settings,
  ScrollText,
  LogIn,
  UserRound,
} from "lucide-react";
import { cx, Avatar } from "@/components/ui";
import { logoutAction } from "@/lib/actions/auth";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  href: string;
  read: boolean;
};

interface HeaderProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role: string;
  };
  company: string;
  notifications: Notification[];
}

const helpSections = [
  {
    icon: UserRound,
    title: "My Space",
    href: "/me",
    color: "text-primary",
    bg: "bg-primary/10",
    description: "View your personal profile, employment details, and personal information.",
    steps: ["Click 'My Space' in the sidebar", "View your employee profile", "Check your employment details and documents"],
  },
  {
    icon: Clock,
    title: "Time & Attendance",
    href: "/attendance",
    color: "text-info-dark",
    bg: "bg-info/10",
    description: "Track your daily attendance, clock in/out, and view your work hours.",
    steps: ["Go to Time & Attendance from the sidebar", "View your daily time logs", "Check your worked hours and late minutes"],
  },
  {
    icon: CalendarDays,
    title: "Schedules",
    href: "/schedules",
    color: "text-secondary-dark",
    bg: "bg-secondary/10",
    description: "See your assigned shifts and work schedule for the week.",
    steps: ["Open Schedules from the sidebar", "View your shift assignments", "Check which days you're on duty"],
  },
  {
    icon: CalendarClock,
    title: "Leave Management",
    href: "/leaves",
    color: "text-warning-dark",
    bg: "bg-warning/10",
    description: "Request time off, check your leave balances, and track leave status.",
    steps: ["Navigate to Leave Management", "Click 'Request Leave' to file a new request", "Check your leave balances on the dashboard"],
  },
  {
    icon: Wallet,
    title: "Payroll",
    href: "/payroll",
    color: "text-success-dark",
    bg: "bg-success/10",
    description: "View your payslips, pay history, and salary breakdown.",
    steps: ["Open Payroll from the sidebar", "Click a pay period to view details", "Download or view your payslip breakdown"],
  },
  {
    icon: Users,
    title: "Employees",
    href: "/employees",
    color: "text-primary",
    bg: "bg-primary/10",
    description: "Manage employee records, onboard new hires, and view the team directory.",
    adminOnly: true,
    steps: ["Go to Employees from the sidebar", "Click a name to view their full 201 record", "Use 'Add Employee' to onboard new hires"],
  },
  {
    icon: Settings,
    title: "Settings",
    href: "/settings",
    color: "text-muted",
    bg: "bg-muted-light/20",
    description: "Configure company profile, org structure, shift templates, and payroll settings.",
    adminOnly: true,
    steps: ["Open Settings from the sidebar", "Update company info, org units, and payroll config", "Manage shift templates and holiday declarations"],
  },
];

const HR_ROLES = ["SUPER_ADMIN", "ADMIN", "HR"];

export default function Header({ user, company, notifications }: HeaderProps) {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [helpStep, setHelpStep] = useState<number | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
        setHelpStep(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); }
      if (e.key === "Escape") { setShowSearch(false); setShowNotifications(false); setShowUserMenu(false); setShowHelp(false); setHelpStep(null); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const visibleHelp = helpSections.filter((s) => !s.adminOnly || HR_ROLES.includes(user.role));

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-foreground">{company}</p>
          <p className="text-xs text-muted">HR Information System</p>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-4">
        <button
          onClick={() => setShowSearch(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-muted hover:border-primary-light hover:bg-white transition-all"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search employees, pages...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-white px-2 py-0.5 text-[10px] font-medium text-muted">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); setShowHelp(false); setHelpStep(null); }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-white shadow-xl z-50"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                  <button className="text-xs font-medium text-primary hover:text-primary-dark">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => setShowNotifications(false)}
                        className={cx("flex gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer", !n.read && "bg-primary/5")}
                      >
                        <div className={cx("h-2 w-2 mt-1.5 rounded-full flex-shrink-0", n.read ? "bg-muted-light" : "bg-primary")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          <p className="text-xs text-muted truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-light mt-1">{n.time}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Help Guide */}
        <div className="relative" ref={helpRef}>
          <button
            onClick={() => { setShowHelp(!showHelp); setShowNotifications(false); setShowUserMenu(false); setHelpStep(null); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors"
            title="Help & Support"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-96 rounded-xl border border-border bg-white shadow-xl z-50 overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {helpStep === null ? (
                    <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                      <div className="border-b border-border px-4 py-3">
                        <h3 className="text-sm font-bold text-foreground">Help Guide</h3>
                        <p className="text-xs text-muted mt-0.5">Select a feature to learn how it works</p>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {visibleHelp.map((section, i) => (
                          <motion.button
                            key={section.title}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setHelpStep(i)}
                            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors text-left group"
                          >
                            <div className={cx("flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0", section.bg)}>
                              <section.icon className={cx("h-4 w-4", section.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary">{section.title}</p>
                              <p className="text-xs text-muted truncate">{section.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-light group-hover:text-primary transition-colors" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="detail" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
                      {(() => {
                        const section = visibleHelp[helpStep!];
                        return (
                          <>
                            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                              <button onClick={() => setHelpStep(null)} className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-hover transition-colors">
                                <ChevronRight className="h-4 w-4 text-muted rotate-180" />
                              </button>
                              <div className={cx("flex h-8 w-8 items-center justify-center rounded-lg", section.bg)}>
                                <section.icon className={cx("h-4 w-4", section.color)} />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                                <p className="text-xs text-muted">{section.description}</p>
                              </div>
                            </div>
                            <div className="px-4 py-4">
                              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">How to use</p>
                              <div className="space-y-3">
                                {section.steps.map((step, si) => (
                                  <motion.div
                                    key={si}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: si * 0.1 }}
                                    className="flex gap-3"
                                  >
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary flex-shrink-0 mt-0.5">
                                      {si + 1}
                                    </span>
                                    <p className="text-sm text-foreground">{step}</p>
                                  </motion.div>
                                ))}
                              </div>
                              <Link
                                href={section.href}
                                onClick={() => { setShowHelp(false); setHelpStep(null); }}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                Go to {section.title}
                              </Link>
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-2 h-8 w-px bg-border" />

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); setShowHelp(false); setHelpStep(null); }}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-hover transition-colors"
          >
            <Avatar name={fullName} size="md" status="online" />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
              <p className="text-xs text-muted">{user.role.replace(/_/g, " ")}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-white shadow-xl z-50"
              >
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{fullName}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </div>
                <div className="py-2">
                  <Link href="/me" onClick={() => setShowUserMenu(false)} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                    <User className="h-4 w-4" /> My Profile
                  </Link>
                  {HR_ROLES.includes(user.role) && (
                    <button onClick={() => { setShowUserMenu(false); router.push("/settings"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                      <Settings className="h-4 w-4" /> Settings
                    </button>
                  )}
                </div>
                <div className="border-t border-border py-2">
                  <form action={logoutAction}>
                    <button type="submit" className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
            <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={() => setShowSearch(false)} />
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.2 }} className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center gap-4 border-b border-border px-6 py-4">
                <Search className="h-5 w-5 text-muted" />
                <input type="text" placeholder="Search employees, pages, actions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-lg text-foreground placeholder-muted-light focus:outline-none" autoFocus />
                <kbd className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted">ESC</kbd>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Quick Actions</p>
                <div className="space-y-2">
                  {[
                    { label: "Add New Employee", href: "/employees/new" },
                    { label: "Process Payroll", href: "/payroll" },
                    { label: "View Attendance", href: "/attendance" },
                    { label: "Settings", href: "/settings" },
                  ].map((action) => (
                    <Link key={action.href} href={action.href} onClick={() => setShowSearch(false)} className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm text-foreground hover:bg-surface-hover transition-colors">
                      <span>{action.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
