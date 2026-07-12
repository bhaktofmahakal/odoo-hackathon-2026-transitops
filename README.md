# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized fleet operations, compliance, and analytics platform built for the Odoo Hackathon 2026. It manages the complete lifecycle of transport operations: vehicle registration, driver management, trip dispatching, maintenance scheduling, fuel logging, and cost analytics, with automated business rule enforcement.

---

## Platform Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TRANSITOPS PLATFORM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │  LOGIN   │───▶│ DASHBOARD│───▶│  FLEET   │───▶│ TRIPS    │     │
│  │ (RBAC)   │    │ (7 KPIs) │    │ (Vehicles│    │ (Create, │     │
│  │          │    │          │    │  + Docs) │    │  Dispatch│     │
│  └──────────┘    └──────────┘    └──────────┘    │  Complete)│     │
│       │                                            └────┬─────┘     │
│       │                                                 │           │
│       ▼                                                 ▼           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ DRIVERS  │    │MAINTAIN- │    │FUEL &    │    │ REPORTS  │     │
│  │ (License │    │ ENCE     │    │EXPENSES  │    │ (Charts, │     │
│  │  + Score)│    │ (In Shop │    │ (Logs +  │    │  CSV/PDF │     │
│  │          │    │  → Avail)│    │  Summary)│    │  Export) │     │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  BUSINESS RULES (enforced at DB layer via Postgres triggers)        │
│  ─────────────────────────────────────────────────────────────────  │
│  1. Vehicle reg number = UNIQUE                                     │
│  2. Retired/In Shop vehicles → hidden from dispatch                 │
│  3. Expired license / Suspended driver → cannot be assigned         │
│  4. On Trip vehicle/driver → cannot be double-booked                │
│  5. Cargo weight > max capacity → BLOCKED                           │
│  6. Dispatch → vehicle + driver auto-set to "On Trip"               │
│  7. Complete → vehicle + driver auto-set to "Available"             │
│  8. Cancel → vehicle + driver auto-set to "Available"               │
│  9. Maintenance open → vehicle auto-set to "In Shop"                │
│  10. Maintenance close → vehicle auto-set to "Available"            │
└─────────────────────────────────────────────────────────────────────┘
```

### End-to-End Lifecycle

| Step | Action | What Happens Automatically |
|------|--------|---------------------------|
| 1 | Register Vehicle | Status = `Available`, appears in dispatch pool |
| 2 | Register Driver | License validated, score tracked |
| 3 | Create Trip | Select available vehicle + driver, set cargo & distance |
| 4 | Dispatch Trip | Vehicle + driver → `On Trip`, removed from pool |
| 5 | Complete Trip | Odometer updated, fuel logged, vehicle + driver → `Available` |
| 6 | Log Maintenance | Vehicle → `In Shop`, removed from dispatch pool |
| 7 | Close Maintenance | Vehicle → `Available`, cost auto-logged as expense |
| 8 | View Reports | Fuel efficiency, ROI, operational cost — all computed live |

### RBAC per Role

| Role | Can See | Can Do |
|------|---------|--------|
| **Fleet Manager** | Everything | Create/edit vehicles, drivers, trips, maintenance, fuel, expenses |
| **Driver** | Dashboard, Trips, Fuel, Settings | Create trips, dispatch, complete, log fuel & expenses |
| **Safety Officer** | Dashboard, Drivers, Settings | Create/edit driver profiles, license management |
| **Financial Analyst** | Dashboard, Fuel, Reports, Settings | Read-only + export CSV/PDF |

---

## Technical Stack

- **Frontend**: React + Vite + TypeScript (fully styled with premium dark mode support)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database/Auth/Storage**: Supabase Postgres + RLS policies + Storage Buckets
- **Visual Analytics**: Recharts (Fuel efficiency, cost structure distributions)
- **Routing**: React Router
- **Exporting**: PapaParse (CSV), jsPDF & jsPDF-AutoTable (PDF)
- **Notifications & Edge Function**: Deno Edge Runtime + Resend Email API + pg_cron scheduling

---

## Key Core Features + All Bonus Features

### 1. Authentication & Role-Based Access Control (RBAC)
- Secure login and registration.
- Profiles map to 4 granular user roles:
  - **Fleet Manager**: Full write access over all operations (vehicles, trips, maintenance, logs).
  - **Driver**: Can create fuel logs, Toll/Misc expenses, and update assigned trip status. Read-only on maintenance.
  - **Safety Officer**: Full management over drivers and license records.
  - **Financial Analyst**: Read-only access to all sheets with dedicated access to reports and financial details.

### 2. Vehicle Registry & Document Management
- Search, filter, and sort fleet assets with responsive table/card list views.
- Upload vehicle registration certificates directly to Supabase Storage.
- Automatic constraint checks (duplicate index codes) mapped to clean user alerts.

### 3. Driver Management & Compliance
- List views with license expiry indicators (warning alerts if expiring within 7 days).
- Safety score tracking and status updates.

### 4. Trip Dispatcher & Operations Board
- Left panel for trip creation with real-time payload overload checking against vehicle capacity.
- Right panel operations board grouped by status (Draft, Dispatched, Completed, Cancelled).
- **Trigger Exception Mapping**: Database validations capture and surface database triggers errors (expired license, busy driver, busy vehicle, capacity overload).
- **Completion Dialog**: Prompts for final odometer reading, fuel consumed, fuel cost, and trip revenue. Automatically inserts a background fuel log.

### 5. Maintenance Registry
- Logs active vehicle maintenance. Triggers flip vehicle status to `In Shop` and exclude them from trip dispatch selectors.
- Closing maintenance logs transitions the vehicle back to `Available` and automatically registers maintenance cost under the Expense Registry.

### 6. Fuel & Expense Registry
- Independent entry points to log Custom Fuel Refills and Toll/Misc expenses (excluding auto-generated maintenance invoices).
- **Fleet Costs Summary**: Live widgets pulling aggregate metrics and vehicle summaries from the `v_vehicle_report` database view.

### 8. Reports & Fleet Analytics
- Dynamic client-side calculation supporting real-time **Date Range**, **Vehicle Type**, and **Region** filtering.
- **Fuel Efficiency Ranking**: Recharts bar chart sorted best-to-worst (leading vehicle highlighted in emerald green).
- **Operational Cost Structure**: Recharts stacked bar chart showing Fuel vs Maintenance costs per vehicle.
- **ROI Analytics Table**: Color-coded ROI metrics showing green for positive and red for negative profit margins.
- **Exporting Options**:
  - **Export CSV**: PapaParse download of current filtered data.
  - **Export PDF**: jsPDF + jsPDF-AutoTable branded document with custom dark header, summary KPIs, parameters metadata, and grid lines.

### 9. Live In-App Notifications & Expiry Cron
- Topbar notification bell icon with an unread badge counter.
- Notifications are populated automatically via database status cascades and license expiry checks. Mark-as-read updates the record state in real-time.
- **check-license-expiry Edge Function**: Daily Deno function querying expiring licenses, updating in-app alerts, and notifying safety officers via Resend email delivery.

---

## How to Test (Evaluator Guide)

### Live App
**URL:** https://odoo-hackathon-2026-transitops.vercel.app

### Test Accounts (pre-seeded, ready to login)

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | `admin@transitops.io` | `TransitOps123!` |
| Safety Officer | `safety@transitops.io` | `TransitOps123!` |
| Financial Analyst | `finance@transitops.io` | `TransitOps123!` |
| Driver | `driver@transitops.io` | `TransitOps123!` |

### Quick Test Flow (5 minutes)

**Step 1 — Login as Fleet Manager**
1. Go to the URL above
2. Click the **Fleet Manager** role chip
3. Enter `admin@transitops.io` / `TransitOps123!`
4. Click **Sign In** → lands on Dashboard with 7 KPI cards

**Step 2 — Register a Vehicle**
1. Click **Fleet** in sidebar
2. Click **Add Vehicle**
3. Fill: Reg No `MH-14-V-0505`, Name `Maruti Eeco`, Type `Van`, Capacity `500`, Odometer `12000`, Cost `450000`, Region `Pune`
4. Click **Add Vehicle** → appears in the table

**Step 3 — Register a Driver**
1. Click **Drivers** in sidebar
2. Click **Register Driver**
3. Fill: Name `Alex Rivera`, License `DL-88213`, Category `LMV`, Expiry (pick 1 year from now), Score `95`
4. Click **Register Driver** → appears in the list

**Step 4 — Create & Dispatch a Trip**
1. Click **Trips** in sidebar
2. Fill: Source `Pune Warehouse`, Destination `Mumbai Hub`, Vehicle `MH-14-V-0505`, Driver `Alex Rivera`, Cargo `450`, Distance `150`
3. Click **Dispatch** → trip appears in Live Board with blue "Dispatched" badge

**Step 5 — Test Business Rule (Overload Block)**
1. Try creating another trip with same vehicle
2. Set Cargo Weight to `600` (exceeds 500 kg capacity)
3. Red warning appears: "Capacity exceeded by 100 kg — dispatch blocked"
4. **Dispatch button is disabled** → system correctly blocks overload

**Step 6 — Complete the Trip**
1. In Live Board, click **Complete** on the Dispatched trip
2. Enter: Odometer `12350`, Fuel `45`, Fuel Cost `3375`, Revenue `8500`
3. Click **Complete Trip** → status changes to green "Completed"

**Step 7 — Log Maintenance**
1. Click **Maintenance** in sidebar
2. Select vehicle `MH-14-V-0505`, Service `Oil Change`, Cost `2500`
3. Click **Log Maintenance** → vehicle status changes to orange "In Shop"

**Step 8 — Test RBAC (Role Switch)**
1. Open a new incognito window
2. Login as `finance@transitops.io` / `TransitOps123!` → Financial Analyst
3. Notice sidebar only shows: Dashboard, Fuel & Expenses, Analytics, Settings
4. **No Fleet, Drivers, Trips, or Maintenance** → RBAC working

**Step 9 — Reports & Export**
1. As Financial Analyst, click **Analytics**
2. Charts visible: Fuel Efficiency (bar), Fuel Trend (line), Maintenance Cost (pie)
3. Click **Export CSV** → downloads vehicle report
4. Click **Export PDF** → downloads branded PDF report

**Step 10 — Dark Mode**
1. Click the sun/moon icon in topbar
2. Entire app switches to dark mode
3. Click again to toggle back

### What to Verify

| Check | Expected |
|-------|----------|
| Dashboard KPIs | 7 cards with real data |
| Vehicle status badges | Green=Available, Blue=On Trip, Orange=In Shop |
| Currency format | ₹6,20,000 (Indian grouping) |
| Trip dispatch | Vehicle/Driver auto-set to "On Trip" |
| Trip complete | Vehicle/Driver return to "Available" |
| Overload block | Red warning + disabled dispatch button |
| RBAC sidebar | Financial Analyst sees 4 items, Fleet Manager sees 8 |
| Dark mode | Full app-wide theme toggle |
| CSV/PDF export | Downloads work with real data |
| Mobile responsive | Hamburger menu + card layouts on small screens |

---

## Getting Started & Setup

### 1. Database Setup
Execute the complete schema defined in [transitops_schema.sql](file:///u:/odoo-hackathon-2026-transitops/transitops_schema.sql) in your Supabase SQL Editor. This will set up all tables, enums, triggers, RLS policies, and dashboards views.

To schedule the daily license check:
1. Enable `pg_cron` extension in your Supabase database settings.
2. Run the following SQL block:
```sql
select cron.schedule(
  'license-expiry-daily-check',
  '0 8 * * *',
  $$
  select net.http_post(
    'https://[your-project-ref].supabase.co/functions/v1/check-license-expiry',
    '{}',
    '{}',
    '{"Content-Type": "application/json", "Authorization": "Bearer [your-service-role-key]"}'
  );
  $$
);
```

### 2. Environment Variables
Copy `.env.example` to `.env` and configure:
```env
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
```

### 3. Local Installation
```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Run compilation check
npm run build
```
