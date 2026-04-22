# Contrato del Backend FastAPI

Este documento describe lo que tu backend (FastAPI + Gemini) debe implementar para que el frontend de IA Dashboard hable con él.

## Configuración del frontend

Crea un archivo `.env.local` en la raíz del proyecto frontend:

```
VITE_API_URL=https://tu-backend.onrender.com
```

- Si `VITE_API_URL` no está definida, el frontend usa el análisis heurístico local (modo demo).
- Tras cambiarla, **reinicia el dev server** (Vite reemplaza esta variable en build time).

## Endpoints

### `GET /health` — público (sin auth)

Healthcheck. El frontend lo usa para mostrar el estado de conexión en `/history`.

**Respuesta `200`:**

```json
{ "status": "ok" }
```

### `POST /analyze` — requiere JWT

Recibe un resumen de un Excel parseado y devuelve KPIs, gráficos y resumen.

**Headers:**

- `Authorization: Bearer <supabase_access_token>`
- `Content-Type: application/json`

**Body:**

```json
{
  "fileName": "ventas.xlsx",
  "rowCount": 1234,
  "columns": [
    {
      "name": "fecha",
      "type": "date",
      "unique": 30,
      "topValues": [{ "value": "2024-01-15", "count": 12 }]
    },
    {
      "name": "monto",
      "type": "number",
      "min": 10, "max": 9999, "mean": 543.2, "sum": 670000
    }
  ],
  "sample": [{ "fecha": "2024-01-01", "monto": 100, "categoria": "A" }]
}
```

**Respuesta `200`:**

```json
{
  "id": "uuid-del-análisis",
  "result": {
    "summary": "Texto en español describiendo los hallazgos clave...",
    "keywords": ["ventas", "Q3", "crecimiento"],
    "kpis": [
      { "label": "Ingresos totales", "value": "$670K", "hint": "vs $500K en Q2" }
    ],
    "charts": [
      {
        "type": "bar",
        "title": "Ventas por categoría",
        "description": "Suma de monto agrupado por categoría",
        "xKey": "categoria",
        "yKeys": ["monto"],
        "data": [{ "categoria": "A", "monto": 12000 }]
      }
    ]
  }
}
```

`type` admite: `bar`, `line`, `area`, `pie`, `scatter`.

Si devuelves `data: []`, el frontend la rellena automáticamente agregando los datos parseados según `xKey`/`yKeys`.

## Validar el JWT de Supabase

### Opción A — verificar firma con JWKS (recomendada)

```python
# requirements: python-jose[cryptography] httpx fastapi
from jose import jwt
import httpx, os
from fastapi import HTTPException, Header

SUPABASE_URL = os.getenv("SUPABASE_URL")  # https://ujnusyjjzcocqrfibbcm.supabase.co
JWKS = httpx.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json").json()

def get_user_id(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWKS, algorithms=["ES256", "RS256"], audience="authenticated")
        return payload["sub"]
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")
```

### Opción B — llamar a `/auth/v1/user` (más simple)

```python
async def get_user_id(authorization: str = Header(...)) -> str:
    async with httpx.AsyncClient() as c:
        r = await c.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={"Authorization": authorization, "apikey": os.getenv("SUPABASE_PUBLISHABLE_KEY")}
        )
    if r.status_code != 200:
        raise HTTPException(401, "Invalid token")
    return r.json()["id"]
```

## CORS (obligatorio)

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

## Variables de entorno del backend

Configúralas en Render / Railway / Fly.io:

| Variable                    | Valor                                      | Necesaria                                      |
| --------------------------- | ------------------------------------------ | ---------------------------------------------- |
| `SUPABASE_URL`              | `https://ujnusyjjzcocqrfibbcm.supabase.co` | ✅ para validar JWT                            |
| `SUPABASE_PUBLISHABLE_KEY`  | tu anon key                                | solo si usas opción B                          |
| `GEMINI_API_KEY`            | 'IzaSyDVMLsUCuyg2RlkaJgbwWAXxULqufONEtI'   | ✅                                             |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key                           | solo si el backend escribe en `search_history` |

## ¿Quién guarda en `search_history`?

**Opción A (recomendada, ya implementada):** el backend solo devuelve `result`, el frontend hace `INSERT` en Supabase. RLS protege automáticamente. Si el backend incluye `id` en la respuesta, el frontend lo respeta; si no, el frontend genera y guarda.

**Opción B:** el backend guarda. Necesita `SUPABASE_SERVICE_ROLE_KEY` y debe filtrar por `user_id` extraído del JWT.

## Notas

- El frontend tiene timeout de **60 s** y reintenta una vez si recibe `401` (refresca el token).
- En planes gratuitos de Render/Railway, el primer request tras inactividad puede tardar 30-60 s (cold start).
- El JWT de Supabase expira a los 60 min; el frontend lo refresca automáticamente.
