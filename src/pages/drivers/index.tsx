import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Driver } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { canWrite } from '@/lib/permissions';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { DriverDialog } from './driver-dialog';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Edit2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortKey = 'name' | 'license_number' | 'license_category' | 'license_expiry_date' | 'safety_score' | 'status';
type SortOrder = 'asc' | 'desc';

export default function DriversPage() {
  const { role } = useAuth();
  const canEditDrivers = role && (canWrite(role, 'drivers') || role === 'safety_officer');

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('license_expiry_date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*');

    if (error) {
      toast.error('Failed to load drivers', { description: error.message });
      setLoading(false);
      return;
    }

    if (data) {
      setDrivers(data as Driver[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedDriver(null);
    setDialogOpen(true);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Check if license is expired or expiring within 7 days
  const getLicenseStatus = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { isUrgent: true, label: 'EXPIRED', style: 'text-red-500 bg-red-500/10 border-red-500/30' };
    }
    if (diffDays <= 7) {
      return { isUrgent: true, label: 'EXPIRING SOON', style: 'text-amber-500 bg-amber-500/10 border-amber-500/30' };
    }
    return { isUrgent: false, label: '', style: '' };
  };

  // Filter & Sort Logic
  const filteredDrivers = drivers
    .filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.license_number.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue = a[sortKey] ?? '';
      let bValue = b[sortKey] ?? '';

      if (sortKey === 'safety_score') {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return sortOrder === 'asc' ? -1 : 1;
      if (aString > bString) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Sort indicator icon
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="inline size-3.5 ml-1" />
    ) : (
      <ChevronDown className="inline size-3.5 ml-1" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drivers & Safety Profiles</h1>
          <p className="text-sm text-muted-foreground">
            Monitor driver compliance, credentials, and safety metrics across the team.
          </p>
        </div>

        {canEditDrivers && (
          <Button onClick={handleCreate} className="flex items-center gap-1.5 self-start">
            <Plus className="size-4" />
            Add Driver
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search driver name or license..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        {/* Filters Clear */}
        {(searchQuery || statusFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="text-xs text-amber-500 hover:text-amber-400 self-start"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Main List */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          title="No drivers found"
          description={
            searchQuery || statusFilter !== 'all'
              ? 'Try modifying your search or filter options'
              : 'Start by registering your first driver'
          }
          action={
            canEditDrivers && !searchQuery ? (
              <Button onClick={handleCreate} size="sm">
                Add Driver
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                  <th
                    onClick={() => handleSort('name')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Name {renderSortIcon('name')}
                  </th>
                  <th
                    onClick={() => handleSort('license_number')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    License No. {renderSortIcon('license_number')}
                  </th>
                  <th
                    onClick={() => handleSort('license_category')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Category {renderSortIcon('license_category')}
                  </th>
                  <th
                    onClick={() => handleSort('license_expiry_date')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    License Expiry {renderSortIcon('license_expiry_date')}
                  </th>
                  <th className="pb-3 pt-3 px-4">Contact</th>
                  <th
                    onClick={() => handleSort('safety_score')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Safety Score {renderSortIcon('safety_score')}
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Status {renderSortIcon('status')}
                  </th>
                  <th className="pb-3 pt-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredDrivers.map((d) => {
                  const licStatus = getLicenseStatus(d.license_expiry_date);
                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold">{d.name}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{d.license_number}</td>
                      <td className="py-3 px-4 text-muted-foreground">{d.license_category}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">{d.license_expiry_date}</span>
                          {licStatus.isUrgent && (
                            <span
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${licStatus.style}`}
                            >
                              <AlertTriangle className="size-2.5" />
                              {licStatus.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{d.contact_number || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-muted h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                d.safety_score >= 85
                                  ? 'bg-emerald-500'
                                  : d.safety_score >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                              }`}
                              style={{ width: `${d.safety_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold">{d.safety_score}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(d)}
                          className="size-8"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredDrivers.map((d) => {
              const licStatus = getLicenseStatus(d.license_expiry_date);
              return (
                <div key={d.id} className="rounded-xl border bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between border-b pb-2">
                    <div>
                      <h3 className="font-bold text-base leading-none">{d.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Category: {d.license_category} · {d.license_number}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="text-muted-foreground">Expiry:</span>{' '}
                      <span className="font-medium font-mono">{d.license_expiry_date}</span>
                      {licStatus.isUrgent && (
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${licStatus.style}`}
                        >
                          <AlertTriangle className="size-2.5" />
                          {licStatus.label}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact:</span>{' '}
                      <span className="font-medium font-mono">{d.contact_number || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Safety Score:</span>{' '}
                      <span className="font-semibold">{d.safety_score}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end border-t pt-2 mt-1">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(d)}>
                      Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Dialog */}
      <DriverDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driver={selectedDriver}
        onSuccess={fetchDrivers}
      />
    </div>
  );
}
