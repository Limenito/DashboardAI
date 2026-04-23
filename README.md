# IA Dashboard — Excel a Insights con IA

> Convierte cualquier archivo Excel en un dashboard interactivo con KPIs, gráficos y resumen ejecutivo generado por Inteligencia Artificial.

![Stack](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)
![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Stack](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase)
![Stack](https://img.shields.io/badge/IA-Gemini_2.0_Flash-4285F4?logo=google)
![Deploy](https://img.shields.io/badge/Deploy-Render_+_Lovable-purple)


## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TanStack Router + shadcn/ui |
| Gráficos | Recharts |
| Parseo Excel | SheetJS (client-side) |
| Backend | FastAPI (Python 3.12) |
| IA | Google Gemini 2.0 Flash |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Deploy Frontend | Lovable |
| Deploy Backend | Render |

---

## Funcionalidades

- **Auth completa** — registro, login, recuperación de contraseña y sesiones persistentes
- **Carga de Excel** — drag & drop de `.xlsx` / `.xls`, parseo client-side sin enviar el binario al servidor
- **Dashboard por IA** — resumen ejecutivo, KPIs con valores reales y 3-5 gráficos elegidos dinámicamente por Gemini según el tipo de columnas detectadas
- **Historial** — análisis guardados por usuario con opción de reapertura y eliminación
- **Modo demo** — si el backend no está disponible, el análisis se genera heurísticamente en el navegador

---

## Arquitectura

```
Browser
  └─ SheetJS parsea el Excel localmente
  └─ POST /analyze → JSON con stats (~10KB, nunca el binario)
        │
        ▼
  FastAPI (Render)
  └─ build_prompt() con schema + muestra de 10 filas
  └─ Gemini 2.0 Flash → { summary, kpis, charts }
        │
        ▼
  Frontend renderiza el dashboard
  └─ Supabase guarda el resultado vinculado al usuario
```

**El backend es stateless** — solo recibe metadata, llama a Gemini y devuelve JSON. La persistencia la maneja el frontend directamente contra Supabase con Row Level Security.

---

## Modelo de datos

### Tabla `search_history`

```sql
create table public.search_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  row_count     integer not null default 0,
  column_count  integer not null default 0,
  result        jsonb not null,   -- { summary, keywords, kpis, charts }
  created_at    timestamptz not null default now()
);

alter table public.search_history enable row level security;

create policy "select own" on public.search_history
  for select using (auth.uid() = user_id);
create policy "insert own" on public.search_history
  for insert with check (auth.uid() = user_id);
create policy "delete own" on public.search_history
  for delete using (auth.uid() = user_id);
```

Se eligió PostgreSQL (via Supabase) por su soporte nativo de `jsonb` para almacenar el resultado del análisis, y por las políticas RLS que garantizan aislamiento de datos por usuario sin lógica adicional en el backend.

---

## Integración de IA

El análisis usa **Gemini 2.0 Flash** con temperatura `0.3` para respuestas consistentes y estructuradas.

El prompt incluye el schema del dataset (columnas, tipos inferidos, estadísticas) y una muestra de 10 filas. Gemini devuelve un JSON estricto con:

- `summary` — resumen ejecutivo en español (2-4 oraciones)
- `keywords` — 5-8 frases clave del dataset
- `kpis` — 3-6 indicadores con valores reales formateados (K/M)
- `charts` — 3-5 specs de gráficos con tipo y columnas exactas

La inferencia de tipos de columna se hace client-side antes de llamar al backend:

| Tipo | Criterio |
|---|---|
| `number` | >85% de valores numéricos |
| `date` | >70% de valores con formato fecha |
| `category` | Únicos ≤ max(20, 40% del total) |
| `text` | Resto |

El backend implementa retry automático con backoff (20s → 40s → 60s) ante errores de cuota 429.

---

## Configuración local

### Backend
```bash
cd Backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # agregar GEMINI_API_KEY
uvicorn main:app --reload
# http://localhost:8000/docs
```

### Frontend
```bash
npm install
cp .env.example .env   # agregar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
# http://localhost:5173
```

---

## Variables de entorno

| Variable | Dónde obtenerla |
|---|---|
| `GEMINI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Settings → API |
| `VITE_API_URL` | URL del backend en Render (opcional) |

---

## API Reference

### `GET /health`
```json
{ "status": "ok", "gemini_key_preview": "AIza...37E", "gemini_key_length": 39 }
```

### `POST /analyze`
Recibe metadata del Excel, devuelve el análisis generado por IA.

```json
// Request
{
  "fileName": "ventas.xlsx",
  "rowCount": 1500,
  "columns": [
    { "name": "Región", "type": "category", "count": 1500, "nulls": 0, "unique": 5 },
    { "name": "Ventas", "type": "number", "sum": 12600000, "mean": 8400, "min": 100, "max": 50000 }
  ],
  "sample": [{ "Región": "Norte", "Ventas": 12000 }]
}

// Response
{
  "summary": "El dataset contiene 1,500 registros de ventas...",
  "keywords": ["ventas 12.6M", "región norte"],
  "kpis": [{ "label": "Total Ventas", "value": "12.6M", "hint": "Promedio 8.4K" }],
  "charts": [{ "type": "bar", "title": "Ventas por Región", "xKey": "Región", "yKeys": ["Ventas"], "data": [] }]
}
```

---

## Uso de IA en el desarrollo

- **Lovable** generó el frontend completo mediante vibecoding
- **Claude (Anthropic)** generó el backend FastAPI analizando los tipos TypeScript del frontend para garantizar compatibilidad exacta del contrato de API
- **Gemini 2.0 Flash** analiza cada dataset en runtime y decide qué visualizar
