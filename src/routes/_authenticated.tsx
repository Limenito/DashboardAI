import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Wait until the auth state has been resolved
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Only redirect once auth is fully resolved and there's no session
  if (!session) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} replace />;
  }

  return <Outlet />;
}
