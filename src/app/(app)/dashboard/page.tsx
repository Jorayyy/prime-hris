"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  CalendarClock,
  CalendarDays,
  Wallet,
  ArrowRight,
  LogIn,
  LogOut,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, Badge, statusTone, StatCard, Avatar, Button, ProgressBar } from "@/components/ui";
import { formatDate, formatTime, minutesToHoursMinutes } from "@/lib/format";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  // Mock data for demonstration
  const user = {
    firstName: "Juan",
    lastName: "Dela Cruz",
    role: "ADMIN",
  };

  const today = new Date();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user.firstName}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted">
            {formatDate(today)} · Here&apos;s what&apos;s happening today
          </p>
        </div>
        <Button variant="gradient" size="lg">
          <Activity className="h-5 w-5" />
          View Reports
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Employees"
          value="156"
          sub="12 on leave today"
          icon={<Users className="h-5 w-5" />}
          trend="up"
          trendValue="+3 this month"
          gradient="bg-primary/10 text-primary"
        />
        <StatCard
          label="Present Today"
          value="142"
          sub="8 late arrivals"
          icon={<CheckCircle className="h-5 w-5" />}
          trend="up"
          trendValue="91% attendance"
          gradient="bg-success/10 text-success"
        />
        <StatCard
          label="Pending Requests"
          value="8"
          sub="5 leaves, 3 overtime"
          icon={<AlertCircle className="h-5 w-5" />}
          trend="down"
          trendValue="-2 from yesterday"
          gradient="bg-warning/10 text-warning-dark"
        />
        <StatCard
          label="Payroll Status"
          value="Processing"
          sub="Pay date: Aug 30"
          icon={<Wallet className="h-5 w-5" />}
          gradient="bg-info/10 text-info-dark"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Attendance Today */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader
              title="My Attendance Today"
              subtitle="EMP0001 · Customer Service Representative · Acme Voice Support"
              action={
                <Badge variant="green" pulse>
                  On Shift
                </Badge>
              }
            />
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                    <LogIn className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-xs font-semibold uppercase text-muted">Clock In</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">8:00 AM</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                    <LogOut className="h-6 w-6 text-info" />
                  </div>
                  <p className="text-xs font-semibold uppercase text-muted">Clock Out</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">—</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-xs font-semibold uppercase text-muted">Hours Worked</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">5:32</p>
                </div>
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                    <Clock className="h-6 w-6 text-warning-dark" />
                  </div>
                  <p className="text-xs font-semibold uppercase text-muted">Late</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">0:00</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted">Shift Progress</span>
                  <span className="font-semibold text-foreground">65%</span>
                </div>
                <ProgressBar value={65} color="primary" size="md" />
                <p className="mt-2 text-xs text-muted">2:30 remaining until shift ends</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader
              title="Quick Actions"
              action={
                <Link href="/employees" className="text-xs font-semibold text-primary hover:text-primary-dark">
                  View All →
                </Link>
              }
            />
            <div className="p-4 space-y-2">
              {[
                { href: "/employees/new", label: "Onboard Employee", desc: "Create new 201 record", icon: Users, color: "bg-primary/10 text-primary" },
                { href: "/schedules", label: "Assign Shifts", desc: "Schedule team members", icon: CalendarDays, color: "bg-secondary/10 text-secondary-dark" },
                { href: "/leaves", label: "Review Leaves", desc: "8 pending requests", icon: CalendarClock, color: "bg-warning/10 text-warning-dark" },
                { href: "/payroll", label: "Process Payroll", desc: "Run payroll cycle", icon: Wallet, color: "bg-success/10 text-success" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-4 rounded-xl p-3 hover:bg-surface-hover transition-colors group"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Leave Requests */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader
              title="Recent Leave Requests"
              subtitle="Latest team leave requests"
              action={
                <Link href="/leaves" className="text-xs font-semibold text-primary hover:text-primary-dark">
                  View All →
                </Link>
              }
            />
            <div className="divide-y divide-border">
              {[
                { name: "Maria Santos", type: "Vacation Leave", dates: "Aug 30 - Sep 2", days: 3, status: "PENDING" },
                { name: "Pedro Ramos", type: "Sick Leave", dates: "Aug 28", days: 1, status: "APPROVED" },
                { name: "Ana Garcia", type: "Emergency Leave", dates: "Aug 29", days: 1, status: "PENDING" },
                { name: "Carlos Reyes", type: "Vacation Leave", dates: "Sep 5 - Sep 10", days: 5, status: "APPROVED" },
              ].map((request, index) => (
                <div key={index} className="flex items-center justify-between px-5 py-4 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar name={request.name} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{request.name}</p>
                      <p className="text-xs text-muted">
                        {request.type} · {request.dates} · {request.days} day(s)
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusTone(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Team Performance */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader
              title="Team Performance"
              subtitle="This month's metrics"
              gradient
            />
            <div className="p-6 space-y-6">
              {/* Attendance Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Attendance Rate</span>
                  <span className="text-sm font-bold text-success">94%</span>
                </div>
                <ProgressBar value={94} color="success" size="md" />
              </div>

              {/* Productivity Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Productivity Score</span>
                  <span className="text-sm font-bold text-primary">87%</span>
                </div>
                <ProgressBar value={87} color="primary" size="md" />
              </div>

              {/* Leave Utilization */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Leave Utilization</span>
                  <span className="text-sm font-bold text-warning-dark">62%</span>
                </div>
                <ProgressBar value={62} color="warning" size="md" />
              </div>

              {/* Top Performers */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-semibold text-foreground mb-3">Top Performers</p>
                <div className="space-y-3">
                  {[
                    { name: "Juan Dela Cruz", score: "98%", avatar: "JD" },
                    { name: "Maria Santos", score: "95%", avatar: "MS" },
                    { name: "Pedro Ramos", score: "92%", avatar: "PR" },
                  ].map((performer, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      <Avatar name={performer.name} size="sm" />
                      <span className="flex-1 text-sm font-medium text-foreground">{performer.name}</span>
                      <span className="text-sm font-bold text-success">{performer.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
