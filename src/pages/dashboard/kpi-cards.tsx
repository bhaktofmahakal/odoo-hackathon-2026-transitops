import type { DashboardKPIs } from '@/lib/types';
import {
  Truck,
  CheckCircle,
  Wrench,
  Route,
  Clock,
  Users,
  Gauge,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface KPICardData {
  label: string;
  key: keyof DashboardKPIs;
  icon: LucideIcon;
  suffix?: string;
  color: string;
}

const KPI_CONFIG: KPICardData[] = [
  {
    label: 'ACTIVE VEHICLES',
    key: 'vehicles_active',
    icon: Truck,
    color: 'text-blue-400',
  },
  {
    label: 'AVAILABLE VEHICLES',
    key: 'vehicles_available',
    icon: CheckCircle,
    color: 'text-emerald-400',
  },
  {
    label: 'VEHICLES IN MAINTENANCE',
    key: 'vehicles_in_maintenance',
    icon: Wrench,
    color: 'text-orange-400',
  },
  {
    label: 'ACTIVE TRIPS',
    key: 'trips_active',
    icon: Route,
    color: 'text-blue-400',
  },
  {
    label: 'PENDING TRIPS',
    key: 'trips_pending',
    icon: Clock,
    color: 'text-yellow-400',
  },
  {
    label: 'DRIVERS ON DUTY',
    key: 'drivers_on_duty',
    icon: Users,
    color: 'text-blue-400',
  },
  {
    label: 'FLEET UTILIZATION',
    key: 'fleet_utilization_pct',
    icon: Gauge,
    suffix: '%',
    color: 'text-emerald-400',
  },
];

interface KPICardsProps {
  kpis: DashboardKPIs;
}

export function KPICards({ kpis }: KPICardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
      {KPI_CONFIG.map((cfg) => {
        const Icon = cfg.icon;
        const value = kpis[cfg.key];
        const displayValue =
          value === null || value === undefined
            ? '—'
            : `${value}${cfg.suffix ?? ''}`;

        return (
          <div
            key={cfg.key}
            className="rounded-xl border bg-card p-4 transition-colors hover:border-amber-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`size-4 ${cfg.color}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                {cfg.label}
              </span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {displayValue}
            </p>
          </div>
        );
      })}
    </div>
  );
}
