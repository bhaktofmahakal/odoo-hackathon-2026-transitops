import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
} from "lucide-react";

interface RoleOption {
  value: UserRole | "";
  label: string;
  description: string;
  icon: typeof Truck;
  color: string;
}

const ROLES: RoleOption[] = [
  {
    value: "",
    label: "Use my assigned role",
    description: "Sign in with the role already assigned to your account",
    icon: ShieldCheck,
    color: "border-muted text-muted-foreground",
  },
  {
    value: "fleet_manager",
    label: "Fleet Manager",
    description: "Full access to vehicles, trips, maintenance, and settings",
    icon: Truck,
    color: "border-amber-500/40 bg-amber-500/5 text-amber-500",
  },
  {
    value: "driver",
    label: "Dispatcher",
    description: "Dashboard, trip management, and fuel logging",
    icon: ShieldAlert,
    color: "border-blue-500/40 bg-blue-500/5 text-blue-500",
  },
  {
    value: "safety_officer",
    label: "Safety Officer",
    description: "Driver compliance, safety metrics, and license tracking",
    icon: ShieldCheck,
    color: "border-emerald-500/40 bg-emerald-500/5 text-emerald-500",
  },
  {
    value: "financial_analyst",
    label: "Financial Analyst",
    description: "Fuel expenses, cost reports, and analytics dashboard",
    icon: BarChart3,
    color: "border-purple-500/40 bg-purple-500/5 text-purple-500",
  },
];

interface RoleSelectorProps {
  value: UserRole | "";
  onChange: (role: UserRole | "") => void;
  required?: boolean;
}

export function RoleSelector({ value, onChange, required }: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Workspace Role {required && <span className="text-destructive">*</span>}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {ROLES.map((role) => {
          const isSelected = value === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
                isSelected
                  ? `${role.color} ring-1 ring-current/20`
                  : "border-border hover:border-muted-foreground/30 hover:bg-muted/30",
              )}
            >
              <role.icon className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{role.label}</p>
                <p className="text-xs text-muted-foreground">{role.description}</p>
              </div>
              {isSelected && (
                <div className="size-2.5 rounded-full bg-current shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
