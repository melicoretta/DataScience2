# new_train_models.py
from pathlib import Path
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except Exception:
    HAS_XGB = False

from final_model_bundle import MonotoneMortalityBundle


BASE_DIR = Path(__file__).resolve().parent

CSV_PATH = BASE_DIR / "fifth_feature_df_14_01_2026.csv"
OUT_PATH = BASE_DIR / "final_mortality_multihorizon_model.joblib"

TARGET_COLS = ["MORTALITY_INHOSPITAL", "MORTALITY_90DAY", "MORTALITY_180DAY"]
DROP_COLS = ["SUBJECT_ID", "HADM_ID", "ICUSTAY_ID"]

RANDOM_STATE = 42
TEST_SIZE = 0.2
CAL_METHOD = "isotonic"
CAL_CV = 5


def make_model():
    if HAS_XGB:
        return Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("model", XGBClassifier(
                n_estimators=900,
                max_depth=4,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.9,
                eval_metric="logloss",
                n_jobs=-1,
                random_state=RANDOM_STATE
            )),
        ])

    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", LogisticRegression(
            max_iter=4000,
            class_weight="balanced"
        )),
    ])


def main():
    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    print("✅ Reading CSV:", CSV_PATH)
    df = pd.read_csv(CSV_PATH)

    # drop ID columns
    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns])

    # split
    X = df.drop(columns=TARGET_COLS)
    Y = df[TARGET_COLS].copy()

    X_train, X_val, Y_train, Y_val = train_test_split(
        X, Y,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
        stratify=Y[TARGET_COLS[-1]]
    )

    # train calibrated models
    models = {}
    for t in TARGET_COLS:
        cal = CalibratedClassifierCV(
            make_model(),
            method=CAL_METHOD,
            cv=CAL_CV
        )
        cal.fit(X_train, Y_train[t])
        models[t] = cal

    # AUROC check
    for t in TARGET_COLS:
        y_prob = models[t].predict_proba(X_val)[:, 1]
        auc = roc_auc_score(Y_val[t], y_prob)
        print(f"AUROC {t}: {auc:.4f}")

    # ---- SHAP background (REQUIRED for explainability) ----
    background_X = X_train.sample(
        n=min(300, len(X_train)),
        random_state=RANDOM_STATE
    ).copy()

    # ---- SINGLE bundle (DO NOT overwrite) ----
    bundle = MonotoneMortalityBundle(
        target_cols=TARGET_COLS,
        feature_columns=list(X.columns),
        models=models,
        background_X=background_X,
    )

    joblib.dump(bundle, OUT_PATH)
    print("✅ Saved bundle:", OUT_PATH)

    # sanity check (monotone guarantee)
    sample = X_val.sample(1, random_state=1)
    print("Sample preds:", bundle.predict_proba_single(sample))


if __name__ == "__main__":
    main()
