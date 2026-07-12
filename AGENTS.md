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
│   │   ├── auth-context.tsx             # Auth state, signIn/signUp/signOut, RBAC
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
│   │   │   ├── app-layout.tsx           # Main app shell (sidebar + topbar + outlet)
│   │   │   ├── protected-route.tsx      # Auth guard wrapper
│   │   │   ├── sidebar.tsx              # Navigation sidebar with role-based menu
│   │   │   └── topbar.tsx              # Top bar with search, theme toggle, logout
│   │   │
│   │   └── ui/
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx               # Modal dialog (p-5/gap-5/sm:p-6)
│   │       ├── dropdown-menu.tsx
│   │       ├── empty-state.tsx          # Reusable empty state component
│   │       ├── input.tsx
│   │       ├── loading-skeleton.tsx     # TableSkeleton, CardSkeleton
│   │       ├── role-selector.tsx        # Pill-button role chips (login/signup)
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── sheet.tsx
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx               # Toast notifications
│   │       ├── status-badge.tsx         # Color-coded status badges
│   │       ├── table.tsx
│   │       └── tooltip.tsx
│   │
│   └── pages/
│       ├── auth/
│       │   ├── login.tsx                # Sign in + role selector + remember me
│       │   └── signup.tsx               # Sign up with role chip selector
│       │
│       ├── dashboard/
│       │   ├── index.tsx                # Dashboard layout + data fetching
│       │   ├── kpi-cards.tsx            # 7 KPI metric cards
│       │   ├── recent-trips.tsx         # Recent trips table
│       │   └── vehicle-status-chart.tsx # Horizontal bar chart
│       │
│       ├── drivers/
│       │   ├── index.tsx                # Driver list + toggle status + trip compliance
│       │   └── driver-dialog.tsx        # Add/edit driver modal
│       │
│       ├── fuel-expenses/
│       │   ├── index.tsx                # Fuel & expense records list
│       │   ├── expense-dialog.tsx       # Add expense modal
│       │   └── fuel-dialog.tsx          # Add fuel record modal
│       │
│       ├── maintenance/
│       │   ├── index.tsx                # Maintenance logs + flow diagram
│       │   └── maintenance-dialog.tsx   # Log maintenance modal
│       │
│       ├── reports/
│       │   └── index.tsx                # Analytics + charts + PDF export
│       │
│       ├── settings/
│       │   └── index.tsx                # User profile + avatar upload
│       │
│       ├── trips/
│       │   ├── index.tsx                # Trip dispatcher + lifecycle bar
│       │   └── trip-dialog.tsx          # Trip completion modal
│       │
│       └── vehicles/
│           ├── index.tsx                # Vehicle registry + reg search
│           └── vehicle-dialog.tsx       # Add/edit vehicle modal
│
├── supabase/
│   ├── config.toml                      # Supabase project config
│   ├── migrations/
│   │   └── 20260712000000_profiles_and_role_selection.sql
│   └── functions/
│       └── check-license-expiry/
│           └── index.ts                 # Resend email edge function
│
├── public/
│   ├── logo.png                         # App logo
│   └── login-banner.png                 # Login left panel background
│
├── mockup/                              # Hand-drawn design mockups
│   ├── auth-rbac.png
│   ├── dashboard.png
│   ├── drivers-safety.png
│   ├── maintainence.png
│   ├── trip-dispatcher.png
│   └── vehicle resgistry.png
│
├── index.html                           # Vite SPA entry
├── package.json                         # Dependencies
├── vite.config.ts                       # Vite + React + Tailwind v4 plugin
├── tsconfig.json                        # TypeScript config
├── components.json                      # shadcn/ui config
├── .env                                 # Environment variables (gitignored)
├── .env.example                         # Env template
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
- Auth context (`src/context/auth-context.tsx`) provides `profile`, `role`, `signIn`, `signUp`, `signOut`

**Permission helpers** (`src/lib/permissions.ts`):
- `canWrite(role, resource)` — returns boolean for write access
- `canAccessNav(role, navItem)` — returns boolean for sidebar nav visibility

**Sidebar navigation** is filtered per role via `canAccessNav()`.

### 2. Database Schema (Supabase PostgreSQL)

