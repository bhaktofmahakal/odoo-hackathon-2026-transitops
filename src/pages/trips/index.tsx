import { EmptyState } from '@/components/ui/empty-state';
import { Route } from 'lucide-react';

export default function TripsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Trip Dispatcher</h1>
      <EmptyState
        icon={<Route className="size-6 text-muted-foreground" />}
        title="Trip management coming in Phase 2"
        description="Create, dispatch, complete, and cancel trips with automatic status cascades and cargo validation."
      />
    </div>
  );
}
