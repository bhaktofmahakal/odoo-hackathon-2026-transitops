import { EmptyState } from '@/components/ui/empty-state';
import { Wrench } from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Maintenance</h1>
      <EmptyState
        icon={<Wrench className="size-6 text-muted-foreground" />}
        title="Maintenance logging coming in Phase 2"
        description="Service records, automatic vehicle status changes, and cost tracking will be built here."
      />
    </div>
  );
}
