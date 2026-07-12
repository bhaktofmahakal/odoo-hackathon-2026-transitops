import type { Trip } from '@/lib/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Route } from 'lucide-react';

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
        <div className="overflow-x-auto">
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
                <tr key={trip.id} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3 pr-4 font-medium">
                    TR{String(i + 1).padStart(3, '0')}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {trip.vehicles?.name_model ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {trip.drivers?.name ?? '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={trip.status} />
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {trip.status === 'Dispatched'
                      ? 'In transit'
                      : trip.status === 'Draft'
                        ? 'Awaiting dispatch'
                        : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
