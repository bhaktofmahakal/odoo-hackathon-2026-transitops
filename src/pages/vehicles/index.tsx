import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Vehicle } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { canWrite } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { VehicleDialog } from "./vehicle-dialog";
import { toast } from "sonner";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SortKey =
  | "registration_number"
  | "name_model"
  | "type"
  | "max_load_capacity"
  | "odometer"
  | "acquisition_cost"
  | "status";
type SortOrder = "asc" | "desc";

export default function VehiclesPage() {
  const { role } = useAuth();
  const isManager = role && canWrite(role, "vehicles");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("registration_number");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Unique list of types and regions from vehicles for dynamic filters
  const [typesList, setTypesList] = useState<string[]>([]);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*");

    if (error) {
      toast.error("Failed to load vehicles", { description: error.message });
      setLoading(false);
      return;
    }

    if (data) {
      const vData = data as Vehicle[];
      setVehicles(vData);

      // Extract unique types for filters
      const types = Array.from(
        new Set(vData.map((v) => v.type).filter(Boolean)),
      ) as string[];
      setTypesList(types);
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  // Filter & Sort Logic
  const filteredVehicles = vehicles
    .filter((v) => {
      const matchesSearch =
        v.registration_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        v.name_model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "all" || v.status === statusFilter;
      const matchesType = typeFilter === "all" || v.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      let aValue = a[sortKey] ?? "";
      let bValue = b[sortKey] ?? "";

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (aString < bString) return sortOrder === "asc" ? -1 : 1;
      if (aString > bString) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  // Sort indicator icon
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="inline size-3.5 ml-1" />
    ) : (
      <ChevronDown className="inline size-3.5 ml-1" />
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Vehicle Registry
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage fleet vehicles, tracking lifecycle, status, and registration
            documents.
          </p>
        </div>

        {isManager && (
          <Button
            onClick={handleCreate}
            className="flex items-center gap-1.5 self-start"
          >
            <Plus className="size-4" />
            Add Vehicle
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border rounded-xl p-4">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search reg. no */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reg. no..."
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
        </div>

        {/* Filters Clear / Indicator */}
        {(searchQuery ||
          statusFilter !== "all" ||
          typeFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
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
            searchQuery ||
            statusFilter !== "all" ||
            typeFilter !== "all"
              ? "Try modifying your search or filter options"
              : "Start by registering your first vehicle"
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
                    onClick={() => handleSort("registration_number")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Reg. No {renderSortIcon("registration_number")}
                  </th>
                  <th
                    onClick={() => handleSort("name_model")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Name/Model {renderSortIcon("name_model")}
                  </th>
                  <th
                    onClick={() => handleSort("type")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Type {renderSortIcon("type")}
                  </th>
                  <th
                    onClick={() => handleSort("max_load_capacity")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Capacity {renderSortIcon("max_load_capacity")}
                  </th>
                  <th
                    onClick={() => handleSort("odometer")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Odometer {renderSortIcon("odometer")}
                  </th>
                  <th
                    onClick={() => handleSort("acquisition_cost")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Acq. Cost {renderSortIcon("acquisition_cost")}
                  </th>
                  <th
                    onClick={() => handleSort("status")}
                    className="pb-3 pt-3 px-4 cursor-pointer select-none hover:text-foreground"
                  >
                    Status {renderSortIcon("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold">
                      {v.registration_number}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {v.name_model}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {v.type}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {v.max_load_capacity >= 1000
                        ? `${v.max_load_capacity / 1000} Ton`
                        : `${v.max_load_capacity} kg`}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      {v.odometer.toLocaleString()} km
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono">
                      ${v.acquisition_cost.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredVehicles.map((v) => (
              <div
                key={v.id}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
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
                    <span className="text-muted-foreground">Capacity:</span>{" "}
                    <span className="font-medium font-mono">
                      {v.max_load_capacity >= 1000
                        ? `${v.max_load_capacity / 1000} Ton`
                        : `${v.max_load_capacity} kg`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Odometer:</span>{" "}
                    <span className="font-medium font-mono">
                      {v.odometer} km
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Acq. Cost:</span>{" "}
                    <span className="font-medium font-mono">
                      ${v.acquisition_cost}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end border-t pt-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(v)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Note */}
      {!loading && (
        <p className="text-xs text-muted-foreground mt-4">
          Registration No. must be unique. Retired/In Shop vehicles are hidden
          from Trip Dispatcher.
        </p>
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
