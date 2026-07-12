import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  User,
  Mail,
  MapPin,
  Shield,
  Bell,
  BellOff,
  Clock,
  CalendarCheck,
  Wrench,
  Fuel,
} from "lucide-react";

export default function SettingsPage() {
  const { profile, role, user } = useAuth();

  // Notification preference toggles (local-only for now)
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile and notification preferences.
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <User className="size-4 text-amber-500" />
            User Profile
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="size-3" />
              Full Name
            </label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {profile?.full_name ?? "—"}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="size-3" />
              Email Address
            </label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {email}
            </div>
          </div>

          {/* Region */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="size-3" />
              Region
            </label>
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
              {profile?.region ?? "All Regions"}
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="size-3" />
              Role
            </label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-500">
                {role ? ROLE_LABELS[role] : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bell className="size-4 text-amber-500" />
            Notification Preferences
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Trip Updates */}
          <NotifToggle
            icon={Clock}
            label="Trip Status Updates"
            description="Get notified when trip status changes (dispatched, completed, cancelled)"
            enabled={notifPrefs.tripUpdates}
            onToggle={() => togglePref("tripUpdates")}
          />

          {/* Maintenance Alerts */}
          <NotifToggle
            icon={Wrench}
            label="Maintenance Alerts"
            description="Receive alerts for scheduled and unscheduled vehicle maintenance"
            enabled={notifPrefs.maintenanceAlerts}
            onToggle={() => togglePref("maintenanceAlerts")}
          />

          {/* Fuel Alerts */}
          <NotifToggle
            icon={Fuel}
            label="Fuel & Expense Alerts"
            description="Notifications for abnormal fuel consumption or high expenses"
            enabled={notifPrefs.fuelAlerts}
            onToggle={() => togglePref("fuelAlerts")}
          />

          {/* License Expiry */}
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
  );
}
