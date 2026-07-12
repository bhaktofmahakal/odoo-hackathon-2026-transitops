# AGENTS.md — TransitOps Codebase Reference

## Project Overview

**TransitOps** is a full-stack fleet management platform built for the Odoo Hackathon 2026. It provides role-based access control (RBAC), real-time vehicle/trip tracking, maintenance logging, driver management, and analytics dashboards.

- **Frontend:** React 19 + TypeScript 5 + Vite 8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, pg_cron, Storage)
- **Charts:** Recharts 3
- **PDF:** jsPDF v4.2.1 + jspdf-autotable v5.0.8
- **UI Components:** shadcn/ui (base-nova style, lucide icons)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Build Tool | Vite 8 |
| Framework | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (CSS-first config via `@import "tailwindcss"` in `src/index.css`) |
| UI Library | shadcn/ui (components in `src/components/ui/`) |
| Icons | Lucide React |
| Charts | Recharts 3 |
| PDF Export | jsPDF + jspdf-autotable |
| Auth | Supabase Auth (email/password + role metadata) |
| Database | PostgreSQL via Supabase |
| Edge Functions | Supabase Edge Functions (Deno) |
| Cron Jobs | pg_cron (Supabase extension) |
| Email | Resend API (via Edge Function) |

---

## Directory Structure

```
├── src/
│   ├── App.tsx                          # Router + layout wrapper
│   ├── main.tsx                         # React entry point
│   ├── index.css                        # Tailwind v4 config + dark mode styles
│   │
│   ├── context/
│   │   ├── auth-context.tsx             # Auth state, signIn/signUp/signOut/resetPassword/updatePassword
│   │   └── theme-context.tsx            # Dark/light mode toggle
│   │
│   ├── lib/
│   │   ├── permissions.ts               # canWrite(), canAccessNav() role helpers
│   │   ├── storage.ts                   # Supabase Storage upload helpers
│   │   ├── supabase.ts                  # Supabase client init
│   │   ├── types.ts                     # All TypeScript types/interfaces
│   │   └── utils.ts                     # cn() class merge helper
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── app-layout.tsx           # Main app shell (desktop sidebar + mobile Sheet drawer + topbar)
│   │   │   ├── protected-route.tsx      # Auth guard wrapper
│   │   │   ├── sidebar.tsx              # Navigation sidebar (hidden md:flex desktop, Sheet on mobile)
│   │   │   └── topbar.tsx              # Top bar (hamburger on mobile, search, theme, logout)
│   │   │
│   │   └── ui/
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx               # Modal dialog (max-w-[calc(100%-2rem)] mobile, sm:max-w-sm+)
│   │       ├── dropdown-menu.tsx
│   │       ├── empty-state.tsx          # Reusable empty state component
│   │       ├── input.tsx
│   │       ├── loading-skeleton.tsx     # TableSkeleton, CardSkeleton
│   │       ├── role-selector.tsx        # Pill-button role chips (login/signup)
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx                # Sheet drawer (used for mobile sidebar)
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx               # Toast notifications
│   │       ├── status-badge.tsx         # Color-coded status badges
│   │       ├── table.tsx
│   │       └── tooltip.tsx
│   │
│   └── pages/
│       ├── auth/
│       │   ├── login.tsx                # Sign in + role selector + remember me + forgot password
│       │   ├── signup.tsx               # Sign up with role chip selector
│       │   └── reset-password.tsx       # Password reset form (token from email link)
│       │
│       ├── dashboard/
│       │   ├── index.tsx                # Dashboard + FILTERED data fetching (type/status/region filters wired)
│       │   ├── kpi-cards.tsx            # 7 KPI metric cards
│       │   ├── recent-trips.tsx         # Recent trips (table on desktop, cards on mobile)
│       │   └── vehicle-status-chart.tsx # Horizontal bar chart
│       │
│       ├── drivers/
│       │   ├── index.tsx                # Driver list (table desktop, cards mobile) + toggle status
│       │   └── driver-dialog.tsx        # Add/edit driver modal
│       │
│       ├── fuel-expenses/
│       │   ├── index.tsx                # Fuel & expense records (3 tabs: fuel/expenses/summary)
│       │   ├── expense-dialog.tsx       # Add expense modal
│       │   └── fuel-dialog.tsx          # Add fuel record modal
│       │
│       ├── maintenance/
│       │   ├── index.tsx                # Maintenance logs (two-column: form left, table right)
│       │   └── maintenance-dialog.tsx   # Log maintenance modal
│       │
│       ├── reports/
│       │   └── index.tsx                # Analytics + charts + CSV/PDF export
│       │
│       ├── settings/
│       │   └── index.tsx                # User profile + avatar upload (bonus, not in PRD)
│       │
│       ├── trips/
│       │   ├── index.tsx                # Trip dispatcher (split layout + lifecycle bar)
│       │   └── trip-dialog.tsx          # Trip completion modal
│       │
│       └── vehicles/
│           ├── index.tsx                # Vehicle registry (table desktop, cards mobile)
│           └── vehicle-dialog.tsx       # Add/edit vehicle modal
│
├── supabase/
│   ├── config.toml                      # Supabase project config
│   ├── migrations/
│   │   └── 20260712000000_profiles_and_role_selection.sql
│   └── functions/
│       └── check-license-expiry/
│           └── index.ts                 # License expiry email edge function (Deno)
│
├── transitops_schema.sql                # Full DB schema (idempotent, safe to re-run)
├── public/
│   ├── logo.png                         # App logo
│   └── login-banner.png                 # Login left panel background
│
├── mockup/                              # Hand-drawn design mockups
├── index.html                           # Vite SPA entry
├── package.json                         # Dependencies
├── vite.config.ts                       # Vite + React + Tailwind v4 plugin
├── tsconfig.json                        # TypeScript config
├── components.json                      # shadcn/ui config
├── .env                                 # Environment variables (gitignored, NOT in git history)
├── .env.example                         # Env template (all 11 keys)
├── PRD.md                               # Product requirements document
└── AGENTS.md                            # This file
```

