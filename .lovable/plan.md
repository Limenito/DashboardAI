
# IA Dashboard desde Excel

App full-stack que recibe un Excel, lo procesa con IA y genera un dashboard interactivo dinámico con gráficos elegidos por el LLM y un resumen ejecutivo.

## Arquitectura

**Frontend (Lovable)** — React + TanStack Start + Tailwind, conectado a Supabase (Lovable Cloud) para Storage y persistencia.

**Backend FastAPI (entregable separado)** — Te genero un repo descargable (`backend.zip` en /mnt/documents) listo para desplegar en Railway/Render con:
- `POST /upload` → recibe Excel, parsea con `pandas/openpyxl`, detecta tipos de columnas
- `POST /analyze` → llama Gemini/OpenAI con el resumen estadístico y obtiene: KPIs sugeridos, gráficos recomendados (tipo + columnas), resumen ejecutivo, palabras clave
- `GET /analysis/{id}` → recupera análisis guardado
- CORS abierto, `requirements.txt`, `Dockerfile`, `README` con diagrama de arquitectura e instrucciones

El frontend apuntará al FastAPI vía variable `VITE_API_URL` (configurable). Mientras desarrollas localmente, también dejo un fallback usando server routes de TanStack para que la demo funcione sin desplegar FastAPI.

## Modelo de datos (Supabase)

- `analyses` — id, created_at, file_name, share_token (UUID público), file_url (Storage), summary (text), keywords (jsonb), kpis (jsonb), charts (jsonb), raw_stats (jsonb)
- Bucket `excels` (público para lectura via token)
- RLS: lectura pública por `share_token`, escritura desde service role del backend

Elegimos relacional (Postgres) por la naturaleza estructurada del análisis y para soportar consultas por token; jsonb para flexibilidad en gráficos dinámicos.

## Flujo de usuario

1. **Landing minimalista** — hero centrado, dropzone grande para .xlsx/.xls, botón "Analizar"
2. **Estado de carga** — barra de progreso con pasos: subiendo → procesando → consultando IA → renderizando
3. **Dashboard generado** — URL única `/dashboard/{shareToken}` que contiene:
   - Header con nombre de archivo y botón "Compartir / Copiar enlace"
   - **Resumen ejecutivo** (card destacada, generado por IA en español)
   - **Grid de KPIs** (4-6 tarjetas: total, promedio, máx, conteo, etc., elegidos por la IA)
   - **Gráficos interactivos** (Recharts) — la IA decide qué tipos usar entre: barras, líneas, área, pie/donut, scatter, treemap. Cada uno con título descriptivo y leyenda
   - **Palabras clave / insights** — chips con hallazgos relevantes
   - **Tabla de datos** colapsable con paginación
4. **Historial** (opcional, página `/recent`) — últimos 10 análisis públicos por share_token guardado en localStorage del usuario

## IA

- Modelo: Gemini 2.5 Flash vía la API que prefieras configurar en el backend (la prueba pide Gemini/OpenAI directo, no Lovable AI Gateway)
- Prompt estructurado con tool calling para devolver JSON garantizado: `{ summary, kpis[], charts[{type, title, xKey, yKeys, data}], keywords[] }`
- El backend envía a la IA solo: nombres de columnas, tipos detectados, estadísticas descriptivas (describe()), top values categóricos y muestra de 20 filas — nunca el dataset completo

## Diseño

- Estilo Apple-like minimalista: blanco/gris muy claro, tipografía Inter, mucho espacio en blanco, cards con sombras suaves, acentos en azul índigo
- Modo claro por defecto, soporte modo oscuro
- Totalmente responsive (mobile-first, los gráficos se reorganizan en columna única)
- Microanimaciones en transiciones de upload → dashboard

## Entregables al finalizar

1. App Lovable funcionando (frontend + Supabase)
2. `backend.zip` descargable con FastAPI + README + Dockerfile
3. README con: diagrama de arquitectura, instrucciones locales (frontend y backend), descripción de cómo se usó IA en desarrollo y dentro de la app
4. Instrucciones para conectar GitHub y desplegar (Vercel para frontend, Railway para FastAPI)
