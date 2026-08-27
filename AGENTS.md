<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Overview

HRIS for a BPO company in Tacloban City, Philippines. Manages employee 201 records, time & attendance (bundy clock), schedules, leaves, payroll (SSS/PhilHealth/PAG-IBIG/BIR), and announcements.

## Tech Stack

- **Framework:** Next.js 16 (App Router, server components)
- **React:** 19
- **Database:** PostgreSQL via Prisma 6 (`prisma/schema.prisma`)
- **Styling:** Tailwind CSS v4 (NOT v3 — uses `@import "tailwindcss"` and `@theme inline`, NOT `@tailwind` directives)
- **Auth:** Cookie-based sessions (bcrypt + SHA-256 token hash), role-based access
- **Currency:** PHP (en-PH locale) — use `formatCurrency()` from `@/lib/format`

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + typescript)
npm run db:seed      # Seed DB: tsx prisma/seed.ts
```

No test framework is configured. No typecheck script — run `npx tsc --noEmit` manually.

**Vercel build pipeline** (defined in `vercel.json`): `prisma generate` -> `prisma db push --accept-data-loss --skip-generate` -> `tsx prisma/seed.ts` -> `npm run build`. The seed runs on every deploy.

## Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Database

- Schema: `prisma/schema.prisma` (660 lines, ~30 models)
- Seed: `prisma/seed.ts` — creates 20 employees, 4 user accounts, attendance data for Aug 1-27 2026, shift assignments, pay periods, and Philippine government contribution tables
- Prisma Client singleton: `src/lib/db.ts` (exports `db`)
- After editing schema: `npx prisma generate` then `npx prisma db push`

## Auth & Roles

- `src/lib/auth.ts` — session management, role helpers
- Roles: `SUPER_ADMIN`, `ADMIN`, `HR`, `PAYROLL`, `MANAGER`, `EMPLOYEE`
- Role groups: `HR_ROLES` (ADMIN, HR, SUPER_ADMIN), `PAYROLL_ROLES`, `MANAGEMENT_ROLES`, `SYSTEM_ROLES`
- Session cookie: `hris_session`, 12-hour TTL
- Layout guard: `src/app/(app)/layout.tsx` redirects unauthenticated users to `/login`

## Architecture

- `src/app/(app)/` — authenticated routes (dashboard, employees, attendance, payroll, leaves, schedules, settings, audit, users, me)
- `src/app/api/bundy/` — kiosk clock-in API endpoint
- `src/lib/actions/` — server actions (announcements, attendance, audit, auth, employees, ips, leaves, payroll, settings, users)
- `src/lib/payroll/ph.ts` — Philippine government contribution calculations
- `src/components/ui.tsx` — shared component library (Button, Card, Input, Select, Badge, StatCard, Tabs, ProgressBar, etc.)
- `src/components/dashboard-widgets/` — 8 dashboard widget components
- `src/lib/format.ts` — formatting utilities (currency, dates, initials, fullName)

## Conventions

- Server components by default; use `"use client"` only when needed
- Server actions in `src/lib/actions/` for mutations
- UI components use `class-variance-authority` (cva) for variants
- Custom CSS design system in `src/app/globals.css` with CSS custom properties (`--primary`, `--success`, etc.) mapped to Tailwind via `@theme inline`
- Philippine locale (`en-PH`) for all formatting
- Employee numbers: `EMP0001`-`EMP0020` (seed), `ADM0001` for admin
- Bundy PINs: SHA-256 hashed, format `123XX0` (XX = last 2 digits of employee number)

## Gotchas

- Tailwind v4 is NOT backward compatible with v3 — no `tailwind.config.js`, no `@tailwind` directives, use `@import "tailwindcss"` and `@theme inline`
- The `next dev` auto-recreates the `<!-- BEGIN:nextjs-agent-rules -->` block in AGENTS.md — don't fight it
- Seed script clears and regenerates all attendance/payroll data on every Vercel deploy
- `formatDateOnly()` in `src/lib/format.ts` normalizes to local date to avoid timezone shifting with UTC midnight stored dates
- No `tailwind.config.js` — Tailwind v4 configures via CSS