---

## Core Concepts

### 1. Authentication & RBAC

**4 roles:** `fleet_manager`, `driver`, `safety_officer`, `financial_analyst`

**Auth flow:**
- Sign up: role chip selector → `supabase.auth.signUp()` with role in metadata → upserts `profiles` table
- Sign in: role chip selector (optional) → validates role matches expected
- Forgot password: email input → `supabase.auth.resetPasswordForEmail()` → sends email with reset link → `/reset-password` page → `supabase.auth.updateUser()` sets new password
- Auth context (`src/context/auth-context.tsx`) provides `profile`, `role`, `signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword`

**Permission helpers** (`src/lib/permissions.ts`):
- `canWrite(role, resource)` — returns boolean for write access
- `canAccessNav(role, navItem)` — returns boolean for sidebar nav visibility

**Sidebar navigation** is filtered per role via `canAccessNav()`. Mobile uses Sheet drawer.

### 2. Database Schema (Supabase PostgreSQL)

Key tables (see `transitops_schema.sql` for full DDL):
- `profiles` — id, full_name, email, role, region, created_at, updated_at
- `vehicles` — id, registration_number (unique), name_model, type, max_load_capacity, odometer, acquisition_cost, region, status (Available/On Trip/In Shop/Retired), document_url
- `drivers` — id, profile_id, name, **license_number** (unique), license_category, license_expiry_date, contact_number, safety_score, status (Available/On Trip/Off Duty/Suspended)
- `trips` — id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, final_odometer, fuel_consumed, revenue, status (Draft/Dispatched/Completed/Cancelled), dispatched_at, completed_at, cancelled_at, created_by
- `maintenance_logs` — id, vehicle_id, description, cost, status (**In Shop/Completed**), opened_at, closed_at
- `fuel_logs` — id, vehicle_id, trip_id, liters, cost, log_date, created_at
- `expenses` — id, vehicle_id, trip_id, category, amount, expense_date, created_at
- `notifications` — id, recipient_id, type, message, is_read, created_at

**Triggers (fire on INSERT OR UPDATE):**
- `on_auth_user_created` — auto-creates profile row on signup
- `trg_0_trip_validate` — validates vehicle/driver availability, license expiry, cargo capacity before dispatch
- `trg_1_trip_status_cascade` — cascades vehicle/driver status on Dispatch/Complete/Cancel (fires on both INSERT and UPDATE)
- `trg_prevent_double_active_trip` — prevents double-booking a vehicle or driver (fires on both INSERT and UPDATE)
- `trg_maintenance_status_cascade` — sets vehicle In Shop on maintenance open, Available on close + auto-logs expense

**Views:**
- `v_dashboard_kpis` — pre-computed dashboard metrics
- `v_vehicle_report` — per-vehicle operational cost, fuel efficiency, ROI

### 3. Supabase Edge Functions

**`check-license-expiry`** (`supabase/functions/check-license-expiry/index.ts`):
- Runs daily via pg_cron at 8am IST
- Queries drivers with licenses expiring within 7 days
- Sends branded email via Resend API
- Uses `SERVICE_ROLE_KEY` secret (not `SUPABASE_SERVICE_ROLE_KEY` — that prefix is reserved)
- Function is `SECURITY DEFINER` to bypass RLS for notifications insert

### 4. Storage Buckets

- `avatars` — user profile photos
- `vehicle-documents` — vehicle registration/policy documents (PUBLIC bucket)

### 5. Dark Mode

- Theme context toggles `dark` class on `<html>`
- Tailwind v4 CSS-first config in `src/index.css`
- Custom dark mode styles for select options (`.dark select option`)

### 6. Responsive Design

