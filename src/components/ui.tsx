"use client";

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import { forwardRef } from "react";
import { motion, type MotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

// ==============================
// UTILITY FUNCTIONS
// ==============================

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

// ==============================
// BUTTON COMPONENT
// ==============================

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-white text-foreground border-2 border-border hover:border-primary-light hover:bg-surface-hover focus:ring-primary",
        danger:
          "bg-danger text-white hover:bg-danger-dark focus:ring-danger shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        success:
          "bg-success text-white hover:bg-success-dark focus:ring-success shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        warning:
          "bg-warning text-foreground hover:bg-warning-dark focus:ring-warning shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-muted hover:bg-surface-hover hover:text-foreground focus:ring-primary",
        link: "text-primary underline-offset-4 hover:underline focus:ring-primary",
        gradient:
          "bg-gradient-primary text-white hover:opacity-90 focus:ring-primary shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0",
      },
      size: {
        sm: "text-xs px-2.5 py-1.5 rounded-md",
        md: "text-sm px-4 py-2",
        lg: "text-base px-6 py-3",
        xl: "text-lg px-8 py-4",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "success" | "warning" | "link" | "gradient";
type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
        className={cx(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...(props as MotionProps & ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

// Backward compatible buttonClass function
export function buttonClass(variant: ButtonVariant = "primary", extra?: string): string {
  const variantMap: Record<ButtonVariant, string> = {
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-md hover:shadow-lg",
    secondary: "bg-white text-foreground border-2 border-border hover:border-primary-light hover:bg-surface-hover",
    danger: "bg-danger text-white hover:bg-danger-dark focus:ring-danger shadow-md hover:shadow-lg",
    success: "bg-success text-white hover:bg-success-dark focus:ring-success shadow-md hover:shadow-lg",
    warning: "bg-warning text-foreground hover:bg-warning-dark focus:ring-warning shadow-md hover:shadow-lg",
    ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
    link: "text-primary underline-offset-4 hover:underline",
    gradient: "bg-gradient-primary text-white hover:opacity-90 shadow-md hover:shadow-lg",
  };
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
    variantMap[variant],
    extra
  );
}

// ==============================
// CARD COMPONENT
// ==============================

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  gradient?: boolean;
}

export function Card({ children, className, hover = false, glass = false, gradient = false }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border bg-white shadow-sm animate-fade-in",
        hover && "hover-lift cursor-pointer",
        glass && "glass",
        gradient && "gradient-primary text-white",
        !glass && !gradient && "border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  gradient = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  gradient?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-4 border-b px-5 py-4",
        gradient ? "border-white/20" : "border-border"
      )}
    >
      <div>
        <h2 className={cx("text-sm font-bold tracking-tight", gradient && "text-white")}>{title}</h2>
        {subtitle ? (
          <p className={cx("mt-0.5 text-xs", gradient ? "text-white/80" : "text-muted")}>{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

// ==============================
// INPUT COMPONENT
// ==============================

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-light">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={cx(
              "field",
              icon ? "pl-10" : "",
              error ? "border-danger focus:border-danger focus:ring-danger" : "",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

// ==============================
// SELECT COMPONENT
// ==============================

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cx(
            "field",
            error ? "border-danger focus:border-danger focus:ring-danger" : "",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

// ==============================
// TEXTAREA COMPONENT
// ==============================

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={props.id}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cx(
            "field min-h-[100px] resize-y",
            error ? "border-danger focus:border-danger focus:ring-danger" : "",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// ==============================
// BADGE COMPONENT
// ==============================

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        gray: "bg-muted-light/20 text-muted",
        green: "bg-success/10 text-success-dark",
        red: "bg-danger/10 text-danger-dark",
        amber: "bg-warning/10 text-warning-dark",
        blue: "bg-info/10 text-info-dark",
        violet: "bg-primary/10 text-primary-dark",
        gradient: "bg-gradient-primary text-white",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-0.5",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "gray",
      size: "md",
    },
  }
);

type BadgeVariant = "gray" | "green" | "red" | "amber" | "blue" | "violet" | "gradient";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  pulse?: boolean;
  tone?: keyof typeof badgeTones;
}

export function Badge({ variant, tone, size = "md", children, pulse = false }: BadgeProps) {
  const resolvedVariant = variant ?? tone ?? "gray";
  return (
    <span className={cx(badgeVariants({ variant: resolvedVariant, size }), "animate-scale-in")}>
      {pulse && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

// Backward compatible badgeTones and statusTone
const badgeTones = {
  gray: "bg-muted-light/20 text-muted",
  green: "bg-success/10 text-success-dark",
  red: "bg-danger/10 text-danger-dark",
  amber: "bg-warning/10 text-warning-dark",
  blue: "bg-info/10 text-info-dark",
  violet: "bg-primary/10 text-primary-dark",
} as const;

export function statusTone(status: string): keyof typeof badgeTones {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
    case "PRESENT":
    case "PAID":
      return "green";
    case "PENDING":
    case "PROCESSING":
    case "FOR_APPROVAL":
    case "INCOMPLETE":
    case "PROBITIONARY":
      return "amber";
    case "REJECTED":
    case "TERMINATED":
    case "ABSENT":
    case "AWOL":
      return "red";
    case "ON_LEAVE":
      return "violet";
    default:
      return "gray";
  }
}

// ==============================
// EMPTY STATE COMPONENT
// ==============================

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, hint, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in">
      {icon && <div className="mb-4 text-muted-light">{icon}</div>}
      <p className="text-sm font-semibold text-muted">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-xs text-muted-light">{hint}</p> : null}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ==============================
// PAGE HEADER COMPONENT
// ==============================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  gradient?: boolean;
}

export function PageHeader({ title, subtitle, actions, gradient = false }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div>
        <h1 className={cx("text-2xl font-bold tracking-tight", gradient && "gradient-text")}>{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

// ==============================
// AVATAR COMPONENT
// ==============================

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away" | "busy";
}

export function Avatar({ src, name, size = "md", status }: AvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  const statusColors = {
    online: "bg-success",
    offline: "bg-muted-light",
    away: "bg-warning",
    busy: "bg-danger",
  };

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={name}
          className={cx("rounded-full object-cover", sizeClasses[size])}
        />
      ) : (
        <span
          className={cx(
            "flex items-center justify-center rounded-full bg-gradient-primary font-bold text-white",
            sizeClasses[size]
          )}
        >
          {initials}
        </span>
      )}
      {status && (
        <span
          className={cx(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// ==============================
// STAT CARD COMPONENT
// ==============================

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  gradient?: string;
}

export function StatCard({ label, value, sub, icon, trend, trendValue, gradient }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-light">{sub}</p>}
          {trend && trendValue && (
            <div className={cx("mt-2 flex items-center gap-1 text-xs font-semibold",
              trend === "up" && "text-success",
              trend === "down" && "text-danger",
              trend === "neutral" && "text-muted"
            )}>
              {trend === "up" && "↑"}
              {trend === "down" && "↓"}
              {trend === "neutral" && "→"}
              {trendValue}
            </div>
          )}
        </div>
        <div
          className={cx(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            gradient || "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ==============================
// TABS COMPONENT
// ==============================

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-background p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
            activeTab === tab.id
              ? "bg-white text-primary shadow-sm"
              : "text-muted hover:text-foreground hover:bg-surface-hover"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cx(
                "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                activeTab === tab.id ? "bg-primary/10 text-primary" : "bg-muted-light/20 text-muted"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ==============================
// PROGRESS BAR COMPONENT
// ==============================

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: "primary" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max = 100,
  color = "primary",
  size = "md",
  showLabel = false,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-muted">{value} / {max}</span>
          <span className="font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cx("w-full overflow-hidden rounded-full bg-muted-light/20", sizeClasses[size])}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cx("h-full rounded-full", colorClasses[color])}
        />
      </div>
    </div>
  );
}

// ==============================
// TOOLTIP COMPONENT
// ==============================

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="group relative inline-flex">
      {children}
      <div
        className={cx(
          "absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100",
          positionClasses[position]
        )}
      >
        {content}
      </div>
    </div>
  );
}

// ==============================
// DIVIDER COMPONENT
// ==============================

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({ orientation = "horizontal", className }: DividerProps) {
  return (
    <div
      className={cx(
        orientation === "horizontal" ? "h-px w-full bg-border" : "h-full w-px bg-border",
        className
      )}
    />
  );
}

// ==============================
// SKELETON LOADING COMPONENT
// ==============================

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cx("skeleton h-4 w-full", className)} />
      ))}
    </div>
  );
}
