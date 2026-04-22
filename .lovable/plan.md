
# Conectar tu backend FastAPI al frontend

## Qué necesito verificar primero

No pude abrir el `.zip` en modo plan (es binario y este modo es de solo lectura). Al pasar a modo default, voy a:

1. Descomprimir tu `ia-dashboard-backend.zip` en `/tmp` y leer `main.py` / `routes` / `README`.
2. Confirmar que expone (o adaptar el frontend para que coincida con) este contrato que ya usa `src/lib/analysis.ts`:

   **Endpoint**: `POST {VITE_API_URL}/analyze`
   **Request JSON**:
   ```json
   { "fileName": "...", "rowCount": 123, "columns": ColumnStat[], "sample": Row[] }
   ```
   **Response JSON**:
   ```json
   {
     "summary": "string",
     "keywords": ["..."],
     "kpis": [{ "label": "...", "value": "...", "hint": "..." }],
     "charts": [{ "type": "bar|line|area|pie|scatter", "title": "...", "xKey": "...", "yKeys": ["..."], "data": [...] }]
   }
   ```
3. Verificar CORS (debe permitir el origen de Lovable preview + dominio publicado).

## Cambios en el frontend

Según lo que encuentre, haré una de estas dos cosas (sin reescrituras grandes):

- **Caso A — tu backend ya cumple el contrato**: solo configuro `VITE_API_URL` y listo. El fallback heurístico se desactiva automáticamente cuando la variable existe.
- **Caso B — tu backend tiene otro shape** (por ejemplo recibe el archivo binario en `/upload` en vez de JSON con stats, o devuelve campos con otros nombres): ajusto `src/lib/analysis.ts` para mapear request/response a tu formato real. El resto del frontend (dashboard, charts, KPIs, tabla) no cambia porque consume el tipo `AnalysisResult` ya normalizado.

## Configuración de la URL del backend

Como `VITE_*` se inyecta en build time y este proyecto no usa `.env`, voy a:

- Añadir la URL de tu backend desplegado directamente en `src/lib/analysis.ts` como constante con fallback (`import.meta.env.VITE_API_URL ?? "https://tu-backend..."`).
- Necesito que me digas la URL pública donde desplegarás el FastAPI (Railway / Render / Fly / local con ngrok). Si todavía no está desplegado, lo dejo apuntando a `http://localhost:8000` para que pruebes en tu máquina.

## Detalles técnicos

- Se mantiene `sessionStorage` como persistencia (sin Lovable Cloud, según tu decisión previa).
- Si tu backend devuelve `charts[].data` vacío, `enrichCharts()` ya lo rellena agregando `parsed.rows` por `xKey/yKeys` — no hay que tocar nada.
- Si tu backend espera el archivo binario en lugar del resumen estadístico, cambiaré `requestAnalysis()` para hacer `multipart/form-data` con el `File` original (eso requiere también pasar el `File` desde `src/routes/index.tsx`, cambio mínimo de 3 líneas).
- Manejo de errores: si el backend falla, mostrar `toast.error` con el status y caer al modo demo local opcionalmente (te pregunto en ejecución qué prefieres).

## Lo que necesito de ti

1. **URL pública del backend** (o confirmar que es local en `:8000`).
2. ¿Tu `/analyze` recibe **JSON con stats** (contrato actual) o **el archivo Excel directamente** (`multipart/form-data`)?

Con eso aplico los ajustes en una sola pasada.
