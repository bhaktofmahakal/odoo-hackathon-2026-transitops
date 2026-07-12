import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import {
  getNavItemsForRole,
  NAV_LABELS,
  ROLE_LABELS,
  type NavItem,
} from "@/lib/permissions";
import {
  LayoutDashboard,
  Truck,
  Users,
  Route,
  Wrench,
  Fuel,
  BarChart3,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const NAV_ICONS: Record<NavItem, LucideIcon> = {
  dashboard: LayoutDashboard,
  vehicles: Truck,
  drivers: Users,
  trips: Route,
  maintenance: Wrench,
  "fuel-expenses": Fuel,
  reports: BarChart3,
  settings: Settings,
};

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { role, profile } = useAuth();
  const location = useLocation();

  const navItems = role ? getNavItemsForRole(role) : [];

  return (
    <aside
      className={cn("flex h-full w-56 shrink-0 flex-col border-r bg-card", className)}
    >
      {/* Branding */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b">
        <div className="flex size-8 items-center justify-center rounded-lg overflow-hidden border border-amber-500/20 bg-zinc-950">
          <img
            src="/logo.png"
            alt="TransitOps Logo"
            className="size-full object-cover"
          />
        </div>
        <span className="text-base font-bold tracking-tight">TransitOps</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = NAV_ICONS[item];
            const path = item === "dashboard" ? "/dashboard" : `/${item}`;
            const isActive =
              location.pathname === path ||
              (item !== "dashboard" && location.pathname.startsWith(path));

            return (
              <li key={item}>
                <NavLink
                  to={path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-600/15 text-amber-500 border-l-2 border-amber-500"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {NAV_LABELS[item]}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info at bottom */}
      {profile && (
        <div className="border-t px-4 py-3">
          <p className="text-sm font-medium truncate">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {role ? ROLE_LABELS[role] : "Unknown role"}
          </p>
        </div>
      )}
    </aside>
  );
}
