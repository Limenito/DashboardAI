import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "Iniciar sesión — IA Dashboard" },
      { name: "description", content: "Accede a tu cuenta para analizar tus archivos Excel." },
    ],
  }),
  component: LoginPage,
});

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Tu correo no está confirmado. Revisa tu bandeja o reenvía el email de confirmación.";
  if (m.includes("user already registered")) return "Ya existe una cuenta con este email. Inicia sesión.";
  if (m.includes("weak_password") || m.includes("weak password"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres con mayúsculas, números y símbolos.";
  if (m.includes("password should be at least")) return "La contraseña debe tener al menos 8 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (m.includes("pwned")) return "Esta contraseña aparece en filtraciones públicas. Elige otra más segura.";
  return message;
}

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Z]/.test(password)) return "Debe incluir al menos una mayúscula.";
  if (!/[0-9]/.test(password)) return "Debe incluir al menos un número.";
  return null;
}

function LoginPage() {
  const { session, signIn, signUp, loading } = useAuth();
  const search = Route.useSearch();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);

  // If already authenticated, redirect away declaratively.
  // Using <Navigate /> instead of useEffect+navigate avoids the render→effect
  // ping-pong that caused the login page to "reload" itself after sign-in.
  if (!loading && session) {
    return <Navigate to={search.redirect || "/"} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNeedsConfirm(false);
    setSubmitting(true);
    try {
      if (tab === "login") {
        await signIn(email, password);
        toast.success("Sesión iniciada");
      } else {
        const strengthError = validatePasswordStrength(password);
        if (strengthError) {
          toast.error(strengthError);
          setSubmitting(false);
          return;
        }
        await signUp(email, password);
        toast.success("Cuenta creada correctamente.");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Error de autenticación";
      const translated = translateAuthError(raw);
      toast.error(translated);
      if (raw.toLowerCase().includes("email not confirmed")) {
        setNeedsConfirm(true);
      }
      if (raw.toLowerCase().includes("user already registered")) {
        setTab("login");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email) {
      toast.error("Introduce tu email primero.");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
      toast.success("Email de confirmación reenviado.");
    } catch (err) {
      toast.error(err instanceof Error ? translateAuthError(err.message) : "No se pudo reenviar el email.");
    } finally {
      setResending(false);
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
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>Inicia sesión o crea una cuenta para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => { setTab(v as "login" | "signup"); setNeedsConfirm(false); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={tab === "login" ? "current-password" : "new-password"}
                      required
                      minLength={tab === "signup" ? 8 : 6}
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
                  {tab === "signup" && (
                    <p className="text-xs text-muted-foreground">
                      Mínimo 8 caracteres, con una mayúscula y un número.
                    </p>
                  )}
                </div>

                {tab === "login" && (
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                )}

                {needsConfirm && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                  >
                    {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Reenviar email de confirmación
                  </Button>
                )}

                <TabsContent value="login" className="m-0">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Iniciar sesión
                  </Button>
                </TabsContent>
                <TabsContent value="signup" className="m-0">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Crear cuenta
                  </Button>
                </TabsContent>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
