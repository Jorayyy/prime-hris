"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  CalendarClock,
  CalendarDays,
  Wallet,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardHeader, Badge, statusTone, StatCard, Avatar, Button, ProgressBar } from "@/components/ui";
import { formatDate } from "@/lib/format";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type Props = {
  user: { firstName?: string | null; email: string };
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    pendingLeaves: number;
    pendingOvertime: number;
    activeCampaigns: number;
  };
  recentLeaves: Array<{
    name: string;
    type: string;
    dates: string;
    days: number;
    status: string;
  }>;
};

export default function AdminDashboard({ user, stats, recentLeaves }: Props) {
  const today = new Date();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Welcome */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.firstName || "Admin"}! 👋
          </h1>
          <p className="mt-1 text-sm text-muted">{formatDate(today)} · Here&apos;s your team overview</p>
        </div>
        <Button variant="gradient" size="lg">
          <Activity className="h-5 w-5" />
          View Reports
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Employees"
          value={String(stats.totalEmployees)}
          sub={`${stats.activeEmployees} active`}
          icon={<Users className="h-5 w-5" />}
          trend="up"
          trendValue={`${stats.activeCampaigns} campaigns`}
          gradient="bg-primary/10 text-primary"
        />
        <StatCard
          label="Present Today"
          value={String(stats.presentToday)}
          sub={`${stats.lateToday} late, ${stats.absentToday} absent`}
          icon={<CheckCircle className="h-5 w-5" />}
          trend="up"
          trendValue={stats.totalEmployees > 0 ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance` : "—"}
          gradient="bg-success/10 text-success"
        />
        <StatCard
          label="Pending Requests"
          value={String(stats.pendingLeaves + stats.pendingOvertime)}
          sub={`${stats.pendingLeaves} leaves, ${stats.pendingOvertime} OT`}
          icon={<AlertCircle className="h-5 w-5" />}
          trend="down"
          trendValue="Needs attention"
          gradient="bg-warning/10 text-warning-dark"
        />
        <StatCard
          label="Quick Payroll"
          value="4 weeks"
          sub="Aug 1 – Aug 28"
          icon={<Wallet className="h-5 w-5" />}
          gradient="bg-info/10 text-info-dark"
        />
      </motion.div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attendance Overview */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Today's Attendance"
              subtitle={`${stats.presentToday} present / ${stats.totalEmployees} total`}
              action={
                <Badge variant={stats.lateToday > 0 ? "amber" : "green"}>
                  {stats.lateToday > 0 ? `${stats.lateToday} Late` : "All Good"}
                </Badge>
              }
            />
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-success/10 p-4 text-center">
                  <p className="text-3xl font-bold text-success">{stats.presentToday}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-muted">Present</p>
                </div>
                <div className="rounded-xl bg-warning/10 p-4 text-center">
                  <p className="text-3xl font-bold text-warning-dark">{stats.lateToday}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-muted">Late</p>
                </div>
                <div className="rounded-xl bg-danger/10 p-4 text-center">
                  <p className="text-3xl font-bold text-danger">{stats.absentToday}</p>
                  <p className="mt-1 text-xs font-semibold uppercase text-muted">Absent</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted">Overall Attendance Rate</span>
                  <span className="font-semibold text-foreground">
                    {stats.totalEmployees > 0 ? Math.round((stats.presentToday / stats.totalEmployees) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar
                  value={stats.totalEmployees > 0 ? (stats.presentToday / stats.totalEmployees) * 100 : 0}
                  color="success"
                  size="md"
                />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader title="Quick Actions" />
            <div className="p-4 space-y-2">
              {[
                { href: "/employees/new", label: "Onboard Employee", desc: "Create new 201 record", icon: Users, color: "bg-primary/10 text-primary" },
                { href: "/schedules", label: "Assign Shifts", desc: "Schedule team members", icon: CalendarDays, color: "bg-secondary/10 text-secondary-dark" },
                { href: "/leaves", label: "Review Leaves", desc: `${stats.pendingLeaves} pending`, icon: CalendarClock, color: "bg-warning/10 text-warning-dark" },
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
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">{action.label}</p>
                    <p className="text-xs text-muted">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Recent Leave Requests */}
      {recentLeaves.length > 0 && (
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
              {recentLeaves.map((request, index) => (
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
      )}
    </motion.div>
  );
}
