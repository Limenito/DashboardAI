

# Historial de búsquedas con autenticación

Vas a tener: **login con Supabase Auth** + tabla `search_history` con RLS + UI para listar y reabrir análisis pasados.

## Arquitectura

```text
┌─────────────────────────────────────────────────┐
│  Frontend (Lovable)                             │
│                                                 │
│  /login  ──► Supabase Auth (email + password)   │
│  /  (protegido) ──► sube Excel                  │
│  /history (nuevo) ──► lista de análisis previos │
│  /dashboard/$id ──► reabre análisis guardado    │
└──────────────────┬──────────────────────────────┘
                   │ JWT en header
                   ▼
┌─────────────────────────────────────────────────┐
│  FastAPI backend (tuyo)                         │
│  POST /analyze  ──► valida JWT, llama Gemini,   │
│                     guarda en search_history    │
│  GET  /history  ──► lista del usuario           │
│  GET  /history/:id ──► resultado completo       │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
            ┌──────────────┐
            │  Supabase    │
            │  - auth.users│
            │  - search_history (RLS)│
            └──────────────┘
```

## Cambios en el frontend

### 1. Habilitar Lovable Cloud (Supabase)
Activar Lovable Cloud para tener cliente Supabase y Auth listos en el proyecto.

### 2. Esquema de BD (migración)
Tabla `search_history`:
- `id uuid PK`
- `user_id uuid` → `auth.users(id)` ON DELETE CASCADE
- `file_name text`
- `row_count int`, `column_count int`
- `result jsonb` (el `AnalysisResult` completo: KPIs, charts, summary)
- `created_at timestamptz default now()`

RLS: solo el dueño puede SELECT / INSERT / DELETE sus filas.

> **Nota**: tu backend FastAPI necesitará usar el **service role key** o un JWT del usuario para escribir en esta tabla. El frontend la lee directo con el cliente Supabase (RLS lo protege).

### 3. Rutas nuevas
- `src/routes/login.tsx` — formulario email/password + signup, redirige a `/`.
- `src/routes/_authenticated.tsx` — layout protegido: si no hay sesión, redirige a `/login`.
- Mover `index.tsx`, `dashboard.$id.tsx` debajo de `_authenticated/` para protegerlos.
- `src/routes/_authenticated/history.tsx` — lista de búsquedas previas (tarjetas con nombre, fecha, KPIs resumidos, botón "Abrir").

### 4. Auth context
- `src/lib/auth.tsx` — provider con `useAuth()` (sesión, user, signIn, signUp, signOut), usa `onAuthStateChange` de Supabase.
- Inyectar en `__root.tsx` envolviendo `<Outlet />`.

### 5. Header global
- Mostrar email del usuario + botón "Historial" + botón "Salir" arriba.

### 6. Cambios en el flujo de análisis (`src/lib/analysis.ts`)
- Adjuntar `Authorization: Bearer <jwt>` al `fetch` de `/analyze` para que tu FastAPI sepa quién es.
- Tras recibir el resultado, **el backend** lo guarda en `search_history` (no el frontend, así centralizas la lógica).
- El `id` que devuelva el backend será el `id` de la fila de Supabase, y `dashboard/$id` lo carga desde Supabase en lugar de `sessionStorage`.

### 7. Reapertura de análisis
- `dashboard.$id.tsx` cambia: en vez de leer `sessionStorage`, hace `supabase.from('search_history').select().eq('id', id).single()` y reconstruye la vista.

## Lo que necesitas hacer en tu backend FastAPI

(no lo edito yo, es tu repo, pero lo dejo claro)

1. Aceptar header `Authorization: Bearer <token>`, validarlo con la JWKS de Supabase, extraer `user_id`.
2. Tras generar el `AnalysisResult`, hacer `INSERT INTO search_history (user_id, file_name, row_count, column_count, result) VALUES (...) RETURNING id`.
3. Devolver `{ id, ...AnalysisResult }` al frontend.

Te puedo dar el snippet Python cuando lleguemos a ese punto si quieres.

## Detalles técnicos

- **Auth**: Supabase Auth con email+password (puedes añadir Google después en 2 líneas).
- **Sesión**: persistida en `localStorage` por el cliente Supabase, refresh automático.
- **RLS**: política `auth.uid() = user_id` en SELECT/INSERT/DELETE.
- **Sin profiles table**: por ahora no la necesitas (tú dijiste solo metadata + resultado).
- **Reset password**: incluyo `/forgot-password` y `/reset-password` básicos.

## Lo que NO incluye este plan (para fases futuras)

- Roles/admin
- Compartir análisis entre usuarios
- Guardado del Excel original en Storage
- OAuth con Google/GitHub

Si quieres añadir alguno ahora, dímelo antes de aprobar.

