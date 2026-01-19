"""Reusable training utilities (NO weights/bias extraction).

- Works for any tabular CSV dataset.
- Trains multiple classical ML models.
- Optional XGBoost if installed.
- Includes threshold selection to reach a target recall.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from xgboost import XGBClassifier

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    average_precision_score,
    roc_auc_score,
    precision_recall_curve,
    classification_report,
    confusion_matrix,
)
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier


# try:
#     from xgboost import XGBClassifier  # type: ignore
#     _HAS_XGB = True
# except Exception:
#     XGBClassifier = None  # type: ignore
#     _HAS_XGB = False


@dataclass
class TrainConfig:
    target_col: str
    drop_cols: Optional[List[str]] = None
    test_size: float = 0.2
    random_state: int = 42
    target_recall: float = 0.90


def load_dataset_csv(path: str, target_col: str, drop_cols: Optional[List[str]] = None) -> Tuple[pd.DataFrame, pd.Series]:
    """Load CSV and return X, y."""
    df = pd.read_csv(path)
    if drop_cols:
        drop_cols = [c for c in drop_cols if c in df.columns]
        df = df.drop(columns=drop_cols)

    if target_col not in df.columns:
        raise ValueError(f"target_col='{target_col}' not found. Columns: {list(df.columns)[:]}")

    X = df.drop(columns=[target_col])
    y = df[target_col]
    return X, y


def split_data(
    X: pd.DataFrame,
    y: pd.Series,
    test_size: float = 0.2,
    random_state: int = 42,
):
    """Stratified train/val split."""
    return train_test_split(
        X, y,
        test_size=test_size,
        random_state=random_state,
        stratify=y,
    )


def make_models(random_state: int = 42) -> Dict[str, Pipeline]:
    """Create model pipelines with imputation (and scaling where useful)."""
    models: Dict[str, Pipeline] = {}

    # Logistic Regression: impute + scale
    models["logreg"] = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
    ])

    # Decision Tree: impute only
    models["dt"] = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("model", DecisionTreeClassifier(max_depth=4, min_samples_leaf=50, class_weight="balanced", random_state=random_state)),
    ])

    # Random Forest: impute only
    models["rf"] = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("model", RandomForestClassifier(
            n_estimators=400,
            random_state=random_state,
            n_jobs=-1,
            class_weight="balanced_subsample",
        )),
    ])

    # XGBoost: impute only (optional)
    # if _HAS_XGB:
    models["xgb"] = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("model", XGBClassifier(
            n_estimators=600,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=random_state,
            n_jobs=-1,
            eval_metric="logloss",
            )),
        ])

    return models


def fit_models(models: Dict[str, Pipeline], X_train: pd.DataFrame, y_train: pd.Series) -> Dict[str, Pipeline]:
    """Fit all models and return fitted dict."""
    fitted = {}
    for name, pipe in models.items():
        pipe.fit(X_train, y_train)
        fitted[name] = pipe
    return fitted


def predict_proba(model: Pipeline, X: pd.DataFrame) -> np.ndarray:
    """Return positive-class probability."""
    if not hasattr(model, "predict_proba"):
        raise ValueError("Model has no predict_proba().")
    return model.predict_proba(X)[:, 1]


def find_threshold_for_recall(y_true: pd.Series, y_prob: np.ndarray, target_recall: float = 0.90) -> float:
    """Pick a threshold that achieves at least target_recall, if possible."""
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    if len(thresholds) == 0:
        return 0.5

    idxs = np.where(recall[:-1] >= target_recall)[0]
    if len(idxs) == 0:
        return float(thresholds[0])
    return float(thresholds[idxs[-1]])


def evaluate_model(y_true: pd.Series, y_prob: np.ndarray, threshold: float = 0.5) -> Dict[str, float]:
    """Compute AUROC and Average Precision."""
    ap = float(average_precision_score(y_true, y_prob))
    auroc = float(roc_auc_score(y_true, y_prob))
    return {"ap": ap, "auroc": auroc, "threshold": float(threshold)}


def print_reports(y_true: pd.Series, y_prob: np.ndarray, threshold: float = 0.5) -> None:
    y_pred = (y_prob >= threshold).astype(int)
    print("Confusion matrix:\n", confusion_matrix(y_true, y_pred))
    print("\nClassification report:\n", classification_report(y_true, y_pred, digits=4))


def select_best_model(metrics: Dict[str, Dict[str, float]]) -> str:
    """Select best model by AP then AUROC."""
    best_name = None
    best_key = None
    for name, m in metrics.items():
        key = (m.get("ap", -1.0), m.get("auroc", -1.0))
        if best_key is None or key > best_key:
            best_key = key
            best_name = name
    if best_name is None:
        raise ValueError("No models to select from.")
    return best_name


def train_end_to_end(csv_path: str, cfg: TrainConfig):
    """Full pipeline: load -> split -> fit -> eval -> threshold tuning -> select best."""
    X, y = load_dataset_csv(csv_path, cfg.target_col, cfg.drop_cols)
    X_train, X_val, y_train, y_val = split_data(X, y, cfg.test_size, cfg.random_state)

    models = make_models(cfg.random_state)
    fitted = fit_models(models, X_train, y_train)

    metrics: Dict[str, Dict[str, float]] = {}
    probs: Dict[str, np.ndarray] = {}

    for name, model in fitted.items():
        y_prob = predict_proba(model, X_val)
        probs[name] = y_prob
        thr = find_threshold_for_recall(y_val, y_prob, cfg.target_recall)
        metrics[name] = evaluate_model(y_val, y_prob, thr)

    best = select_best_model(metrics)
    return {
        "best_name": best,
        "best_model": fitted[best],
        "metrics": metrics,
        "val": (X_val, y_val),
        "val_probs": probs,
    }
