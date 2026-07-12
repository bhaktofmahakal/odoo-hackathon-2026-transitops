import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { PageSkeleton } from "@/components/ui/loading-skeleton";

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PageSkeleton />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