- **Mobile sidebar:** Hamburger button in topbar opens Sheet drawer (left side)
- **Tables:** Desktop table view (`hidden md:block`) + mobile card grid (`md:hidden`) on Vehicles, Drivers, Recent Trips
- **Split layouts:** Trips and Maintenance use `flex-col lg:flex-row` stacking
- **Dialogs:** Base `max-w-[calc(100%-2rem)]` for mobile, page-specific `sm:max-w-*` for desktop
- **KPI cards:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-7`

---

## Key Files Reference

### Auth Context (`src/context/auth-context.tsx`)
- `signIn(email, password, expectedRole?)` — validates role after login
- `signUp(email, password, role, fullName)` — upserts profile with role
- `signOut()` — clears session
- `resetPassword(email)` — sends reset email via Supabase SDK
- `updatePassword(newPassword)` — updates password (from reset link)
- `profile` — current user profile object
- `role` — current user's role string

### Permissions (`src/lib/permissions.ts`)
```typescript
canWrite(role: UserRole, resource: string): boolean
canAccessNav(role: UserRole, navItem: string): boolean
```

### Types (`src/lib/types.ts`)
All TypeScript interfaces: `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelLog`, `Expense`, `Profile`, `Notification`, `UserRole`, `VehicleStatus`, `DriverStatus`, `TripStatus`, `MaintenanceStatus`, `DashboardKPIs`, `VehicleReport`

### Status Badge (`src/components/ui/status-badge.tsx`)
Color-coded badges for: Available (green), On Trip (blue), In Shop (orange), Retired (red), Draft (zinc), Dispatched (blue), Completed (green), Cancelled (red), Off Duty (zinc), Suspended (red)

### Dashboard (`src/pages/dashboard/`)
- `index.tsx` — FILTERED data fetching: unfiltered uses `v_dashboard_kpis` view, filtered queries raw tables with `.eq()/.in()` and computes KPIs in JS
- `kpi-cards.tsx` — 7 KPI cards in responsive grid
- `recent-trips.tsx` — Desktop table + mobile card stack
- `vehicle-status-chart.tsx` — Horizontal bar chart

### Reports (`src/pages/reports/index.tsx`)
- Charts: Fuel Efficiency (Bar), Fuel Trend (Line), Maintenance Cost (Pie), Expense Breakdown (Pie)
- CSV export: `handleExportCSV` generates downloadable CSV
- PDF export: jsPDF + jspdf-autotable generates multi-page report
- All charts use `ResponsiveContainer` with height `{288}`

---

## Environment Variables

| Key | Purpose | Where |
|-----|---------|-------|
| `VITE_SUPABASE_URL` | Supabase project URL | Frontend (.env) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Frontend (.env) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | .env (for reference only) |
| `SERVICE_ROLE_KEY` | Service role key | Edge Function Secret (no SUPABASE_ prefix) |
| `RESEND_API_KEY` | Resend email API key | Edge Function Secret |
| `SUPABASE_SECRET_KEY` | Secret key | .env |
| `DATABASE_URL` | Direct database connection | .env |
| `DB_HOST` | Database host | .env |
| `DB_PORT` | Database port | .env |
| `DB_NAME` | Database name | .env |
| `DB_USER` | Database user | .env |
| `DB_PASSWORD` | Database password | .env |

---

## Development Commands

```bash
npm install                          # Install dependencies
npm run dev                          # Start Vite dev server (port 5173)
npm run build                        # Production build
npx tsc --noEmit                     # Type check
npx supabase link --project-ref cuqjoeelysjqdxvxskpv  # Link to remote project
npx supabase functions deploy check-license-expiry --use-docker false  # Deploy edge function
npx supabase secrets set SERVICE_ROLE_KEY=xxx RESEND_API_KEY=xxx  # Set edge function secrets
```

---

## Build & Deploy

- **Frontend:** Vite builds to `dist/` — deployable to any static host
- **Supabase:** Remote project `cugjoeelysjqdxvxskpv`
- **Edge Functions:** Deployed via `supabase functions deploy --use-docker false`
- **Secrets:** Set via `supabase secrets set` (cannot use `SUPABASE_` prefix)
- **Cron:** pg_cron job runs `check-license-expiry` daily at 8am IST
- **Schema:** `transitops_schema.sql` is fully idempotent (IF NOT EXISTS everywhere), safe to re-run

---

## Known Issues

1. `.env` is gitignored and was NEVER committed to git — no key rotation needed
2. Email templates removed from repo — configure via Supabase Dashboard → Auth → Email Templates
3. No custom SMTP configured — email confirmation may need to be disabled
4. Dashboard filters: when active, KPIs computed from raw filtered data (not from view)

---

## Security Notes

- `.env` is in `.gitignore` — never tracked by git
- Edge function uses `SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) because Supabase reserves the `SUPABASE_` prefix for custom secrets
- `fn_check_license_expiry` is `SECURITY DEFINER` to bypass RLS for notifications insert
- RLS enabled on all tables with role-based policies
