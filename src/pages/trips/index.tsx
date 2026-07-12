import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Trip, Vehicle, Driver } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { canWrite } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { TripDialog } from "./trip-dialog";
import { toast } from "sonner";
import {
  Trash2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Helper to map DB trigger exceptions to friendly text
function parseTriggerException(message: string): string {
  if (message.includes("Vehicle is not available")) {
    return "The selected vehicle is currently not Available (e.g. on another trip or in maintenance).";
  }
  if (message.includes("Driver is not available")) {
    return "The selected driver is currently not Available (e.g. on another trip or off-duty).";
  }
  if (message.includes("Driver license has expired")) {
    return "License Compliance: The selected driver's license is expired.";
  }
  if (message.includes("exceeds vehicle max capacity")) {
    return "Overload: Cargo weight exceeds the vehicle's maximum load capacity limit.";
  }
  if (message.includes("already has an active dispatched trip")) {
    return "Double Booking: The vehicle or driver is already assigned to another active Dispatched trip.";
  }
  return message;
}

export default function TripsPage() {
  const { role, profile } = useAuth();
  const isAuthorized = role && (canWrite(role, "trips") || role === "driver");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");

  // Selected vehicle metadata for capacity validation
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Completion dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [activeTripForCompletion, setActiveTripForCompletion] =
    useState<Trip | null>(null);

  // Tab filters
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Draft" | "Dispatched" | "Completed" | "Cancelled"
  >("All");

  const fetchTripsAndResources = async () => {
    setLoading(true);

    // 1. Fetch all trips
    const { data: tripData, error: tripError } = await supabase
      .from("trips")
      .select("*, vehicles(registration_number, name_model), drivers(name)")
      .order("created_at", { ascending: false });

    if (tripError) {
      toast.error("Failed to load trips", { description: tripError.message });
    } else if (tripData) {
      setTrips(tripData as Trip[]);
    }

    // 2. Fetch Available Vehicles
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("status", "Available");

    if (vehicleData) {
      setAvailableVehicles(vehicleData as Vehicle[]);
    }

    // 3. Fetch Available and Complying Drivers (Available and license not expired)
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: driverData } = await supabase
      .from("drivers")
      .select("*")
      .eq("status", "Available")
      .gte("license_expiry_date", todayStr);

    if (driverData) {
      setAvailableDrivers(driverData as Driver[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTripsAndResources();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      const v = availableVehicles.find(
        (vehicle) => vehicle.id === selectedVehicleId,
      );
      setSelectedVehicle(v || null);
    } else {
      setSelectedVehicle(null);
    }
  }, [selectedVehicleId, availableVehicles]);

  // Live Capacity Check variables
  const parsedCargo = parseFloat(cargoWeight);
  const isOverload =
    selectedVehicle &&
    !isNaN(parsedCargo) &&
    parsedCargo > selectedVehicle.max_load_capacity;
  const capacityDiff =
    selectedVehicle && !isNaN(parsedCargo)
      ? parsedCargo - selectedVehicle.max_load_capacity
      : 0;

  async function handleCreateTrip(saveAsDraft: boolean) {
    if (!isAuthorized) {
      toast.error("You don't have permission to perform this action");
      return;
    }

    if (
      !source.trim() ||
      !destination.trim() ||
      !selectedVehicleId ||
      !selectedDriverId ||
      !cargoWeight ||
      !plannedDistance
    ) {
      toast.error("Please fill in all fields before submitting");
      return;
    }

    const weight = parseFloat(cargoWeight);
    const dist = parseFloat(plannedDistance);

    if (isNaN(weight) || weight <= 0) {
      toast.error("Cargo weight must be a positive number");
      return;
    }

    if (isNaN(dist) || dist <= 0) {
      toast.error("Planned distance must be a positive number");
      return;
    }

    const initialStatus = saveAsDraft ? "Draft" : "Dispatched";

    try {
      // Create trip row
      const { error } = await supabase.from("trips").insert([
        {
          source: source.trim(),
          destination: destination.trim(),
          vehicle_id: selectedVehicleId,
          driver_id: selectedDriverId,
          cargo_weight: weight,
          planned_distance: dist,
          status: initialStatus,
          created_by: profile?.id || null,
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      // If we directly dispatched, let's reload all resources
      toast.success(
        saveAsDraft
          ? "Trip saved successfully as Draft"
          : "Trip created and Dispatched successfully",
      );

      // Reset form fields
      setSource("");
      setDestination("");
      setSelectedVehicleId("");
      setSelectedDriverId("");
      setCargoWeight("");
      setPlannedDistance("");

      fetchTripsAndResources();
    } catch (err: any) {
      const friendlyMessage = parseTriggerException(err.message);
      toast.error("Trip operation failed", { description: friendlyMessage });
    }
  }

  async function handleDispatch(trip: Trip) {
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "Dispatched" })
        .eq("id", trip.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Trip successfully Dispatched");
      fetchTripsAndResources();
    } catch (err: any) {
      const friendlyMessage = parseTriggerException(err.message);
      toast.error("Dispatch failed", { description: friendlyMessage });
    }
  }

  async function handleCancel(trip: Trip) {
    const confirmed = window.confirm(
      "Are you sure you want to Cancel this trip? This will release the vehicle and driver back to Available.",
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "Cancelled" })
        .eq("id", trip.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Trip cancelled successfully");
      fetchTripsAndResources();
    } catch (err: any) {
      toast.error("Failed to cancel trip", { description: err.message });
    }
  }

  async function handleDeleteDraft(tripId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this Draft trip?",
    );
    if (!confirmed) return;

    const { error } = await supabase.from("trips").delete().eq("id", tripId);

    if (error) {
      toast.error("Failed to delete Draft trip", {
        description: error.message,
      });
      return;
    }

    toast.success("Draft trip deleted");
    fetchTripsAndResources();
  }

  function openCompletion(trip: Trip) {
    setActiveTripForCompletion(trip);
    setCompleteDialogOpen(true);
  }

  // Filtered trips list for Live Board
  const filteredTrips = trips.filter((t) => {
    if (statusFilter === "All") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Left side — Create Panel (Gated) */}
      <div className="w-full lg:w-[380px] border-r bg-card flex flex-col overflow-y-auto p-6 flex-shrink-0">
        <div className="mb-6">
          <h2 className="text-lg font-bold tracking-tight">Create Trip</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Dispatch vehicles or save schedules as draft templates.
          </p>
        </div>

        {isAuthorized ? (
          <div className="space-y-4">
            {/* Trip Lifecycle Progress */}
            <div className="rounded-lg border bg-muted/40 p-3">
              <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-3">
                Trip Lifecycle
              </h3>
              <div className="flex items-center gap-1">
                {["Draft", "Dispatched", "Completed"].map((stage, i) => (
                  <div key={stage} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width:
                              stage === "Draft"
                                ? "100%"
                                : stage === "Dispatched"
                                  ? "30%"
                                  : "0%",
                            backgroundColor:
                              stage === "Draft"
                                ? "#34d399"
                                : stage === "Dispatched"
                                  ? "#60a5fa"
                                  : "#a1a1aa",
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-medium text-muted-foreground mt-1.5">
                        {stage}
                      </span>
                    </div>
                    {i < 2 && (
                      <ArrowRight className="size-3 text-muted-foreground mx-1 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Source Location *
              </label>
              <input
                type="text"
                placeholder="Gandhinagar Depot"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Destination Location *
              </label>
              <input
                type="text"
                placeholder="Ahmedabad Hub"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Vehicle (Available only) *
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a Vehicle</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name_model} ({v.registration_number}) · Cap:{" "}
                    {v.max_load_capacity}kg
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Driver (Available only) *
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a Driver</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · Score: {d.safety_score}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cargo Weight *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="absolute right-2.5 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none">
                    kg
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Distance *
                </label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    placeholder="e.g. 35"
                    value={plannedDistance}
                    onChange={(e) => setPlannedDistance(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-9 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <span className="absolute right-2.5 text-[10px] font-bold text-muted-foreground uppercase pointer-events-none select-none">
                    km
                  </span>
                </div>
              </div>
            </div>

            {/* Capacity validation warning banner */}
            {selectedVehicle && (
              <div className="rounded-lg border p-3 bg-muted/40">
                <div className="flex justify-between text-xs text-muted-foreground font-medium mb-1">
                  <span>Vehicle Capacity:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedVehicle.max_load_capacity} kg
                  </span>
                </div>
                {isOverload ? (
                  <div className="flex items-start gap-1.5 text-xs text-red-500 font-medium">
                    <AlertTriangle className="size-3.5 flex-shrink-0 mt-0.5" />
                    <span>
                      Capacity exceeded by {capacityDiff} kg — dispatch blocked
                    </span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground">
                    Cargo weight is within the limits of the vehicle load
                    capacity.
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                onClick={() => handleCreateTrip(false)}
                disabled={isOverload || !selectedVehicleId}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <Play className="size-4" />
                {isOverload ? "Dispatch (blocked)" : "Dispatch"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCreateTrip(true)}
                className="w-full flex items-center justify-center gap-1.5"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Read-only mode"
            description="Drivers and Fleet Managers only are permitted to schedule or dispatch trips."
            className="p-6 border-dashed"
          />
        )}
      </div>

      {/* Right side — Live Board */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header and status tabs */}
        <div className="border-b p-6 flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Live Board</h1>
            <p className="text-xs text-muted-foreground">
              Monitor dispatch statuses and active cargo flows.
            </p>
          </div>

          <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
            {(
              ["All", "Draft", "Dispatched", "Completed", "Cancelled"] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Live List content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : filteredTrips.length === 0 ? (
            <EmptyState
              title={`No ${statusFilter === "All" ? "" : statusFilter.toLowerCase()} trips found`}
              description="Trips dispatched or saved will appear here on the operations board."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTrips.map((trip, idx) => (
                <div
                  key={trip.id}
                  className="rounded-xl border bg-card p-4 space-y-4 hover:border-amber-500/20 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between border-b pb-2">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                        TRIP TR{String(trips.length - idx).padStart(3, "0")}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 font-semibold text-sm">
                        <span>{trip.source}</span>
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        <span>{trip.destination}</span>
                      </div>
                    </div>
                    <StatusBadge status={trip.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Vehicle:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {trip.vehicles?.name_model || "Unassigned"} (
                        {trip.vehicles?.registration_number || "—"})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Driver:</span>{" "}
                      <span className="font-semibold text-foreground">
                        {trip.drivers?.name || "Unassigned"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Cargo weight:
                      </span>{" "}
                      <span className="font-semibold font-mono">
                        {trip.cargo_weight} kg
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Distance:</span>{" "}
                      <span className="font-semibold font-mono">
                        {trip.planned_distance} km
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  {isAuthorized && (
                    <div className="flex items-center justify-between border-t pt-3 mt-1 text-xs">
                      <div>
                        {trip.status === "Draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDraft(trip.id)}
                            className="text-destructive hover:bg-destructive/10 h-8 px-2"
                          >
                            <Trash2 className="size-3.5 mr-1" />
                            Delete Draft
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {trip.status === "Draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleDispatch(trip)}
                            className="bg-amber-600 hover:bg-amber-700 h-8"
                          >
                            <Play className="size-3.5 mr-1.5" />
                            Dispatch
                          </Button>
                        )}

                        {trip.status === "Dispatched" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancel(trip)}
                              className="text-destructive border-destructive/30 hover:bg-destructive/5 h-8"
                            >
                              <XCircle className="size-3.5 mr-1.5" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openCompletion(trip)}
                              className="bg-emerald-600 hover:bg-emerald-700 h-8"
                            >
                              <CheckCircle2 className="size-3.5 mr-1.5" />
                              Complete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom note */}
      <div className="absolute bottom-0 left-[380px] right-0 bg-background border-t p-4 hidden lg:block">
        <p className="text-xs text-muted-foreground italic">
          On Complete: mileage → Fuel log → expenses → Vehicle & Driver Available
        </p>
      </div>

      {/* Completion Dialog */}
      <TripDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        trip={activeTripForCompletion}
        onSuccess={fetchTripsAndResources}
      />
    </div>
  );
}
