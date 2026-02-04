from fastapi import FastAPI
import joblib
from pydantic import BaseModel
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
from pathlib import Path
import __main__
import joblib

from monotone_bundle import MonotoneMortalityBundle

BASE_DIR = Path(__file__).resolve().parent
BUNDLE_PATH = BASE_DIR / "mortality_multihorizon_model.joblib"

# Compatibility shim:
# If an OLD joblib still points to __main__.MonotoneMortalityBundle, this prevents crash.
__main__.MonotoneMortalityBundle = MonotoneMortalityBundle

print("✅ Loading bundle from:", BUNDLE_PATH)

bundle = joblib.load(BUNDLE_PATH)


# -----------------------------
# Expected features
# - We will prefer the feature list stored inside the bundle
# - Fallback to your hard-coded expected_features if needed
# -----------------------------
expected_features = getattr(bundle, "feature_columns", None)

if expected_features is None:
    # Fallback to your previous list (only used if bundle doesn't contain it)
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
# (same as your file, unchanged)
# -----------------------------
class Client(BaseModel):
    GCS_max: float = 14.0
    GCS_mean: float = 12.5

    Lactate_min: float = 1.2
    Lactate_max: float = 3.8
    Lactate_mean: float = 2.4

    BUN_min: float = 18.0
    BUN_mean: float = 32.0
    BUN_max: float = 45.0

    Bilirubin_max: float = 2.1
    Bilirubin_mean: float = 1.4

    Albumin_mean: float = 3.0
    Albumin_min: float = 2.6
    Albumin_max: float = 3.5

    AlkPhos_mean: float = 95.0
    AlkPhos_max: float = 140.0
    AlkPhos_min: float = 70.0

    PT_mean: float = 14.0
    PT_min: float = 12.5

    INR_mean: float = 1.2
    INR_min: float = 1.0

    Phosphate_mean: float = 3.2
    Phosphate_max: float = 4.0

    PaO2_mean: float = 85.0
    PaO2_max: float = 110.0

    aPTT_mean: float = 32.0
    aPTT_min: float = 28.0

    AG_mean: float = 14.5
    AG_max: float = 18.0
    AG_min: float = 12.0
    AG_std: float = 1.9

    SYSBP_min: float = 92.0
    SYSBP_mean: float = 118.0
    SYSBP_std: float = 14.0

    DIASBP_min: float = 55.0
    DIASBP_mean: float = 72.0

    age: float = 67.0

    RR_mean: float = 22.0
    RR_max: float = 30.0
    RR_min: float = 16.0

    TEMP_std: float = 0.6
    TEMP_min: float = 36.4

    HR_mean: float = 96.0
    HR_max: float = 128.0
    HR_std: float = 12.0

    RDW_max: float = 16.0
    RDW_mean: float = 14.2
    RDW_min: float = 13.0
    RDW_std: float = 0.7

    age_adj_comorbidity_score: float = 5.0

    MEANBP_min: float = 62.0
    MEANBP_mean: float = 78.0


# -----------------------------
# App + CORS
# -----------------------------
app = FastAPI(title="ICU Mortality API (Monotone Multi-Horizon)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for dev; lock down for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _make_df(client: Client) -> pd.DataFrame:
    """Build a 1-row DataFrame with the correct column order."""
    data_dict = client.model_dump()  # pydantic v2 (use .dict() if v1)
    df = pd.DataFrame([data_dict]).reindex(columns=expected_features)
    return df


def _format_one(prob: float, threshold: float = 0.5) -> Dict[str, Any]:
    """Standardize output fields."""
    return {
        "mortality_probability": round(float(prob), 8),
        "predicted_class_at_0.5": int(float(prob) >= threshold),
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.post("/predict_all")
def predict_all(client: Client):
    """
    One endpoint returns ALL horizons with guaranteed monotonic ordering.
    Output will always satisfy:
        inhospital <= 90day <= 180day
    """
    df = _make_df(client)

    # bundle.predict_proba_single returns a dict: {target_name: probability}
    # and is guaranteed monotone by design.
    probs = bundle.predict_proba_single(df)

    # If you used your real target names in training, they will appear here:
    # "MORTALITY_INHOSPITAL", "MORTALITY_90DAY", "MORTALITY_180DAY"
    out = {
        "model": "MonotoneBundle",
        "predictions": {
            k: _format_one(v) for k, v in probs.items()
        }
    }
    return out
