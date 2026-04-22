

# Arreglar el flujo de login

## Diagnóstico

Los logs muestran que el signup funciona (200 OK) pero el usuario **nunca llega a iniciar sesión**. La causa: tu proyecto tiene la confirmación de email **activada** (es lo seguro por defecto), entonces:

- Usuario crea cuenta → recibe `confirmation_sent_at` pero **no hay sesión**.
- Usuario intenta login con email/password → Supabase responde **"Email not confirmed"**.
- Tu UI muestra el error genérico de Supabase en inglés, sin acción clara.
- Usuario no entiende qué hacer.

Además hay mejoras de UX que faltan: no se valida fuerza de contraseña antes de enviar, no se ofrece reenviar email de confirmación, no hay link de "olvidé contraseña", y no hay forma de saltarse la confirmación durante pruebas.

## Cambios

### 1. Activar auto-confirmación de email (modo desarrollo)
Habilitar `enable_confirmations = false` en la config de auth para que las cuentas nuevas inicien sesión inmediatamente sin necesidad de confirmar el correo. Esto desbloquea las pruebas YA. (En producción real lo reactivamos cuando lo pidas.)

### 2. Mejorar `src/routes/login.tsx`
- **Auto-login tras signup exitoso**: si `signUp` devuelve `session` (con auto-confirmación activa), hacer redirect inmediato a `/` en vez de mostrar "revisa tu correo".
- **Mensajes de error en español y accionables**:
  - `Invalid login credentials` → "Email o contraseña incorrectos."
  - `Email not confirmed` → "Tu correo no está confirmado." + botón "Reenviar email de confirmación" (`supabase.auth.resend({ type: 'signup', email })`).
  - `User already registered` → "Ya existe una cuenta con este email. Inicia sesión." + cambiar a la pestaña Login.
  - `weak_password` → "La contraseña es muy débil. Usa al menos 8 caracteres con mayúsculas, números y símbolos."
- **Validación previa en signup**: longitud mínima 8, contiene número y mayúscula. Evita el ida y vuelta al servidor.
- **Link "¿Olvidaste tu contraseña?"** en la pestaña de Login → navega a `/forgot-password`.
- **Toggle mostrar/ocultar contraseña** (icono ojo).

### 3. Página `src/routes/forgot-password.tsx` (nueva, pública)
Form con email → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`. Toast de confirmación.

### 4. Página `src/routes/reset-password.tsx` (nueva, pública)
- Detecta `type=recovery` en el hash de la URL (Supabase lo pone tras click del email).
- Form con nueva contraseña → `supabase.auth.updateUser({ password })`.
- Tras éxito, redirige a `/`.

### 5. Arreglar guard `src/routes/_authenticated.tsx`
Está bien funcionalmente pero dispara navigate dentro de useEffect sin proteger contra re-entradas cuando `loading` cambia. Añadir condición para no navegar si ya estamos en `/login`.

### 6. Mejorar UX del header de auth
En `AppHeader`, mostrar avatar/email del usuario y dropdown con "Cerrar sesión" en vez de solo botón suelto (si aún no está así).

## Lo que NO toco

- Tabla `search_history`, RLS, ni el flujo de análisis.
- Backend FastAPI.
- Estructura de rutas (`_authenticated/*` se mantiene).

## Notas técnicas

- La contraseña `Ricardoes12` que probaste falló con `weak_password` porque está en HaveIBeenPwned (tu proyecto tiene HIBP activo, lo cual es bueno). `Ricardoes12_` sí pasó.
- Tras estos cambios, podrás: crear cuenta y entrar al instante, recuperar contraseña por email, ver errores claros en español.
- Si más adelante quieres exigir confirmación de email en producción, solo dímelo y reactivo `enable_confirmations`.

