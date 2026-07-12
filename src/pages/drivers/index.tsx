import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function DriversPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Drivers & Safety Profiles</h1>
      <EmptyState
        icon={<Users className="size-6 text-muted-foreground" />}
        title="Driver management coming in Phase 2"
        description="Driver profiles, license tracking, safety scores, and compliance monitoring will be built here."
      />
    </div>
  );
}
