"""
Gemini integration — gemini-2.0-flash (free tier: 15 RPM / 1500 RPD).
Includes retry logic for 429 quota errors.
"""

import json
import os
import re
import textwrap
import time
from typing import Any

from google import genai
from google.genai import types

from models import AnalyzeRequest, AnalysisResult


def _get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")
    return genai.Client(api_key=api_key)


# ── Prompt builder ────────────────────────────────────────────────────────────

def _fmt_col(col: Any) -> str:
    parts = [f'"{col.name}" ({col.type}, {col.count} values, {col.unique} unique)']
    if col.type == "number" and col.sum is not None:
        parts.append(
            f"sum={col.sum:.2f}, mean={col.mean:.2f}, min={col.min:.2f}, max={col.max:.2f}"
        )
    if col.topValues:
        top = ", ".join(f'"{t.value}"({t.count})' for t in col.topValues[:5])
        parts.append(f"top: {top}")
    return " | ".join(parts)


def build_prompt(req: AnalyzeRequest) -> str:
    cols_text = "\n".join(f"  - {_fmt_col(c)}" for c in req.columns)
    sample_text = json.dumps(req.sample[:10], ensure_ascii=False, default=str)

    return textwrap.dedent(f"""
        You are a senior data analyst. Analyze the following dataset metadata and
        return ONLY a valid JSON object — no markdown, no backticks, no extra text.

        ## Dataset
        File: {req.fileName}
        Rows: {req.rowCount}
        Columns ({len(req.columns)}):
        {cols_text}

        Sample rows (first 10):
        {sample_text}

        ## Task
        Return a JSON object with this exact shape:
        {{
          "summary": "<2-4 sentence executive summary in Spanish>",
          "keywords": ["<5-8 concise Spanish keyword phrases>"],
          "kpis": [
            {{"label": "<short label>", "value": "<formatted value>", "hint": "<optional context>"}}
          ],
          "charts": [
            {{
              "type": "<bar|line|area|pie|scatter>",
              "title": "<descriptive Spanish title>",
              "description": "<one sentence Spanish description>",
              "xKey": "<exact column name for X axis>",
              "yKeys": ["<exact column name(s) to aggregate>"],
              "data": []
            }}
          ]
        }}

        ## Rules
        - summary: Spanish, 2-4 sentences, highlight the main metric, key category, and trends.
        - keywords: 5-8 Spanish short phrases.
        - kpis: 3-6 items with real values from column stats. Format large numbers with K/M suffix.
        - charts: 3-5 charts. Use bar for category vs numeric, line/area for temporal trends,
          pie for category distribution (max 8 slices), scatter for correlated numerics.
          xKey and yKeys MUST be exact column names. Leave data as [].
        - Output ONLY the JSON object. No markdown, no backticks, no explanation.
    """).strip()


# ── Main function ─────────────────────────────────────────────────────────────

def analyze(req: AnalyzeRequest) -> AnalysisResult:
    client = _get_client()
    prompt = build_prompt(req)

    last_exc: Exception = RuntimeError("Unknown error")

    for attempt in range(3):  # up to 3 attempts with backoff
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=2048,
                ),
            )
            break  # success
        except Exception as exc:
            last_exc = exc
            msg = str(exc)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                wait = 20 * (attempt + 1)  # 20s → 40s → 60s
                time.sleep(wait)
                continue
            raise  # non-429: fail immediately
    else:
        raise RuntimeError(
            "Límite de cuota de Gemini alcanzado. "
            "Espera un minuto y vuelve a intentarlo. "
            f"(detalle: {last_exc})"
        )

    raw = response.text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    parsed = json.loads(raw)
    return AnalysisResult(**parsed)
