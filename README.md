# TransitOps — Smart Transport Operations Platform

Centralized platform built for the Odoo Hackathon 2026 to manage the complete lifecycle of transport operations: vehicle registration, driver management, trip dispatching, maintenance, fuel logging, and analytics, with automated business rule enforcement.

## Technical Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database/Auth/Storage**: Supabase JS client
- **Visual Analytics**: Recharts
- **Routing**: React Router
- **Exporting**: PapaParse (CSV), jsPDF (PDF)

## Features Built

- **Authentication Flow**: Gated access with role-based dashboard screens and nav menus.
- **Vehicle Registry**: Searchable, filterable, and sortable fleet assets with doc uploading (Supabase Storage).
- **Driver Management**: Driver profiles with compliance warnings on expired or near-expired licenses.

## Getting Started

1. Copy `.env.example` to `.env` and fill in your Supabase variables.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.
4. Run `npm run build` to compile the production build.
