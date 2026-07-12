import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Vehicle } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { canWrite } from '@/lib/permissions';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { VehicleDialog } from './vehicle-dialog';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type SortKey = 'registration_number' | 'name_model' | 'type' | 'max_load_capacity' | 'odometer' | 'acquisition_cost' | 'status' | 'region';
type SortOrder = 'asc' | 'desc';

export default function VehiclesPage() {
  const { role } = useAuth();
  const isManager = role && canWrite(role, 'vehicles');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [regionFilter, setRegionFilter] = useState<string>('all');

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>('registration_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Unique list of types and regions from vehicles for dynamic filters
  const [typesList, setTypesList] = useState<string[]>([]);
  const [regionsList, setRegionsList] = useState<string[]>([]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*');

    if (error) {
      toast.error('Failed to load vehicles', { description: error.message });
      setLoading(false);
      return;
    }

    if (data) {
      const vData = data as Vehicle[];
      setVehicles(vData);

      // Extract unique types and regions for filters
      const types = Array.from(new Set(vData.map((v) => v.type).filter(Boolean))) as string[];
      const regions = Array.from(new Set(vData.map((v) => v.region).filter(Boolean))) as string[];
      setTypesList(types);
      setRegionsList(regions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedVehicle(null);
    setDialogOpen(true);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!isManager) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete vehicle ${vehicle.registration_number}? Alternatively, you can edit it and set its status to "Retired".`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicle.id);

    if (error) {
      toast.error('Failed to delete vehicle', {
        description: error.message,
      });
      return;
    }

    toast.success('Vehicle deleted successfully');
    fetchVehicles();
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Filter & Sort Logic
  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        v.registration_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name_model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesType = typeFilter === 'all' || v.type === typeFilter;
      const matchesRegion =
        regionFilter === 'all' ||
        (regionFilter === 'empty' && !v.region) ||
        v.region === regionFilter;

      return matchesSearch && matchesStatus && matchesType && matchesRegion;
    })
    .sort((a, b) => {
      let aValue = a[sortKey] ?? '';
      let bValue = b[sortKey] ?? '';

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
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
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Registry</h1>
          <p className="text-sm text-muted-foreground">
            Manage fleet vehicles, tracking lifecycle, status, and registration documents.
          </p>
        </div>

        {isManager && (
          <Button onClick={handleCreate} className="flex items-center gap-1.5 self-start">
            <Plus className="size-4" />
            Add Vehicle
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
              placeholder="Search registration or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Types</option>
            {typesList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Regions</option>
            <option value="empty">Unassigned Region</option>
            {regionsList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Filters Clear / Indicator */}
        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || regionFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setTypeFilter('all');
              setRegionFilter('all');
            }}
            className="text-xs text-amber-500 hover:text-amber-400 self-start"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Main List */}
      {loading ? (
        <TableSkeleton rows={6} columns={8} />
      ) : filteredVehicles.length === 0 ? (
        <EmptyState
          title="No vehicles found"
          description={
            searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || regionFilter !== 'all'
              ? 'Try modifying your search or filter options'
              : 'Start by registering your first vehicle'
          }
          action={
            isManager && !searchQuery ? (
              <Button onClick={handleCreate} size="sm">
                Add Vehicle
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
                    onClick={() => handleSort('registration_number')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Reg. No {renderSortIcon('registration_number')}
                  </th>
                  <th
                    onClick={() => handleSort('name_model')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Name/Model {renderSortIcon('name_model')}
                  </th>
                  <th
                    onClick={() => handleSort('type')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Type {renderSortIcon('type')}
                  </th>
                  <th
                    onClick={() => handleSort('max_load_capacity')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Capacity {renderSortIcon('max_load_capacity')}
                  </th>
                  <th
                    onClick={() => handleSort('odometer')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Odometer {renderSortIcon('odometer')}
                  </th>
                  <th
                    onClick={() => handleSort('acquisition_cost')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Acq. Cost {renderSortIcon('acquisition_cost')}
                  </th>
                  <th
                    onClick={() => handleSort('region')}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Region {renderSortIcon('region')}
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
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold">{v.registration_number}</td>
                    <td className="py-3 px-4 text-muted-foreground">{v.name_model}</td>
                    <td className="py-3 px-4 text-muted-foreground">{v.type}</td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {v.max_load_capacity.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {v.odometer.toLocaleString()} km
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      ${v.acquisition_cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{v.region || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.document_url && (
                          <a
                            href={v.document_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="View Document"
                          >
                            <FileText className="size-4" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(v)}
                          className="size-8"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(v)}
                            className="size-8 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredVehicles.map((v) => (
              <div key={v.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-base leading-none">
                      {v.registration_number}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {v.name_model} · {v.type}
                    </p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>

                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Capacity:</span>{' '}
                    <span className="font-medium font-mono">{v.max_load_capacity} kg</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Odometer:</span>{' '}
                    <span className="font-medium font-mono">{v.odometer} km</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acq. Cost:</span>{' '}
                    <span className="font-medium font-mono">${v.acquisition_cost}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region:</span>{' '}
                    <span className="font-medium">{v.region || '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-2 mt-1">
                  <div>
                    {v.document_url && (
                      <a
                        href={v.document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium hover:underline"
                      >
                        <FileText className="size-3.5" />
                        View Document
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(v)}>
                      Edit
                    </Button>
                    {isManager && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(v)}
                        className="text-destructive border-destructive/30 hover:bg-destructive/5"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dialog */}
      <VehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vehicle={selectedVehicle}
        onSuccess={fetchVehicles}
      />
    </div>
  );
}
