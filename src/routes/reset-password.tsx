import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — IA Dashboard" },
      { name: "description", content: "Define una nueva contraseña para tu cuenta." },
    ],
  }),
  component: ResetPasswordPage,
});

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe incluir al menos una mayúscula.";
  if (!/[0-9]/.test(password)) return "Debe incluir al menos un número.";
  return null;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and emits a PASSWORD_RECOVERY event
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check existing session in case the event already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      toast.error(strengthError);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Contraseña actualizada.");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">IA Dashboard</span>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>Define una nueva contraseña para tu cuenta.</CardDescription>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, con una mayúscula y un número.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirmar contraseña</Label>
                  <Input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Actualizar contraseña
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
