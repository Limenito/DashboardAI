# IA Dashboard — Excel a Insights con IA

> Convierte cualquier archivo Excel en un dashboard interactivo con KPIs, gráficos y resumen ejecutivo generado por Inteligencia Artificial.

![Stack](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)
![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Stack](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase)
![Stack](https://img.shields.io/badge/IA-Gemini_2.0_Flash-4285F4?logo=google)
![Deploy](https://img.shields.io/badge/Deploy-Render_+_Lovable-purple)

---

## Tabla de contenidos

- [Demo](#demo)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura](#arquitectura)
- [Modelo de datos](#modelo-de-datos)
- [Integración de IA](#integración-de-ia)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Configuración local](#configuración-local)
- [Variables de entorno](#variables-de-entorno)
- [Deploy](#deploy)
- [API Reference](#api-reference)

---

## Demo

| URL | Descripción |
|---|---|
| **Frontend** | https://insight-spark-797.lovable.app |
| **Backend API** | https://pruebaneoconsulting-iadashboard.onrender.com |
| **Docs interactivos** | https://pruebaneoconsulting-iadashboard.onrender.com/docs |

---

## Funcionalidades

### Autenticación
- Registro e inicio de sesión con email y contraseña
- Validación de fortaleza de contraseña (mínimo 8 caracteres, mayúscula y número)
- Recuperación de contraseña vía email (forgot password + reset password)
- Reenvío de email de confirmación
- Sesiones persistentes gestionadas por Supabase Auth
- Rutas protegidas — redirige a `/login` si no hay sesión activa

### Análisis de Excel
- Carga de archivos `.xlsx` y `.xls` por drag & drop o selector de archivos
- Parseo **100% client-side** con la librería `xlsx` — el archivo binario nunca sale del navegador
- Detección automática de tipos de columna: `number`, `date`, `category`, `text`
- Cálculo de estadísticas por columna: suma, media, mínimo, máximo, valores únicos, top valores
- Muestra de progreso en tiempo real (uploading → parsing → analyzing → rendering)

### Dashboard generado por IA
- **Resumen ejecutivo** en español (2-4 oraciones) con insights principales, tendencias y anomalías
- **KPIs** (3-6 indicadores) con valores reales del dataset formateados (K/M)
- **Gráficos interactivos** (3-5 charts) elegidos dinámicamente por la IA según el tipo de datos:
  - Barras (`bar`) — comparación categórica vs numérica
  - Línea (`line`) / Área (`area`) — tendencias temporales
  - Torta (`pie`) — distribución de categorías
  - Dispersión (`scatter`) — correlación entre variables numéricas
- **Palabras clave** (5-8 frases) que resumen el dataset
- Tabla colapsable con los datos crudos del Excel

### Historial
- Cada análisis se persiste automáticamente en Supabase vinculado al usuario
- Página `/history` con listado de análisis previos
- Preview de KPIs por tarjeta en el historial
- Timestamp relativo ("hace 5 min", "hace 2 h")
- Reapertura de cualquier análisis anterior
- Eliminación individual de análisis
- Row Level Security: cada usuario solo ve sus propios datos

---

## Stack tecnológico

| Capa | Tecnología | Versión | Justificación |
|---|---|---|---|
| **Frontend** | React | 18 | Ecosistema maduro, compatible con Lovable |
| **Routing** | TanStack Router | v1 | Type-safe, file-based, ideal para rutas autenticadas |
| **UI Components** | shadcn/ui + Tailwind CSS | — | Componentes accesibles, minimalistas y personalizables |
| **Gráficos** | Recharts | — | Declarativo, basado en SVG, integración nativa con React |
| **Parseo Excel** | xlsx (SheetJS) | — | Parseo client-side sin enviar el binario al servidor |
| **Backend** | FastAPI | 0.115 | Async nativo, validación con Pydantic, OpenAPI automático |
| **IA** | Google Gemini 2.0 Flash | — | Free tier generoso, respuesta rápida, salida JSON estructurada |
| **Base de datos** | Supabase (PostgreSQL) | — | Auth + DB + RLS en un solo servicio, free tier permanente |
| **Autenticación** | Supabase Auth | — | JWT, sesiones persistentes, recuperación de contraseña incluida |
| **Deploy Frontend** | Lovable / Vercel | — | CI/CD automático desde GitHub |
| **Deploy Backend** | Render | — | Deploy desde GitHub, variables de entorno, free tier |
| **Vibecoding** | Lovable | — | Generación del frontend completo mediante prompts |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                     BROWSER (Cliente)                            │
│                                                                  │
│  1. Usuario sube .xlsx                                           │
│  2. SheetJS parsea el archivo localmente                         │
│     → Extrae: columnas, tipos, stats, muestra (20 filas)         │
│  3. POST /analyze con JSON liviano (~10KB)                       │
│  4. Recibe AnalysisResult → renderiza dashboard                  │
│  5. Persiste resultado en Supabase                               │
└──────────────┬──────────────────────────┬───────────────────────┘
               │ POST /analyze            │ SDK Supabase
               ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────────────┐
│   BACKEND (FastAPI)       │   │   SUPABASE                       │
│   Render.com              │   │                                  │
│                           │   │  auth.users    (Supabase Auth)   │
│  main.py   → Rutas, CORS  │   │  search_history (PostgreSQL)     │
│  models.py → Pydantic     │   │                                  │
│  gemini.py → Prompt + LLM │   │  Row Level Security activo       │
└──────────┬───────────────┘   └──────────────────────────────────┘
           │ generate_content()
           ▼
┌──────────────────────────┐
│   GOOGLE GEMINI API       │
│   gemini-2.0-flash        │
│                           │
│  Input:  schema + muestra │
│  Output: JSON estructurado│
│  (summary, kpis, charts)  │
└──────────────────────────┘
```

### Decisiones de arquitectura

**¿Por qué parsear el Excel en el cliente?**
El archivo `.xlsx` se procesa con SheetJS directamente en el navegador. Al backend solo llega un JSON con estadísticas y una muestra de 20 filas (~10KB), nunca el binario. Esto elimina límites de tamaño de archivo en el servidor, reduce la latencia y simplifica el backend.

**¿Por qué no hay base de datos en el backend?**
El estado se divide en dos capas: los análisis se persisten en Supabase (PostgreSQL) directamente desde el frontend usando el SDK de Supabase. El backend es completamente stateless — recibe un request, llama a Gemini y devuelve JSON. Esto permite escalado horizontal sin coordinación de estado.

**¿Por qué Supabase y no Firebase o una BD propia?**
Supabase ofrece Auth + PostgreSQL + Row Level Security en un solo servicio con free tier permanente. Las políticas RLS garantizan que cada usuario acceda únicamente a sus propios análisis sin lógica extra en el backend.

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
  result        jsonb not null,        -- AnalysisResult completo serializado
  created_at    timestamptz not null default now()
);
```

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK generado automáticamente |
| `user_id` | uuid | FK a `auth.users` — propietario del análisis |
| `file_name` | text | Nombre del archivo Excel original |
| `row_count` | integer | Número de filas del dataset |
| `column_count` | integer | Número de columnas del dataset |
| `result` | jsonb | JSON completo con summary, kpis, charts y keywords |
| `created_at` | timestamptz | Timestamp de creación (UTC) |

### Estructura del campo `result` (JSONB)

```json
{
  "summary": "El archivo contiene 1,500 registros de ventas...",
  "keywords": ["ventas totales", "región norte", "crecimiento Q4"],
  "kpis": [
    { "label": "Total Ventas", "value": "12.6M", "hint": "Promedio 8.4K" }
  ],
  "charts": [
    {
      "type": "bar",
      "title": "Ventas por Región",
      "description": "Comparativa de ventas agrupadas por región",
      "xKey": "Región",
      "yKeys": ["Ventas"],
      "data": [{ "Región": "Norte", "Ventas": 4200000 }]
    }
  ]
}
```

### Políticas de Row Level Security

```sql
-- Cada usuario solo puede leer sus propios análisis
create policy "select own" on public.search_history
  for select using (auth.uid() = user_id);

-- Solo puede insertar análisis propios
create policy "insert own" on public.search_history
  for insert with check (auth.uid() = user_id);

-- Solo puede eliminar análisis propios
create policy "delete own" on public.search_history
  for delete using (auth.uid() = user_id);
```

---

## Integración de IA

### Modelo utilizado
**Google Gemini 2.0 Flash** via `google-genai` SDK (Python).

- Free tier: 15 RPM / 1,500 requests por día
- Temperatura: `0.3` (respuestas determinísticas y consistentes)
- Max output tokens: `2,048`

### Flujo de análisis

```
Frontend                    Backend                    Gemini
   |                           |                          |
   |-- POST /analyze --------> |                          |
   |   { fileName,             |                          |
   |     rowCount,             |                          |
   |     columns: ColumnStat[] |                          |
   |     sample: row[20] }     |                          |
   |                           |-- build_prompt() ------> |
   |                           |   (schema + estadísticas)|                          |
   |                           |                          |-- generate_content() --> |
   |                           |                          |   model: gemini-2.0-flash|
   |                           |                          |   temp: 0.3              |
   |                           | <-- JSON estructurado -- |
   |                           |   { summary, keywords,   |
   |                           |     kpis, charts }        |
   | <-- AnalysisResult ------- |                          |
```

### Prompt engineering

El prompt enviado a Gemini incluye:

1. **Metadata del dataset**: nombre del archivo, número de filas, descripción compacta de cada columna con su tipo inferido, estadísticas numéricas (sum, mean, min, max) y top valores para columnas categóricas.

2. **Muestra de datos**: las primeras 10 filas del Excel en formato JSON.

3. **Instrucciones estrictas de salida**: el modelo debe devolver únicamente un objeto JSON válido con campos exactos (`summary`, `keywords`, `kpis`, `charts`). Sin markdown, sin backticks.

4. **Reglas de negocio**: 
   - El resumen debe estar en español
   - Los KPIs deben usar valores reales de las estadísticas
   - Los gráficos deben referenciar nombres de columna exactos
   - El tipo de gráfico se elige según el tipo de datos (temporal → línea, categórico → barra, distribución → pie)

### Inferencia dinámica de tipos de columna

El frontend clasifica cada columna automáticamente antes de enviarla al backend:

| Tipo | Criterio de detección |
|---|---|
| `number` | >85% de valores son numéricos |
| `date` | >70% de valores coinciden con regex de fecha |
| `category` | Valores únicos ≤ max(20, 40% del total) |
| `text` | Resto de casos |

### Retry automático con backoff

El backend implementa reintentos automáticos ante errores de cuota (429):

```
Intento 1 → 429 → espera 20s
Intento 2 → 429 → espera 40s
Intento 3 → 429 → espera 60s
Si persiste → error descriptivo al usuario
```

### Modo demo (fallback local)

Si el backend no está disponible o la cuota está agotada, el frontend ejecuta un análisis heurístico local que genera KPIs y gráficos basándose en las estadísticas calculadas por SheetJS, sin llamar a ninguna API externa.

---

## Estructura del repositorio

```
insight-spark-797/
│
├── README.md                          ← Este archivo
│
├── Backend/                           ← API FastAPI
│   ├── main.py                        ← App FastAPI, CORS, rutas
│   ├── models.py                      ← Modelos Pydantic (request/response)
│   ├── gemini.py                      ← Integración Gemini + prompt engineering
│   ├── requirements.txt               ← Dependencias Python
│   ├── Procfile                       ← Comando de inicio para Render
│   ├── .env.example                   ← Variables de entorno de ejemplo
│   └── README.md                      ← Documentación del backend
│
└── src/                               ← App React (frontend)
    ├── lib/
    │   ├── excel.ts                   ← Parseo de Excel + inferencia de tipos
    │   ├── analysis.ts                ← Llamada al backend + análisis local
    │   └── auth.tsx                   ← Context de autenticación
    ├── routes/
    │   ├── login.tsx                  ← Login + registro + validaciones
    │   ├── forgot-password.tsx        ← Recuperación de contraseña
    │   ├── reset-password.tsx         ← Restablecimiento de contraseña
    │   └── _authenticated/
    │       ├── index.tsx              ← Home — dropzone de Excel
    │       ├── dashboard.$id.tsx      ← Dashboard de análisis
    │       └── history.tsx            ← Historial de análisis
    ├── components/
    │   ├── DynamicChart.tsx           ← Gráficos dinámicos con Recharts
    │   ├── DataTable.tsx              ← Tabla de datos crudos
    │   ├── Dropzone.tsx               ← Área de carga de archivos
    │   ├── AppHeader.tsx              ← Header con navegación y auth
    │   └── ui/                        ← Componentes shadcn/ui
    └── integrations/supabase/
        ├── client.ts                  ← Cliente Supabase
        └── types.ts                   ← Tipos TypeScript generados desde Supabase
```

---

## Configuración local

### Requisitos previos

- Python 3.12+
- Node.js 18+ (o Bun)
- Cuenta en [Supabase](https://supabase.com) (free)
- API Key de [Google AI Studio](https://aistudio.google.com/app/apikey) (free)

### 1. Clonar el repositorio

```bash
git clone https://github.com/Limenito/insight-spark-797.git
cd insight-spark-797
```

### 2. Configurar la base de datos (Supabase)

En el SQL Editor de tu proyecto Supabase ejecuta:

```sql
create table public.search_history (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  file_name     text not null,
  row_count     integer not null default 0,
  column_count  integer not null default 0,
  result        jsonb not null,
  created_at    timestamptz not null default now()
);

create index search_history_user_id_idx
  on public.search_history(user_id, created_at desc);

alter table public.search_history enable row level security;

create policy "select own" on public.search_history
  for select using (auth.uid() = user_id);

create policy "insert own" on public.search_history
  for insert with check (auth.uid() = user_id);

create policy "delete own" on public.search_history
  for delete using (auth.uid() = user_id);
```

### 3. Backend

```bash
cd Backend

# Crear entorno virtual con Python 3.12
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar GEMINI_API_KEY

# Iniciar servidor
uvicorn main:app --reload
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### 4. Frontend

```bash
# Desde la raíz del repo
npm install          # o: bun install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores de Supabase

# Iniciar servidor de desarrollo
npm run dev          # o: bun dev
# App disponible en http://localhost:5173
```

---

## Variables de entorno

### Backend (`Backend/.env`)

| Variable | Descripción | Obtener en |
|---|---|---|
| `GEMINI_API_KEY` | API Key de Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (separados por coma) | URL de tu frontend |

### Frontend (`.env`)

| Variable | Descripción | Obtener en |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Supabase → Settings → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key de Supabase | Supabase → Settings → API |
| `VITE_API_URL` | URL del backend FastAPI | URL de Render (opcional) |

---

## Deploy

### Backend — Render

1. Conectar el repositorio en [render.com](https://render.com)
2. Configurar el servicio:
   - **Environment:** Python
   - **Root Directory:** `Backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Agregar variable de entorno `GEMINI_API_KEY`
4. Deploy automático en cada push a `main`

> **Nota:** El free tier de Render duerme el servidor tras 15 min de inactividad. El primer request del día puede tardar ~30-50s en responder (cold start).

### Frontend — Lovable / Vercel

El frontend se despliega automáticamente desde Lovable en cada cambio. Para deploy manual en Vercel:

```bash
npm run build
# Subir carpeta dist/ a Vercel o conectar el repo
```

---

## API Reference

### `GET /health`

Verifica que el servidor está activo y la API Key está configurada.

**Response:**
```json
{
  "status": "ok",
  "gemini_key_preview": "AIza...37E",
  "gemini_key_length": 39
}
```

---

### `POST /analyze`

Recibe metadata de un Excel y devuelve el análisis generado por IA.

**Request body:**
```json
{
  "fileName": "ventas_2024.xlsx",
  "rowCount": 1500,
  "columns": [
    {
      "name": "Región",
      "type": "category",
      "count": 1500,
      "nulls": 0,
      "unique": 5,
      "topValues": [
        { "value": "Norte", "count": 420 }
      ]
    },
    {
      "name": "Ventas",
      "type": "number",
      "count": 1500,
      "nulls": 3,
      "unique": 890,
      "min": 100,
      "max": 50000,
      "mean": 8400,
      "sum": 12600000
    }
  ],
  "sample": [
    { "Región": "Norte", "Ventas": 12000 }
  ]
}
```

**Response:**
```json
{
  "summary": "El dataset contiene 1,500 registros de ventas distribuidos en 5 regiones...",
  "keywords": ["ventas totales 12.6M", "región norte líder", "promedio 8.4K"],
  "kpis": [
    { "label": "Total Ventas", "value": "12.6M", "hint": "Promedio 8.4K por registro" },
    { "label": "Registros", "value": "1,500", "hint": "3 valores nulos" }
  ],
  "charts": [
    {
      "type": "bar",
      "title": "Ventas por Región",
      "description": "Comparativa de ventas totales agrupadas por región geográfica",
      "xKey": "Región",
      "yKeys": ["Ventas"],
      "data": []
    }
  ]
}
```

> Los arrays `data` en `charts` vienen vacíos — el frontend los popula con los datos originales del Excel mediante `enrichCharts()`.

---

## Uso de IA en el desarrollo

Este proyecto utilizó IA en dos niveles:

**En el desarrollo:**
- **Lovable** generó el 100% del código frontend mediante vibecoding — componentes, rutas, lógica de auth y persistencia
- **Claude (Anthropic)** generó el backend FastAPI analizando los contratos TypeScript del frontend para garantizar compatibilidad exacta de la API

**En tiempo de ejecución:**
- **Google Gemini 2.0 Flash** analiza cada dataset dinámicamente: determina qué métricas mostrar como KPIs, qué tipo de gráfico es más apropiado para cada combinación de columnas, y redacta el resumen ejecutivo en español con insights reales del dataset
