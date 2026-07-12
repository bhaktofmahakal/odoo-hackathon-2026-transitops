import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MaintenanceLog, Vehicle } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { canWrite } from '@/lib/permissions';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading-skeleton';
import { MaintenanceDialog } from './maintenance-dialog';
import { toast } from 'sonner';
import { Wrench, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MaintenancePage() {
  const { role } = useAuth();
  const isManager = role && canWrite(role, 'maintenance');

  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchLogsAndVehicles = async () => {
    setLoading(true);

    // 1. Fetch maintenance logs with vehicle registration
    const { data: logData, error: logError } = await supabase
      .from('maintenance_logs')
      .select('*, vehicles(registration_number, name_model)')
      .order('opened_at', { ascending: false });

    if (logError) {
      toast.error('Failed to load maintenance logs', { description: logError.message });
    } else if (logData) {
      setLogs(logData as MaintenanceLog[]);
    }

    // 2. Fetch all vehicles to populate filter
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('*')
      .order('registration_number');

    if (vehicleData) {
      setVehicles(vehicleData as Vehicle[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLogsAndVehicles();
  }, []);

  async function handleCloseMaintenance(logId: string) {
    if (!isManager) return;

    const confirmed = window.confirm(
      'Are you sure you want to Close this maintenance record? This will release the vehicle back to Available and log the expense automatically.'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .update({ status: 'Closed', closed_at: new Date().toISOString() })
        .eq('id', logId);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Maintenance closed successfully. Expense recorded.');
      fetchLogsAndVehicles();
    } catch (err: any) {
      toast.error('Failed to close maintenance', { description: err.message });
    }
  }

  // Filter Logic
  const filteredLogs = logs.filter((log) => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || log.vehicle_id === vehicleFilter;
    return matchesStatus && matchesVehicle;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Logs</h1>
          <p className="text-sm text-muted-foreground">
            Track and record fleet maintenance logs, costs, and service schedules.
          </p>
        </div>

        {isManager && (
          <Button onClick={() => setDialogOpen(true)} className="flex items-center gap-1.5 self-start">
            <Plus className="size-4" />
            Log Maintenance
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card border rounded-xl p-4">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Closed">Closed</option>
        </select>

        {/* Vehicle Filter */}
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name_model} ({v.registration_number})
            </option>
          ))}
        </select>

        {(statusFilter !== 'all' || vehicleFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setVehicleFilter('all');
            }}
            className="text-xs text-amber-500 hover:text-amber-400 self-start"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* List content */}
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<Wrench className="size-6 text-muted-foreground" />}
          title="No maintenance logs found"
          description={
            statusFilter !== 'all' || vehicleFilter !== 'all'
              ? 'Try modifying your filter settings'
              : 'Add your first maintenance log to get started'
          }
          action={
            isManager && statusFilter === 'all' && vehicleFilter === 'all' ? (
              <Button onClick={() => setDialogOpen(true)} size="sm">
                Log Maintenance
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
                  <th className="pb-3 pt-3 px-4">Vehicle</th>
                  <th className="pb-3 pt-3 px-4">Description</th>
                  <th className="pb-3 pt-3 px-4">Cost</th>
                  <th className="pb-3 pt-3 px-4">Opened Date</th>
                  <th className="pb-3 pt-3 px-4">Closed Date</th>
                  <th className="pb-3 pt-3 px-4">Status</th>
                  {isManager && <th className="pb-3 pt-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold">
                      {log.vehicles?.name_model ?? '—'}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({log.vehicles?.registration_number ?? '—'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-sm truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-foreground">
                      ${log.cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {new Date(log.opened_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {log.closed_at ? new Date(log.closed_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={log.status} />
                    </td>
                    {isManager && (
                      <td className="py-3 px-4 text-right">
                        {log.status === 'Active' && (
                          <Button
                            size="sm"
                            onClick={() => handleCloseMaintenance(log.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                          >
                            <CheckCircle className="size-3.5 mr-1" />
                            Close
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between border-b pb-2">
                  <div>
                    <h3 className="font-bold text-base leading-none">
                      {log.vehicles?.name_model ?? 'Vehicle'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.vehicles?.registration_number ?? '—'}
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>

                <p className="text-xs text-muted-foreground">{log.description}</p>

                <div className="grid grid-cols-2 gap-y-2 text-xs border-t pt-2 mt-1">
                  <div>
                    <span className="text-muted-foreground">Cost:</span>{' '}
                    <span className="font-semibold font-mono">${log.cost}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opened:</span>{' '}
                    <span className="font-medium font-mono">
                      {new Date(log.opened_at).toLocaleDateString()}
                    </span>
                  </div>
                  {log.closed_at && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Closed:</span>{' '}
                      <span className="font-medium font-mono">
                        {new Date(log.closed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {isManager && log.status === 'Active' && (
                  <div className="flex items-center justify-end border-t pt-2 mt-1">
                    <Button
                      size="sm"
                      onClick={() => handleCloseMaintenance(log.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 w-full"
                    >
                      <CheckCircle className="size-3.5 mr-1" />
                      Close Maintenance
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dialog */}
      <MaintenanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchLogsAndVehicles}
      />
    </div>
  );
}
