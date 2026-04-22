import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — IA Dashboard" },
      { name: "description", content: "Accede a tu historial de análisis." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("Sesión iniciada");
      } else {
        await signUp(email, password);
        toast.success("Cuenta creada. Ya puedes empezar.");
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de autenticación";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">IA Dashboard</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Accede a tu historial de análisis."
                : "Guarda tus análisis y vuelve cuando quieras."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "signin" ? "Entrar" : "Crear cuenta"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin"
                ? "¿No tienes cuenta? Regístrate"
                : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
