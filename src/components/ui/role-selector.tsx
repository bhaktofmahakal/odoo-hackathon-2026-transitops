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
  icon: typeof Truck;
  activeColor: string;
}

const ROLES: RoleOption[] = [
  {
    value: "",
    label: "Assigned",
    icon: ShieldCheck,
    activeColor: "bg-muted text-muted-foreground border-muted-foreground/30",
  },
  {
    value: "fleet_manager",
    label: "Manager",
    icon: Truck,
    activeColor: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  },
  {
    value: "driver",
    label: "Dispatcher",
    icon: ShieldAlert,
    activeColor: "bg-blue-500/15 text-blue-500 border-blue-500/40",
  },
  {
    value: "safety_officer",
    label: "Safety",
    icon: ShieldCheck,
    activeColor: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  },
  {
    value: "financial_analyst",
    label: "Finance",
    icon: BarChart3,
    activeColor: "bg-purple-500/15 text-purple-500 border-purple-500/40",
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
      <div className="flex flex-wrap gap-2">
        {ROLES.map((role) => {
          const isSelected = value === role.value;
          return (
            <button
              key={role.value}
              type="button"
              onClick={() => onChange(role.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isSelected
                  ? role.activeColor
                  : "border-border text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/30",
              )}
            >
              <role.icon className="size-3.5" />
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
