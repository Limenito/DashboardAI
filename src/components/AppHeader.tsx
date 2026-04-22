import { Link } from "@tanstack/react-router";
import { BarChart3, History, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">IA Dashboard</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/history">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">Historial</span>
            </Link>
          </Button>
          <div className="ml-2 hidden text-xs text-muted-foreground md:block">{user?.email}</div>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