Key tables:
- `profiles` — user id, email, full_name, role, region, avatar_url
- `vehicles` — registration_number (unique), name_model, type, max_load_capacity, odometer, acquisition_cost, status (Available/On Trip/In Shop/Retired)
- `drivers` — name, license_no, license_expiry_date, contact, category, trip_compliance, safety_score, status (Available/On Trip/Off Duty/Suspended)
- `trips` — source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status (Draft/Dispatched/Completed/Cancelled), created_by
- `maintenance_logs` — vehicle_id, description, cost, status (In Shop/Completed), opened_at, closed_at
- `fuel_records` — vehicle_id, date, liters, cost_per_liter, total_cost, odometer
- `expenses` — vehicle_id, date, category, amount, notes

**Triggers:**
- `on_auth_user_created` — auto-creates profile row on signup
- Trip constraints — validates vehicle/driver availability, license expiry, cargo capacity

### 3. Supabase Edge Functions

**`check-license-expiry`** (`supabase/functions/check-license-expiry/index.ts`):
- Runs daily via pg_cron at 8am IST
- Queries drivers with licenses expiring within 30 days
- Sends branded HTML email via Resend API
- Uses service role key for database access

### 4. Storage Buckets

- `avatars` — user profile photos
- `vehicle-documents` — vehicle registration/policy documents (PUBLIC bucket)

### 5. Dark Mode

- Theme context toggles `dark` class on `<html>`
- Tailwind v4 CSS-first config in `src/index.css`
- Custom dark mode styles for select options (`.dark select option`)

---

## Key Files Reference

### Auth Context (`src/context/auth-context.tsx`)
- `signIn(email, password, expectedRole?)` — validates role after login
- `signUp(email, password, role, fullName)` — upserts profile with role
- `signOut()` — clears session
- `profile` — current user profile object
- `role` — current user's role string

### Permissions (`src/lib/permissions.ts`)
```typescript
canWrite(role: UserRole, resource: string): boolean
canAccessNav(role: UserRole, navItem: string): boolean
```

### Types (`src/lib/types.ts`)
All TypeScript interfaces: `Vehicle`, `Driver`, `Trip`, `MaintenanceLog`, `FuelRecord`, `Expense`, `Profile`, `UserRole`, `VehicleStatus`, `TripStatus`, `MaintenanceStatus`, `DashboardKPIs`

### Status Badge (`src/components/ui/status-badge.tsx`)
Color-coded badges for: Available (green), On Trip (blue), In Shop (orange), Retired (red), Draft (yellow), Dispatched (blue), Completed (green), Cancelled (red), Available (green), Off Duty (gray), Suspended (red)

### Reports (`src/pages/reports/index.tsx`)
- Charts: Vehicle Type Distribution (Bar), Fuel Trend (Line), Maintenance Cost by Type (Pie), Expense Breakdown (Pie)
- PDF export: jsPDF + jspdf-autotable generates multi-page report with table data
- All charts use `ResponsiveContainer` with height `{288}`

### Dashboard (`src/pages/dashboard/`)
- `kpi-cards.tsx` — 7 KPI cards in responsive grid (2 cols → 3 cols → 7 cols)
- `recent-trips.tsx` — Table with TRIP, VEHICLE, DRIVER, STATUS, ETA columns
- `vehicle-status-chart.tsx` — Horizontal bar chart (Available/On Trip/In Shop/Retired)

---

## Environment Variables

| Key | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (edge functions) |
| `SUPABASE_SECRET_KEY` | Secret key (edge functions) |
| `DATABASE_URL` | Direct database connection |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `RESEND_API_KEY` | Resend email API key |

---

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server
npm run build            # Production build
npx tsc --noEmit         # Type check
supabase start           # Start local Supabase (requires Docker)
supabase db push         # Push migrations to remote
supabase functions deploy check-license-expiry  # Deploy edge function
```

---

## Git History

Commits are on `main` branch. Key commits:
1. Initial setup + full RBAC auth
2. Dashboard, vehicle registry, drivers pages
3. Trip dispatcher with capacity validation
4. Maintenance logs with In Shop/Completed statuses
5. Reports with charts + PDF export
6. Settings page + dark mode
7. Login/signup mockup matching (role chips, remember me, reg search, trip lifecycle, maintenance flow)

---

## Build & Deploy

- **Frontend:** Vite builds to `dist/` — deployable to any static host
- **Supabase:** Remote project `cugjoeelysjqdxvxskpv`
- **Edge Functions:** Deployed via `supabase functions deploy`
- **Cron:** pg_cron job runs `check-license-expiry` daily at 8am IST

---

## Known Issues

1. `.env` is committed to git with live credentials — needs rotation
2. Email templates removed from repo — configure via Supabase Dashboard → Auth → Email Templates
3. No custom SMTP configured — email confirmation may need to be disabled
4. `.env.example` only has 2 keys — should include all 11 keys
