import { EmptyState } from '@/components/ui/empty-state';
import { Fuel } from 'lucide-react';

export default function FuelExpensesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Fuel & Expenses</h1>
      <EmptyState
        icon={<Fuel className="size-6 text-muted-foreground" />}
        title="Fuel & expense tracking coming in Phase 3"
        description="Fuel logs, toll expenses, per-vehicle cost breakdowns, and operational cost calculations."
      />
    </div>
  );
}
