import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import type { Trip } from '@/lib/types';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip | null;
  onSuccess: () => void;
}

export function TripDialog({ open, onOpenChange, trip, onSuccess }: TripDialogProps) {
  const [finalOdometer, setFinalOdometer] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [revenue, setRevenue] = useState('');

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFinalOdometer('');
    setFuelConsumed('');
    setFuelCost('');
    setRevenue('');
    setErrors({});
  }, [trip, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trip) return;

    const newErrors: Record<string, string> = {};
    const odo = parseFloat(finalOdometer);
    const fuel = parseFloat(fuelConsumed);
    const cost = parseFloat(fuelCost);
    const rev = parseFloat(revenue);

    if (isNaN(odo) || odo <= 0) {
      newErrors.finalOdometer = 'Final Odometer is required and must be positive';
    }

    if (isNaN(fuel) || fuel < 0) {
      newErrors.fuelConsumed = 'Fuel Consumed is required and must be non-negative';
    }

    if (isNaN(cost) || cost < 0) {
      newErrors.fuelCost = 'Fuel Cost is required and must be non-negative';
    }

    if (isNaN(rev) || rev < 0) {
      newErrors.revenue = 'Revenue must be a non-negative number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      // 1. Update trip status to Completed
      const { error: tripError } = await supabase
        .from('trips')
        .update({
          status: 'Completed',
          final_odometer: odo,
          fuel_consumed: fuel,
          revenue: rev,
          completed_at: new Date().toISOString(),
        })
        .eq('id', trip.id);

      if (tripError) {
        throw new Error(tripError.message);
      }

      // 2. Insert fuel log record
      const { error: fuelError } = await supabase
        .from('fuel_logs')
        .insert([
          {
            vehicle_id: trip.vehicle_id,
            trip_id: trip.id,
            liters: fuel,
            cost: cost,
            log_date: new Date().toISOString().split('T')[0],
          },
        ]);

      if (fuelError) {
        // If fuel log insertion fails, we report it but don't revert the trip status
        toast.warning('Trip completed, but failed to log fuel consumption automatically.', {
          description: fuelError.message,
        });
      } else {
        toast.success('Trip completed and fuel logged successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error('Failed to complete trip', { description: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Complete Trip</DialogTitle>
          <DialogDescription>
            Enter final trip details to release the vehicle and driver as Available.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Final Odometer (km) *
            </label>
            <input
              type="number"
              placeholder="e.g. 74500"
              value={finalOdometer}
              onChange={(e) => setFinalOdometer(e.target.value)}
              className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.finalOdometer ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.finalOdometer && <p className="text-xs text-destructive">{errors.finalOdometer}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fuel Consumed (L) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 45"
                value={fuelConsumed}
                onChange={(e) => setFuelConsumed(e.target.value)}
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.fuelConsumed ? 'border-destructive' : 'border-input'
                }`}
              />
              {errors.fuelConsumed && <p className="text-xs text-destructive">{errors.fuelConsumed}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Fuel Cost ($) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 60"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.fuelCost ? 'border-destructive' : 'border-input'
                }`}
              />
              {errors.fuelCost && <p className="text-xs text-destructive">{errors.fuelCost}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Revenue ($) *
            </label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.revenue ? 'border-destructive' : 'border-input'
              }`}
            />
            {errors.revenue && <p className="text-xs text-destructive">{errors.revenue}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Complete Trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
