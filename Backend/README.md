# IA Dashboard — Backend (FastAPI)

API REST que recibe metadata de un Excel parseado en el frontend y devuelve un análisis generado por Gemini: resumen ejecutivo, KPIs y especificaciones de gráficos.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Lovable)             │
│                                                          │
│  1. Usuario sube .xlsx                                   │
│  2. xlsx lib parsea el archivo CLIENT-SIDE               │
│     → extrae columnas, tipos, stats, muestra (20 rows)   │
│  3. POST /analyze con JSON (sin el archivo binario)      │
│  4. Renderiza charts + KPIs + resumen                    │
└──────────────────────┬──────────────────────────────────┘
                       │ POST /analyze
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                      │
│                                                          │
│  main.py   → Rutas, CORS, manejo de errores              │
│  models.py → Pydantic: AnalyzeRequest / AnalysisResult   │
│  gemini.py → Prompt engineering + llamada a Gemini API   │
└──────────────────────┬──────────────────────────────────┘
                       │ generate_content()
                       ▼
             Google Gemini 1.5 Flash (free tier)
```

### Decisión de arquitectura

- **Sin base de datos**: los análisis viven en `sessionStorage` del navegador. Sin estado en el servidor → deployment stateless, escala horizontalmente.
- **Sin upload de archivo**: el Excel se parsea en el cliente con la librería `xlsx`. Al backend solo llega un JSON liviano (~10KB) con estadísticas y muestra, no el binario. Más rápido y sin límites de tamaño de archivo en el servidor.
- **Gemini 1.5 Flash**: modelo gratuito (15 RPM, 1M tokens/día), suficiente para datasets de uso normal. Retorna JSON estructurado con `summary`, `kpis` y `charts`.

---

## Ejecución local

### 1. Requisitos
- Python 3.11+
- Clave de API de Gemini (gratis en [aistudio.google.com](https://aistudio.google.com/app/apikey))

### 2. Instalar dependencias
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Edita .env y agrega tu GEMINI_API_KEY
```

### 4. Levantar el servidor
```bash
uvicorn main:app --reload
# API disponible en http://localhost:8000
# Docs interactivos en http://localhost:8000/docs
```

### 5. Conectar el frontend
En el proyecto de Lovable, agrega la variable de entorno:
```
VITE_API_URL=http://localhost:8000
```

---

## Despliegue en Railway

1. Crea un nuevo proyecto en [railway.app](https://railway.app)
2. Conecta tu repositorio de GitHub
3. Railway detecta el `Procfile` automáticamente
4. Agrega la variable de entorno `GEMINI_API_KEY` en el panel de Railway
5. Opcionalmente, agrega `ALLOWED_ORIGINS=https://tu-frontend.vercel.app`

---

## Contrato de API

### `POST /analyze`

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
      "topValues": [{"value": "Norte", "count": 420}]
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
  "sample": [{"Región": "Norte", "Ventas": 12000}, ...]
}
```

**Response:**
```json
{
  "summary": "El archivo ventas_2024.xlsx contiene 1,500 registros...",
  "keywords": ["ventas totales", "región norte", "crecimiento Q4"],
  "kpis": [
    {"label": "Total Ventas", "value": "12.6M", "hint": "Promedio 8.4K por registro"}
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

> **Nota sobre `data: []`**: El backend devuelve arrays vacíos en `charts[].data`. El frontend los popula automáticamente agregando los datos originales del Excel (función `enrichCharts` en `src/lib/analysis.ts`).

---

## Uso de IA en el desarrollo

- **Generación del frontend**: Lovable (vibecoding) generó el 100% del código React incluyendo el sistema de rutas con TanStack Router, componentes de shadcn/ui y la lógica de parseo de Excel.
- **Generación del backend**: Claude generó el backend FastAPI analizando el contrato de tipos TypeScript del frontend para garantizar compatibilidad exacta de la API.
- **IA en runtime**: Gemini 1.5 Flash analiza cada dataset dinámicamente: elige qué métricas mostrar como KPIs, qué tipo de gráfico es más apropiado para cada combinación de columnas, y redacta el resumen ejecutivo en español.
