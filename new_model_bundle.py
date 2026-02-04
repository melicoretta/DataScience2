# monotone_bundle.py
from __future__ import annotations
from typing import Dict, List, Any
import numpy as np
import pandas as pd


class MonotoneMortalityBundle:
    """
    Self-contained predictor.
    Guarantees:
      MORTALITY_INHOSPITAL <= MORTALITY_90DAY <= MORTALITY_180DAY
    """

    def __init__(self, target_cols: List[str], feature_columns: List[str], models: Dict[str, Any]):
        self.target_cols = target_cols
        self.feature_columns = feature_columns
        self.models = models

    def _align_X(self, X: pd.DataFrame) -> pd.DataFrame:
        return X.reindex(columns=self.feature_columns)

    def predict_proba(self, X: pd.DataFrame) -> Dict[str, np.ndarray]:
        X_aligned = self._align_X(X)

        raw = {t: self.models[t].predict_proba(X_aligned)[:, 1] for t in self.target_cols}

        mono: Dict[str, np.ndarray] = {}
        prev = None
        for t in self.target_cols:
            p = raw[t].copy()
            if prev is not None:
                p = np.maximum(p, prev)
            mono[t] = p
            prev = p

        return mono

    def predict_proba_single(self, X_one_row: pd.DataFrame) -> Dict[str, float]:
        probs = self.predict_proba(X_one_row)
        return {t: float(probs[t][0]) for t in self.target_cols}
