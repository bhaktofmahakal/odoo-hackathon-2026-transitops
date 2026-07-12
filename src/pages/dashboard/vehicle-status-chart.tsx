import { CardSkeleton } from '@/components/ui/loading-skeleton';
import type { VehicleStatus } from '@/lib/types';

// Colors matching PRD Section 10
const STATUS_COLORS: Record<VehicleStatus, string> = {
  Available: '#34d399',
  'On Trip': '#60a5fa',
  'In Shop': '#fb923c',
  Retired: '#f87171',
};

const STATUS_ORDER: VehicleStatus[] = ['Available', 'On Trip', 'In Shop', 'Retired'];

interface VehicleStatusChartProps {
  counts: Record<string, number>;
  loading: boolean;
}

export function VehicleStatusChart({ counts, loading }: VehicleStatusChartProps) {
  if (loading) {
    return <CardSkeleton className="h-64" />;
  }

  const data = STATUS_ORDER.map((status) => ({
    status,
    count: counts[status] ?? 0,
    fill: STATUS_COLORS[status],
  }));

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Vehicle Status
      </h3>

      {/* Visual bars matching mockup's horizontal bar chart style */}
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.status} className="flex items-center gap-3">
            <span className="w-16 text-sm text-muted-foreground">{item.status}</span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{
                  width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%`,
                  backgroundColor: item.fill,
                  minWidth: item.count > 0 ? '8px' : '0',
                }}
              />
            </div>
            <span className="w-8 text-right text-sm font-medium tabular-nums">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
