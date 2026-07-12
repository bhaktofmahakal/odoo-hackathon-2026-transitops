# TransitOps — Smart Transport Operations Platform

TransitOps is a centralized fleet operations, compliance, and analytics platform built for the Odoo Hackathon 2026. It manages the complete lifecycle of transport operations: vehicle registration, driver management, trip dispatching, maintenance scheduling, fuel logging, and cost analytics, with automated business rule enforcement.

## Technical Stack

- **Frontend**: React + Vite + TypeScript (fully styled with premium dark mode support)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database/Auth/Storage**: Supabase Postgres + RLS policies + Storage Buckets
- **Visual Analytics**: Recharts (Fuel efficiency, cost structure distributions)
- **Routing**: React Router
- **Exporting**: PapaParse (CSV), jsPDF & jsPDF-AutoTable (PDF)
- **Notifications & Edge Function**: Deno Edge Runtime + Resend Email API + pg_cron scheduling

---

##l Key Core Features + all bonus featuresl

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
