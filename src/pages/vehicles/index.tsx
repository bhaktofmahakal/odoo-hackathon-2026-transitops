import { EmptyState } from '@/components/ui/empty-state';
import { Truck } from 'lucide-react';

export default function VehiclesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fleet Registry</h1>
      <EmptyState
        icon={<Truck className="size-6 text-muted-foreground" />}
        title="Vehicle management coming in Phase 2"
        description="CRUD operations for vehicle registration, status management, and document uploads will be built here."
      />
    </div>
  );
}
