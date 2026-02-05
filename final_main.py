from fastapi import FastAPI, HTTPException
import joblib
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, Optional
from pathlib import Path
import __main__

from final_model_bundle import MonotoneMortalityBundle

BASE_DIR = Path(__file__).resolve().parent
BUNDLE_PATH = BASE_DIR / "final_mortality_multihorizon_model.joblib"

# Compatibility shim:
# If an OLD joblib still points to __main__.MonotoneMortalityBundle, this prevents crash.
__main__.MonotoneMortalityBundle = MonotoneMortalityBundle

print("✅ Loading bundle from:", BUNDLE_PATH)
bundle = joblib.load(BUNDLE_PATH)

# -----------------------------
# Expected features
# - Prefer list stored in bundle
# - Fallback to hard-coded list
# -----------------------------
expected_features = getattr(bundle, "feature_columns", None)

if expected_features is None:
    expected_features = [
        "GCS_max", "GCS_mean",
        "Lactate_min", "Lactate_max", "Lactate_mean",
        "BUN_min", "BUN_mean", "BUN_max",
        "Bilirubin_max", "Bilirubin_mean",
        "Albumin_mean", "Albumin_min", "Albumin_max",
        "AlkPhos_mean", "AlkPhos_max", "AlkPhos_min",
        "PT_mean", "PT_min",
        "INR_mean", "INR_min",
        "Phosphate_mean", "Phosphate_max",
        "PaO2_mean", "PaO2_max",
        "aPTT_mean", "aPTT_min",
        "AG_mean", "AG_max", "AG_min", "AG_std",
        "SYSBP_min", "SYSBP_mean", "SYSBP_std",
        "DIASBP_min", "DIASBP_mean",
        "age",
        "RR_mean", "RR_max", "RR_min",
        "TEMP_std", "TEMP_min",
        "HR_mean", "HR_max", "HR_std",
        "RDW_max", "RDW_mean", "RDW_min", "RDW_std",
        "age_adj_comorbidity_score",
        "MEANBP_min", "MEANBP_mean",
    ]

# -----------------------------
# Input schema
# -----------------------------
from pydantic import BaseModel

class Client(BaseModel):
    GCS_max: Optional[float] = None
    GCS_mean: Optional[float] = None

    Lactate_min: Optional[float] = None
    Lactate_max: Optional[float] = None
    Lactate_mean: Optional[float] = None

    BUN_min: Optional[float] = None
    BUN_mean: Optional[float] = None
    BUN_max: Optional[float] = None

    Bilirubin_max: Optional[float] = None
    Bilirubin_mean: Optional[float] = None

    Albumin_mean: Optional[float] = None
    Albumin_min: Optional[float] = None
    Albumin_max: Optional[float] = None

    AlkPhos_mean: Optional[float] = None
    AlkPhos_max: Optional[float] = None
    AlkPhos_min: Optional[float] = None

    PT_mean: Optional[float] = None
    PT_min: Optional[float] = None

    INR_mean: Optional[float] = None
    INR_min: Optional[float] = None

    Phosphate_mean: Optional[float] = None
    Phosphate_max: Optional[float] = None

    PaO2_mean: Optional[float] = None
    PaO2_max: Optional[float] = None

    aPTT_mean: Optional[float] = None
    aPTT_min: Optional[float] = None

    AG_mean: Optional[float] = None
    AG_max: Optional[float] = None
    AG_min: Optional[float] = None
    AG_std: Optional[float] = None

    SYSBP_min: Optional[float] = None
    SYSBP_mean: Optional[float] = None
    SYSBP_std: Optional[float] = None

    DIASBP_min: Optional[float] = None
    DIASBP_mean: Optional[float] = None

    age: Optional[float] = None

    RR_mean: Optional[float] = None
    RR_max: Optional[float] = None
    RR_min: Optional[float] = None

    TEMP_std: Optional[float] = None
    TEMP_min: Optional[float] = None

    HR_mean: Optional[float] = None
    HR_max: Optional[float] = None
    HR_std: Optional[float] = None

    RDW_max: Optional[float] = None
    RDW_mean: Optional[float] = None
    RDW_min: Optional[float] = None
    RDW_std: Optional[float] = None

    age_adj_comorbidity_score: Optional[float] = None

    MEANBP_min: Optional[float] = None
    MEANBP_mean: Optional[float] = None


# -----------------------------
# App + CORS
# -----------------------------
app = FastAPI(title="ICU Mortality API (Monotone Multi-Horizon)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _make_df(client: Client) -> pd.DataFrame:
    """
    Build a 1-row DataFrame with the correct column order,
    and FORCE numeric float dtypes so XGBoost won't crash on nulls.
    """
    data_dict = client.model_dump()  # pydantic v2 (use .dict() if v1)
    df = pd.DataFrame([data_dict]).reindex(columns=expected_features)

    # CRITICAL: convert everything to numeric (null/None -> NaN) and float
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    df = df.astype(float)

    return df


def _format_one(prob: float, threshold: float = 0.5) -> Dict[str, Any]:
    return {
        "mortality_probability": round(float(prob), 8),
        "predicted_class_at_0.5": int(float(prob) >= threshold),
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.post("/predict_all")
def predict_all(client: Client):
    df = _make_df(client)
    try:
        probs = bundle.predict_proba_single(df)
        return {
            "model": "XGBoost",
            "predictions": {k: _format_one(v) for k, v in probs.items()},
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/feature_importance/{target}")
def feature_importance(target: str, top_n: int = 20):
    try:
        return {
            "target": target,
            "top_n": top_n,
            "importances": bundle.get_feature_importance(target=target, top_n=top_n),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/explain_one")
def explain_one(client: Client, top_n: int = 10):
    df = _make_df(client)
    try:
        probs = bundle.predict_proba_single(df)
        shap_info = bundle.explain_one(df, top_n=top_n)
        return {
            "predictions": {k: _format_one(v) for k, v in probs.items()},
            "shap": shap_info,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
