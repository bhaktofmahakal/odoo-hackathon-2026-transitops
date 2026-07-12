import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";
import { ROLE_LABELS } from "@/lib/permissions";
import { Sun, Moon, LogOut, Bell, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";

export function Topbar() {
  const { profile, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!profile) return;

    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) {
        setNotifications(data as Notification[]);
      }
    }
    fetchNotifications();

    const channel = supabase
      .channel("notifications_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  async function markAsRead(id: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    }
  }

  async function markAllAsRead() {
    if (notifications.length === 0) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      {/* Search stub — matching mockup's search bar */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search..."
          className="h-8 w-64 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          // TODO: Wire global search in a future phase
        />
      </div>

      {/* Right side — user info + controls */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <Sun className="size-4 text-muted-foreground" />
          ) : (
            <Moon className="size-4 text-muted-foreground" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground"
            title="Notifications"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-card p-2 shadow-lg ring-1 ring-black/5 z-50">
                <div className="flex items-center justify-between border-b pb-2 mb-2 px-2">
                  <span className="text-xs font-bold text-foreground">
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] text-amber-500 font-semibold flex items-center gap-1 hover:text-amber-400"
                    >
                      <Check className="size-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          markAsRead(n.id);
                          setShowNotifications(false);
                        }}
                        className={`w-full text-left p-2 rounded-md transition-colors hover:bg-muted/50 flex gap-2.5 items-start text-xs ${
                          !n.is_read ? "bg-muted/30 font-medium" : ""
                        }`}
                      >
                        <Info
                          className={`size-3.5 mt-0.5 shrink-0 ${
                            n.type === "license_expiry"
                              ? "text-red-500"
                              : "text-blue-500"
                          }`}
                        />
                        <div className="flex-1 space-y-0.5">
                          <p className="text-foreground leading-tight">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {!n.is_read && (
                          <span className="size-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User info */}
        {profile && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">
                {profile.full_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {role ? ROLE_LABELS[role] : ""}
              </p>
            </div>

            {/* Avatar */}
            <div className="flex size-8 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white">
              {profile.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          title="Sign out"
        >
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
