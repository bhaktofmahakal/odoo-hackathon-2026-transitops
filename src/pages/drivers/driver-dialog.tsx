import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { Driver, DriverStatus } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { canWrite } from "@/lib/permissions";
import { toast } from "sonner";
import { Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null; // Null when creating
  onSuccess: () => void;
}

export function DriverDialog({
  open,
  onOpenChange,
  driver,
  onSuccess,
}: DriverDialogProps) {
  const { role } = useAuth();
  // fleet_manager and safety_officer can write/update drivers
  const canEditDrivers =
    role && (canWrite(role, "drivers") || role === "safety_officer");

  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("LMV");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [safetyScore, setSafetyScore] = useState("100");
  const [status, setStatus] = useState<DriverStatus>("Available");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (driver) {
      setName(driver.name);
      setLicenseNumber(driver.license_number);
      setLicenseCategory(driver.license_category);
      setLicenseExpiryDate(driver.license_expiry_date);
      setContactNumber(driver.contact_number || "");
      setSafetyScore(String(driver.safety_score));
      setStatus(driver.status);
    } else {
      setName("");
      setLicenseNumber("");
      setLicenseCategory("LMV");
      // Default to 1 year from now
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setLicenseExpiryDate(nextYear.toISOString().split("T")[0]);
      setContactNumber("");
      setSafetyScore("100");
      setStatus("Available");
    }
    setErrors({});
  }, [driver, open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canEditDrivers) {
      toast.error("You don't have permission to save drivers");
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Driver Name is required";
    if (!licenseNumber.trim())
      newErrors.licenseNumber = "License Number is required";
    if (!licenseCategory.trim())
      newErrors.licenseCategory = "License Category is required";
    if (!licenseExpiryDate)
      newErrors.licenseExpiryDate = "License Expiry Date is required";

    // Parse safety score
    const score = parseFloat(safetyScore);
    if (isNaN(score) || score < 0 || score > 100) {
      newErrors.safetyScore = "Safety Score must be between 0 and 100";
    }

    // Expiry date validation for new driver creation
    if (!driver && licenseExpiryDate) {
      const selectedDate = new Date(licenseExpiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.licenseExpiryDate =
          "License expiry date cannot be in the past for new driver registration";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    const driverData = {
      name: name.trim(),
      license_number: licenseNumber.trim(),
      license_category: licenseCategory.trim(),
      license_expiry_date: licenseExpiryDate,
      contact_number: contactNumber.trim() || null,
      safety_score: score,
      status,
      updated_at: new Date().toISOString(),
    };

    if (driver) {
      // Update
      const { error } = await supabase
        .from("drivers")
        .update(driverData)
        .eq("id", driver.id);

      setSaving(false);

      if (error) {
        if (error.code === "23505") {
          toast.error("License number already exists");
          setErrors({ licenseNumber: "License number already registered" });
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Driver profile updated successfully");
    } else {
      // Create
      const { error } = await supabase.from("drivers").insert([driverData]);

      setSaving(false);

      if (error) {
        if (error.code === "23505") {
          toast.error("License number already exists");
          setErrors({ licenseNumber: "License number already registered" });
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Driver registered successfully");
    }

    onSuccess();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {driver ? "Edit Driver Profile" : "Register Driver"}
          </DialogTitle>
          <DialogDescription>
            {driver
              ? "Update the profile information and status for this driver"
              : "Add a new driver profile to the transport safety and dispatch database"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="Alex Rivera"
              disabled={!canEditDrivers}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.name ? "border-destructive" : "border-input"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                License Number *
              </label>
              <input
                type="text"
                placeholder="DL-88213"
                disabled={!canEditDrivers || !!driver}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                  errors.licenseNumber ? "border-destructive" : "border-input"
                }`}
              />
              {errors.licenseNumber && (
                <p className="text-xs text-destructive">
                  {errors.licenseNumber}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                License Category *
              </label>
              <select
                disabled={!canEditDrivers}
                value={licenseCategory}
                onChange={(e) => setLicenseCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="LMV">LMV (Light Motor Vehicle)</option>
                <option value="HMV">HMV (Heavy Motor Vehicle)</option>
                <option value="MCWG">MCWG (Motorcycle with Gear)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                License Expiry *
              </label>
              <div className="relative flex items-center date-input-premium">
                <input
                  type="date"
                  disabled={!canEditDrivers}
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent pl-3 pr-9 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    errors.licenseExpiryDate
                      ? "border-destructive"
                      : "border-input"
                  }`}
                />
                <Calendar className="absolute right-3 top-2.5 size-4 text-muted-foreground pointer-events-none select-none" />
              </div>
              {errors.licenseExpiryDate && (
                <p className="text-xs text-destructive">
                  {errors.licenseExpiryDate}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Number
              </label>
              <input
                type="text"
                placeholder="9876543210"
                disabled={!canEditDrivers}
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Safety Score *
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  disabled={!canEditDrivers}
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(e.target.value)}
                  className={`flex h-9 w-full rounded-md border bg-transparent pl-3 pr-12 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                    errors.safetyScore ? "border-destructive" : "border-input"
                  }`}
                />
                <span className="absolute right-2.5 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none">
                  / 100
                </span>
              </div>
              {errors.safetyScore && (
                <p className="text-xs text-destructive">{errors.safetyScore}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </label>
              <select
                disabled={!canEditDrivers}
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Available">Available</option>
                <option value="On Trip">On Trip</option>
                <option value="Off Duty">Off Duty</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
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
            {canEditDrivers && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                {driver ? "Save Changes" : "Register Driver"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
