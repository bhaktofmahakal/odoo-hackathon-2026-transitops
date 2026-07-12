import type { Trip } from "@/lib/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Route } from "lucide-react";

interface RecentTripsProps {
  trips: Trip[];
  loading: boolean;
}

export function RecentTrips({ trips, loading }: RecentTripsProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Trips
        </h3>
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Recent Trips
      </h3>

      {trips.length === 0 ? (
        <EmptyState
          icon={<Route className="size-6 text-muted-foreground" />}
          title="No trips yet"
          description="Create your first trip to see it here"
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Trip</th>
                  <th className="pb-3 pr-4">Vehicle</th>
                  <th className="pb-3 pr-4">Driver</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trips.map((trip, i) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium">
                      TR{String(i + 1).padStart(3, "0")}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {trip.vehicles?.name_model ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {trip.drivers?.name ?? "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {trip.status === "Dispatched"
                        ? "In transit"
                        : trip.status === "Draft"
                          ? "Awaiting dispatch"
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {trips.map((trip, i) => (
              <div key={trip.id} className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    TR{String(i + 1).padStart(3, "0")}
                  </span>
                  <StatusBadge status={trip.status} />
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Vehicle:</span>{" "}
                  {trip.vehicles?.name_model ?? "—"}
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Driver:</span>{" "}
                  {trip.drivers?.name ?? "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {trip.status === "Dispatched"
                    ? "In transit"
                    : trip.status === "Draft"
                      ? "Awaiting dispatch"
                      : "—"}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
