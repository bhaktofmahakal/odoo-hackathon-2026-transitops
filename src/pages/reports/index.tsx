import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics & Reports</h1>
      <EmptyState
        icon={<BarChart3 className="size-6 text-muted-foreground" />}
        title="Reports & analytics coming in Phase 3"
        description="Fuel efficiency, fleet utilization, operational costs, vehicle ROI, CSV and PDF exports."
      />
    </div>
  );
}
