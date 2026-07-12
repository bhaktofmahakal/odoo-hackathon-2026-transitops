import { cn } from "@/lib/utils";
import type {
  VehicleStatus,
  DriverStatus,
  TripStatus,
  MaintenanceStatus,
} from "@/lib/types";

type StatusType = VehicleStatus | DriverStatus | TripStatus | MaintenanceStatus;

// Color mapping per PRD Section 10
const STATUS_STYLES: Record<string, string> = {
  // Vehicle statuses
  Available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "On Trip": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "In Shop": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Retired: "bg-red-500/15 text-red-400 border-red-500/30",
  // Driver statuses
  "Off Duty": "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  Suspended: "bg-red-500/15 text-red-400 border-red-500/30",
  // Trip statuses
  Draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  Dispatched: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  // Maintenance statuses
  Active: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Closed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status] ??
          "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
        className,
      )}
    >
      {status}
    </span>
  );
}
