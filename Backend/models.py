from typing import Literal, Optional
from pydantic import BaseModel, field_validator


# ── Request ───────────────────────────────────────────────────────────────────

ColumnType = Literal["number", "date", "category", "text"]


class TopValue(BaseModel):
    value: str
    count: int


class ColumnStat(BaseModel):
    name: str
    type: ColumnType
    # Defensive defaults: frontend always sends these, but guard against nulls
    count: Optional[int] = 0
    nulls: Optional[int] = 0
    unique: Optional[int] = 0
    min: Optional[float] = None
    max: Optional[float] = None
    mean: Optional[float] = None
    sum: Optional[float] = None
    topValues: Optional[list[TopValue]] = None

    @field_validator("count", "nulls", "unique", mode="before")
    @classmethod
    def coerce_int(cls, v):
        """Coerce float->int in case the frontend sends 100.0 instead of 100."""
        if v is None:
            return 0
        return int(v)


class AnalyzeRequest(BaseModel):
    fileName: str
    rowCount: int
    columns: list[ColumnStat]
    sample: list[dict]  # first 20 rows as-is


# ── Response (mirrors frontend AnalysisResult) ────────────────────────────────

ChartType = Literal["bar", "line", "area", "pie", "scatter"]


class KPI(BaseModel):
    label: str
    value: str
    hint: Optional[str] = None


class ChartSpec(BaseModel):
    type: ChartType
    title: str
    description: Optional[str] = None
    xKey: str
    yKeys: list[str]
    data: list[dict] = []


class AnalysisResult(BaseModel):
    summary: str
    keywords: list[str]
    kpis: list[KPI]
    charts: list[ChartSpec]
