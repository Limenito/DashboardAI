"""
IA Dashboard — FastAPI Backend
POST /analyze  →  AnalysisResult (JSON)
"""

import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import AnalyzeRequest, AnalysisResult
import gemini as gemini_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IA Dashboard API",
    description="Receives Excel metadata and returns AI-generated dashboard specs.",
    version="1.1.0",
)

_allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    key = os.environ.get("GEMINI_API_KEY", "")
    return {
        "status": "ok",
        # Shows first/last 4 chars so you can verify in Render without exposing the full key
        "gemini_key_preview": f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "NOT SET",
        "gemini_key_length": len(key),
    }


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(req: AnalyzeRequest) -> AnalysisResult:
    logger.info(
        "Analyzing '%s' — %d rows, %d columns",
        req.fileName, req.rowCount, len(req.columns)
    )
    try:
        result = gemini_service.analyze(req)
        logger.info(
            "Analysis complete — %d KPIs, %d charts",
            len(result.kpis), len(result.charts)
        )
        return result
    except Exception as exc:
        logger.exception("Gemini analysis failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
