"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Settings,
  Moon,
  Sun,
  Command,
  ChevronDown,
  LogOut,
  User,
  HelpCircle,
} from "lucide-react";
import { cx, Avatar, Badge, Button } from "@/components/ui";
import { logoutAction } from "@/lib/actions/auth";

interface HeaderProps {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role: string;
  };
  company: string;
}

export default function Header({ user, company }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  // Mock notifications
  const notifications = [
    { id: 1, title: "Leave request approved", message: "Your VL request for Aug 30 has been approved", time: "5 min ago", read: false },
    { id: 2, title: "New announcement", message: "Company holiday on September 1", time: "1 hour ago", read: false },
    { id: 3, title: "Payroll processed", message: "Your payslip is ready for download", time: "2 hours ago", read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      {/* Left: Breadcrumb / Page Info */}
      <div className="flex items-center gap-4">
        <div className="hidden lg:block">
          <p className="text-sm font-medium text-foreground">{company}</p>
          <p className="text-xs text-muted">HR Information System</p>
        </div>
      </div>

      {/* Center: Search */}
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

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
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
                  <button className="text-xs font-medium text-primary hover:text-primary-dark">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cx(
                        "flex gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      <div className={cx(
                        "h-2 w-2 mt-1.5 rounded-full flex-shrink-0",
                        notification.read ? "bg-muted-light" : "bg-primary"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                        <p className="text-xs text-muted truncate">{notification.message}</p>
                        <p className="text-[10px] text-muted-light mt-1">{notification.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border px-4 py-2">
                  <button className="w-full text-center text-xs font-medium text-primary hover:text-primary-dark">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Settings */}
        <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </button>

        {/* Help */}
        <button className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
          <HelpCircle className="h-5 w-5" />
        </button>

        {/* Divider */}
        <div className="mx-2 h-8 w-px bg-border" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
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
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                    <User className="h-4 w-4" />
                    My Profile
                  </button>
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                    <Settings className="h-4 w-4" />
                    Account Settings
                  </button>
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                    Help & Support
                  </button>
                </div>
                <div className="border-t border-border py-2">
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          >
            <div
              className="absolute inset-0 bg-foreground/50 backdrop-blur-sm"
              onClick={() => setShowSearch(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center gap-4 border-b border-border px-6 py-4">
                <Search className="h-5 w-5 text-muted" />
                <input
                  type="text"
                  placeholder="Search employees, pages, actions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-lg text-foreground placeholder-muted-light focus:outline-none"
                  autoFocus
                />
                <kbd className="rounded-md border border-border px-2 py-1 text-xs font-medium text-muted">
                  ESC
                </kbd>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Quick Actions</p>
                <div className="space-y-2">
                  {[
                    { label: "Add New Employee", shortcut: "⌘ + N" },
                    { label: "Process Payroll", shortcut: "⌘ + P" },
                    { label: "View Attendance", shortcut: "⌘ + A" },
                  ].map((action) => (
                    <button
                      key={action.label}
                      className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <span>{action.label}</span>
                      <kbd className="rounded border border-border px-2 py-0.5 text-xs text-muted">{action.shortcut}</kbd>
                    </button>
                  ))}
                </div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 mt-6">Recent</p>
                <div className="space-y-2">
                  {[
                    { name: "Juan Dela Cruz", type: "Employee" },
                    { name: "Maria Santos", type: "Employee" },
                  ].map((item) => (
                    <button
                      key={item.name}
                      className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-foreground hover:bg-surface-hover transition-colors"
                    >
                      <Avatar name={item.name} size="sm" />
                      <div className="text-left">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted">{item.type}</p>
                      </div>
                    </button>
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
