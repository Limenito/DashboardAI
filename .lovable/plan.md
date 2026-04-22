

# Historial de búsquedas con autenticación (frontend)

Lovable Cloud ya está activo, la tabla `search_history` existe con RLS correctas (`auth.uid() = user_id` para SELECT/INSERT/DELETE), y el cliente Supabase está generado. Solo queda implementar el frontend.

## Lo que ya está listo (no toco)

- Cliente Supabase: `src/integrations/supabase/client.ts`
- Tabla `search_history` (id, user_id, file_name, row_count, column_count, result jsonb, created_at) con RLS por usuario
- Variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`

## Cambios en el frontend

### 1. Auth context — `src/lib/auth.tsx`
Provider con `useAuth()`: `session`, `user`, `loading`, `signIn`, `signUp`, `signOut`. Usa `onAuthStateChange` **antes** de `getSession()` (orden crítico para evitar race conditions). Inyectado en `__root.tsx` envolviendo `<Outlet />`.

### 2. Rutas nuevas
- `src/routes/login.tsx` — pública. Tabs Login / Signup (email + password). En signup pasa `emailRedirectTo: window.location.origin`. Redirige a `/` (o a `?redirect=...`) tras éxito.
- `src/routes/_authenticated.tsx` — layout pathless. `beforeLoad` redirige a `/login?redirect=<href>` si no hay sesión.

### 3. Mover rutas protegidas
- `src/routes/index.tsx` → `src/routes/_authenticated/index.tsx`
- `src/routes/dashboard.$id.tsx` → `src/routes/_authenticated/dashboard.$id.tsx`
- Nueva: `src/routes/_authenticated/history.tsx` — lista de análisis previos (cards con `file_name`, fecha relativa, `row_count`, primeros KPIs). Cada card abre `/dashboard/$id`. Botón eliminar por fila.

### 4. Header global con sesión
Mini componente `AppHeader` reutilizado en index, dashboard, history: muestra email del usuario, links a "Nuevo análisis" e "Historial", botón "Salir".

### 5. Flujo de análisis (`src/lib/analysis.ts`)
- Antes del `fetch` a `/analyze`, obtener JWT con `supabase.auth.getSession()` y enviarlo como `Authorization: Bearer <jwt>`.
- El backend devolverá `{ id, ...AnalysisResult }` donde `id` es el UUID de la fila ya insertada en `search_history` por tu FastAPI.
- `requestAnalysis` retorna también ese `id`.

### 6. Persistencia
- En `index.tsx` (autenticado): tras recibir el resultado, navegar a `/dashboard/$id` usando el `id` que devuelve el backend (ya no `crypto.randomUUID()` ni `sessionStorage`).
- En `dashboard.$id.tsx`: cargar con `supabase.from('search_history').select('*').eq('id', id).single()` en lugar de `sessionStorage`. Reconstruir `result`, `fileName`, `rowCount` desde la fila. RLS garantiza que solo el dueño accede.
- **Nota sobre rows crudos**: el plan original guardaba solo metadata + resultado. Esto significa que la tabla "Ver datos crudos" del dashboard **ya no estará disponible al reabrir desde historial** (solo en la sesión recién creada). Si quieres conservarla, hay que añadir `rows jsonb` a la tabla — dímelo y hago la migración. Por ahora la oculto cuando se abre desde historial.

### 7. Fallback local (modo demo sin backend)
Mantengo el `localAnalysis` como fallback, pero si el usuario no está autenticado el flujo no llega ahí (auth guard). Si el backend falla con usuario logueado, hago `INSERT` directo desde el frontend a `search_history` con el resultado local para que igual quede en el historial.

## Lo que necesitas en tu FastAPI (recordatorio, no lo toco)

1. Validar `Authorization: Bearer <jwt>` con la JWKS de Supabase (`https://ujnusyjjzcocqrfibbcm.supabase.co/auth/v1/.well-known/jwks.json`), extraer `sub` como `user_id`.
2. `INSERT INTO search_history (user_id, file_name, row_count, column_count, result) VALUES (...) RETURNING id` usando service role key.
3. Devolver `{ "id": "<uuid>", "summary": ..., "keywords": [...], "kpis": [...], "charts": [...] }`.

## Detalles técnicos

- **Auth method**: solo email + password. Sin Google/Apple por ahora (lo puedes añadir después).
- **Auto-confirm email**: lo dejo desactivado por defecto (más seguro). Si quieres pruebas rápidas sin verificar email, dímelo y lo activo.
- **Reset password**: incluyo `/forgot-password` y `/reset-password` (rutas públicas).
- **Realtime**: no lo activo en `search_history` por ahora; el historial se refresca al entrar a la página.
- **Sin tabla profiles**: confirmado, no la necesitas.

## Lo que NO incluye

- OAuth (Google/Apple) — fácil de añadir luego
- Compartir análisis entre usuarios
- Guardado del Excel original en Storage
- Roles/admin
- Guardado de `rows` crudos (pendiente de tu decisión arriba)

