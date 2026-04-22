

# Conectar tu backend FastAPI al frontend

## Diagnóstico

Buena noticia: **el frontend ya está preparado para hablar con un backend externo**. En `src/lib/analysis.ts` ya hay:

- Lectura de `VITE_API_URL` para apuntar al backend.
- Envío del `Authorization: Bearer <access_token>` de Supabase.
- `POST /analyze` con `fileName, rowCount, columns, sample` y respuesta `{ id, result }`.
- Fallback al análisis local si el backend falla.

Lo único que falta:
1. Tu backend (FastAPI con Gemini, según `gemini.py`) tiene que **exponer ese contrato** y **validar el JWT de Lovable Cloud (Supabase)**.
2. El frontend tiene que **apuntar a tu URL de Render/Railway/Fly** mediante una variable de entorno y **manejar CORS** correctamente.

## Cambios

### 1. Variable de entorno `VITE_API_URL` (frontend)
Quitar la URL ngrok hardcodeada. Crear `.env.local` (que tú gestionas) con `VITE_API_URL=https://tu-backend.onrender.com`. Eliminar `DEFAULT_API_URL` y el header `ngrok-skip-browser-warning`. Si no hay variable definida → cae directo al análisis local (modo demo). Documentarlo en un `README.md` corto.

### 2. Refinar `requestAnalysis` en `src/lib/analysis.ts`
- Manejo de errores más claro (timeouts, 401, 5xx) con toasts en español.
- Si el backend devuelve 401 → forzar refresh del token y reintentar una vez.
- Quitar `ngrok-skip-browser-warning` (ya no aplica).

### 3. Página de configuración de backend (opcional, recomendado)
Pequeña sección en `/history` o un `/settings` donde se muestre:
- Estado del backend: ping a `GET /health` → "✅ Conectado" o "⚠️ Sin conexión, usando modo local".
- URL configurada (`VITE_API_URL`).
Útil para depurar.

### 4. Documentar el contrato del backend (no se toca código backend)
Crear `BACKEND.md` en la raíz con la especificación que tu FastAPI debe cumplir, para que tú la implementes en tu propio repo.

## Contrato que tu backend FastAPI debe implementar

### Endpoints

**`GET /health`** — Healthcheck público (sin auth).
Respuesta: `{ "status": "ok" }`

**`POST /analyze`** — Analiza datos Excel. **Requiere JWT.**
Headers:
- `Authorization: Bearer <supabase_access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "fileName": "ventas.xlsx",
  "rowCount": 1234,
  "columns": [{ "name": "...", "type": "number|string|date", "stats": {...} }],
  "sample": [{ "col1": "...", "col2": 123 }]
}
```

Respuesta (200):
```json
{
  "id": "uuid-del-análisis",
  "result": {
    "summary": "Texto en español...",
    "keywords": ["ventas", "Q3"],
    "kpis": [{ "label": "...", "value": "...", "hint": "..." }],
    "charts": [{ "type": "bar|line|area|pie|scatter", "title": "...", "xKey": "...", "yKeys": ["..."], "data": [...] }]
  }
}
```

### Validación del JWT en FastAPI

Tu backend debe validar el `access_token` contra Supabase. Dos opciones:

**Opción A (recomendada, sin red):** verificar la firma JWT con la clave pública JWKS de Supabase:
```python
# pip install python-jose[cryptography] httpx
from jose import jwt
import httpx, os

SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://ujnusyjjzcocqrfibbcm.supabase.co
JWKS = httpx.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json").json()

def get_user_id(token: str) -> str:
    payload = jwt.decode(token, JWKS, algorithms=["ES256", "RS256"], audience="authenticated")
    return payload["sub"]
```

**Opción B (más simple):** llamar a `GET {SUPABASE_URL}/auth/v1/user` con el token y leer la respuesta. Una llamada extra por request.

### CORS en FastAPI (obligatorio)

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://id-preview--298a3ae2-63a1-4964-b96a-0c024517b9a6.lovable.app",
        "https://*.lovable.app",  # cuando publiques
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

### Variables de entorno del backend (en Render/Railway/Fly)

- `SUPABASE_URL` = `https://ujnusyjjzcocqrfibbcm.supabase.co`
- `GEMINI_API_KEY` = tu clave de Gemini
- (opcional) `SUPABASE_SERVICE_ROLE_KEY` si vas a escribir en `search_history` desde el backend

### ¿Quién guarda en `search_history`?

Dos opciones — tú eliges:
- **A) El frontend guarda** (como ahora): el backend solo devuelve `result`, el frontend hace `INSERT` en Supabase. Más simple, RLS protege automáticamente.
- **B) El backend guarda**: necesita `SUPABASE_SERVICE_ROLE_KEY` y debe filtrar por `user_id` extraído del JWT. Más limpio si añades más lógica.

Recomiendo **A** para empezar.

## Lo que NO toco

- El backend Python en sí (lo gestionas tú en otro repo).
- El esquema de Supabase ni RLS.
- La autenticación del frontend.

## Notas técnicas

- `import.meta.env.VITE_API_URL` se reemplaza en build time. Cada cambio requiere reiniciar el dev server.
- Si pruebas en local con `localhost:8000`, `allow_origins` del backend debe incluir el origin del preview de Lovable.
- El JWT de Supabase expira a los 60 min; el frontend lo refresca automáticamente con `supabase.auth.getSession()`.
- Para Render/Railway: el primer request tras inactividad puede tardar 30-60s (cold start) en planes gratuitos.

