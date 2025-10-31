import io
from datetime import datetime, date
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import pandas as pd
from rapidfuzz import process, fuzz
import orjson
from pathlib import Path
from dateutil.relativedelta import relativedelta

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "eol_dataset.csv"

# Load dataset once at startup
def load_dataset():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    # Normalize helpful lookup fields
    for col in ["vendor", "model"]:
        df[col] = df[col].astype(str).str.strip()
        df[col + "_norm"] = df[col].str.lower().str.replace(r"\s+", " ", regex=True)
    return df

DATASET = load_dataset()


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s or not isinstance(s, str):
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%d-%m-%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except Exception:
            continue
    return None


def compute_risk(rec: Dict[str, Any]) -> Dict[str, Any]:
    eol = parse_date(rec.get("end_of_life"))
    eos = parse_date(rec.get("end_of_support"))
    target = eol or eos
    out = {
        "risk_level": "unknown",
        "months_to_eol": None,
        "days_to_eol": None,
        "window_bucket": None,
        "recommended_refresh_date": None,
    }
    if not target:
        return out
    today = date.today()
    delta = relativedelta(target, today)
    months = delta.years * 12 + delta.months
    out["months_to_eol"] = months
    out["days_to_eol"] = (target - today).days
    if months <= 0:
        lvl, bucket = "expired", "expired"
    elif months <= 3:
        lvl, bucket = "critical", "0-3"
    elif months <= 6:
        lvl, bucket = "high", "3-6"
    elif months <= 12:
        lvl, bucket = "medium", "6-12"
    elif months <= 24:
        lvl, bucket = "low", "12-24"
    else:
        lvl, bucket = "low", "24+"
    out["risk_level"], out["window_bucket"] = lvl, bucket
    refresh_target = target - relativedelta(months=6)
    out["recommended_refresh_date"] = refresh_target.isoformat() if refresh_target else None
    return out


class AssetIn(BaseModel):
    vendor: Optional[str] = None
    model: str


class CheckRequest(BaseModel):
    assets: List[AssetIn]
    min_score: int = 85  # fuzzy threshold 0-100


def normalize(s: Optional[str]) -> str:
    return (s or "").strip().lower().replace("\n", " ").replace("\t", " ")


def best_match(vendor: str, model: str, min_score: int = 85) -> Optional[Dict[str, Any]]:
    # Build candidate universe filtered by vendor if provided
    model_norm = normalize(model)
    vendor_norm = normalize(vendor)
    df = DATASET
    if vendor_norm:
        cand = df[df["vendor_norm"].str.contains(vendor_norm, na=False)]
        if cand.empty:
            cand = df  # fallback to all
    else:
        cand = df

    # RapidFuzz fuzzy match on model_norm against dataset model_norm
    choices = cand["model_norm"].tolist()
    if not choices:
        return None

    match, score, idx = process.extractOne(
        query=model_norm,
        choices=choices,
        scorer=fuzz.WRatio
    )

    if score < min_score:
        return None

    row = {
        key: (None if pd.isna(value) else value)
        for key, value in cand.iloc[idx].to_dict().items()
    }
    row["match_score"] = int(score)
    return row

@router.post("/check-eol")
def check_eol(req: CheckRequest):
    results = []
    for a in req.assets:
        bm = best_match(a.vendor or "", a.model, req.min_score)
        if bm:
            payload = {
                "input_vendor": a.vendor,
                "input_model": a.model,
                "vendor": bm.get("vendor"),
                "model": bm.get("model"),
                "category": bm.get("category"),
                "end_of_sale": bm.get("end_of_sale"),
                "end_of_support": bm.get("end_of_support"),
                "end_of_life": bm.get("end_of_life"),
                "recommended_replacement": bm.get("recommended_replacement"),
                "advisory_url": bm.get("advisory_url"),
                "match_score": bm.get("match_score"),
            }
            payload.update(compute_risk(payload))
            results.append(payload)
        else:
            results.append({
                "input_vendor": a.vendor,
                "input_model": a.model,
                "error": "NO_MATCH",
                "match_score": 0
            })
    return results

@router.post("/check-eol/upload")
async def check_eol_upload(file: UploadFile = File(...), min_score: int = 85):
    if not file.filename.endswith((".csv", ".txt")):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")
    content = await file.read()
    df = pd.read_csv(io.BytesIO(content))
    # Expect columns: vendor, model (case-insensitive)
    cols = {c.lower(): c for c in df.columns}
    if "model" not in cols:
        raise HTTPException(status_code=400, detail="CSV must include a 'model' column. Optional: 'vendor'")

    out = []
    for _, row in df.iterrows():
        vendor = str(row.get(cols.get("vendor", ""), "") or "")
        model = str(row.get(cols["model"]) or "")
        bm = best_match(vendor, model, min_score=min_score)
        if bm:
            payload = {
                "input_vendor": vendor,
                "input_model": model,
                "vendor": bm.get("vendor"),
                "model": bm.get("model"),
                "category": bm.get("category"),
                "end_of_sale": bm.get("end_of_sale"),
                "end_of_support": bm.get("end_of_support"),
                "end_of_life": bm.get("end_of_life"),
                "recommended_replacement": bm.get("recommended_replacement"),
                "advisory_url": bm.get("advisory_url"),
                "match_score": bm.get("match_score"),
            }
            payload.update(compute_risk(payload))
            out.append(payload)
        else:
            out.append({
                "input_vendor": vendor,
                "input_model": model,
                "error": "NO_MATCH",
                "match_score": 0
            })

    # Return as JSON
    return out
