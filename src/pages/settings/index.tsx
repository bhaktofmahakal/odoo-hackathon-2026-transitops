import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  User,
  MapPin,
  Shield,
  Bell,
  BellOff,
  Clock,
  CalendarCheck,
  Wrench,
  Fuel,
  Settings2,
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  fleet_manager: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  driver: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  safety_officer: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  financial_analyst: "bg-purple-500/15 text-purple-500 border-purple-500/30",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SettingsPage() {
  const { profile, role, user } = useAuth();

  const [notifPrefs, setNotifPrefs] = useState({
    tripUpdates: true,
    maintenanceAlerts: true,
    fuelAlerts: true,
    licenseExpiry: true,
  });

  function togglePref(key: keyof typeof notifPrefs) {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const email = profile?.email ?? user?.email ?? "—";
  const displayName = profile?.full_name ?? user?.email?.split("@")[0] ?? "User";

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings2 className="size-5 text-amber-500" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and notification preferences.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600/10 to-transparent px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 font-bold text-xl">
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{email}</p>
          </div>
          {role && (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"
              }`}
            >
              <Shield className="size-3.5" />
              {ROLE_LABELS[role]}
            </span>
          )}
        </div>

        <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="size-3" />
              Full Name
            </label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {profile?.full_name ?? "—"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="size-3" />
              Region
            </label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {profile?.region ?? "All Regions"}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="size-3" />
              Workspace Access
            </label>
            <div className="flex h-10 items-center rounded-md border border-input bg-muted/30 px-3 text-sm text-muted-foreground">
              Determined by role
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-5 flex items-center justify-between">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bell className="size-4 text-amber-500" />
            Notification Preferences
          </h2>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
            Local only
          </span>
        </div>
        <div className="p-2 space-y-1">
          <NotifToggle
            icon={Clock}
            label="Trip Status Updates"
            description="Get notified when trip status changes (dispatched, completed, cancelled)"
            enabled={notifPrefs.tripUpdates}
            onToggle={() => togglePref("tripUpdates")}
          />
          <NotifToggle
            icon={Wrench}
            label="Maintenance Alerts"
            description="Receive alerts for scheduled and unscheduled vehicle maintenance"
            enabled={notifPrefs.maintenanceAlerts}
            onToggle={() => togglePref("maintenanceAlerts")}
          />
          <NotifToggle
            icon={Fuel}
            label="Fuel & Expense Alerts"
            description="Notifications for abnormal fuel consumption or high expenses"
            enabled={notifPrefs.fuelAlerts}
            onToggle={() => togglePref("fuelAlerts")}
          />
          <NotifToggle
            icon={CalendarCheck}
            label="License Expiry Reminders"
            description="Email reminders when driver licenses are about to expire"
            enabled={notifPrefs.licenseExpiry}
            onToggle={() => togglePref("licenseExpiry")}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle Row Component                                                */
/* ------------------------------------------------------------------ */

interface NotifToggleProps {
  icon: typeof Bell;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function NotifToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onToggle,
}: NotifToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-transparent hover:border-border hover:bg-muted/20 px-4 py-3 transition-colors">
      <div className="flex items-start gap-3">
        <Icon className="size-4 mt-0.5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            enabled ? "bg-amber-500" : "bg-muted-foreground/30"
          }`}
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${label}`}
        >
          <span
            className={`pointer-events-none block size-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
              enabled ? "translate-x-[18px]" : "translate-x-[3px]"
            }`}
          />
        </button>
        {enabled ? (
          <Bell className="size-3.5 text-amber-500 shrink-0" />
        ) : (
          <BellOff className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </div>
    </div>
  );
}
