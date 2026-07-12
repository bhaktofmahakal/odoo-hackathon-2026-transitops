import type { UserRole } from "./types";

// Navigation items available in the sidebar
export type NavItem =
  | "dashboard"
  | "vehicles"
  | "drivers"
  | "trips"
  | "maintenance"
  | "fuel-expenses"
  | "reports"
  | "settings";

// Which nav items each role can see — derived from PRD Section 2 + schema RLS
const ROLE_NAV_MAP: Record<UserRole, NavItem[]> = {
  fleet_manager: [
    "dashboard",
    "vehicles",
    "drivers",
    "trips",
    "maintenance",
    "fuel-expenses",
    "reports",
    "settings",
  ],
  driver: ["dashboard", "trips", "fuel-expenses", "settings"],
  safety_officer: ["dashboard", "drivers", "settings"],
  financial_analyst: ["dashboard", "fuel-expenses", "reports", "settings"],
};

// Write permissions per resource, matching schema RLS policies
const ROLE_WRITE_MAP: Record<string, UserRole[]> = {
  vehicles: ["fleet_manager"],
  drivers: ["fleet_manager", "safety_officer"],
  trips: ["driver", "fleet_manager"],
  maintenance: ["fleet_manager"],
  fuel_logs: ["fleet_manager", "driver"],
  expenses: ["fleet_manager", "driver"],
};

/**
 * Check if a role can see a given nav item
 */
export function canAccessNav(role: UserRole, item: NavItem): boolean {
  return ROLE_NAV_MAP[role]?.includes(item) ?? false;
}

/**
 * Get all nav items visible to a role
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return ROLE_NAV_MAP[role] ?? [];
}

/**
 * Check if a role can write (create/update) a given resource
 */
export function canWrite(role: UserRole, resource: string): boolean {
  return ROLE_WRITE_MAP[resource]?.includes(role) ?? false;
}

/**
 * Human-readable labels for nav items
 */
export const NAV_LABELS: Record<NavItem, string> = {
  dashboard: "Dashboard",
  vehicles: "Fleet",
  drivers: "Drivers",
  trips: "Trips",
  maintenance: "Maintenance",
  "fuel-expenses": "Fuel & Expenses",
  reports: "Analytics",
  settings: "Settings",
};

/**
 * Human-readable role labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  fleet_manager: "Fleet Manager",
  driver: "Dispatcher",
  safety_officer: "Safety Officer",
  financial_analyst: "Financial Analyst",
};
