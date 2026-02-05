# new_model_bundle.py
from __future__ import annotations
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd


class MonotoneMortalityBundle:
    """
    Self-contained predictor.
    Guarantees:
      MORTALITY_INHOSPITAL <= MORTALITY_90DAY <= MORTALITY_180DAY
    """

    def __init__(
        self,
        target_cols: List[str],
        feature_columns: List[str],
        models: Dict[str, Any],
        background_X: Optional[pd.DataFrame] = None,
    ):
        self.target_cols = target_cols
        self.feature_columns = feature_columns
        self.models = models
        self.background_X = background_X

        # lazy cache
        self._shap_explainers: Dict[str, Any] = {}

    # -------------------------
    # Core helpers
    # -------------------------
    def _align_X(self, X: pd.DataFrame) -> pd.DataFrame:
        return X.reindex(columns=self.feature_columns)

    def _ensure_numeric_float(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Ensure all columns are numeric floats.
        - None/null/"" -> NaN
        - prevents XGBoost "object dtype / categorical" crash
        """
        Xn = X.copy()
        for c in Xn.columns:
            Xn[c] = pd.to_numeric(Xn[c], errors="coerce")
        return Xn.astype(float)

    def _get_fitted_pipeline(self, target: str):
        """
        Extract fitted Pipeline from CalibratedClassifierCV.
        cal.calibrated_classifiers_[0].estimator is the fitted pipeline.
        """
        clf = self.models[target]

        if hasattr(clf, "calibrated_classifiers_") and clf.calibrated_classifiers_:
            cc0 = clf.calibrated_classifiers_[0]
            if hasattr(cc0, "estimator"):
                return cc0.estimator

        # fallback (rare)
        if hasattr(clf, "estimator"):
            return clf.estimator

        raise RuntimeError(f"Could not extract fitted pipeline for target={target}")

    def _transform_with_imputer(self, pipe, X: pd.DataFrame) -> pd.DataFrame:
        """
        Apply the fitted imputer from the pipeline (if exists),
        then return a DataFrame with correct feature names.
        """
        if hasattr(pipe, "named_steps") and "imputer" in pipe.named_steps:
            X_imp = pipe.named_steps["imputer"].transform(X)  # numpy
        else:
            X_imp = X.values

        return pd.DataFrame(X_imp, columns=self.feature_columns)

    def _get_inner_estimator(self, target: str) -> Tuple[Any, str]:
        """
        Return underlying model (XGB/LR/unknown) INSIDE the calibrated pipeline.
        """
        pipe = self._get_fitted_pipeline(target)
        model = pipe
        if hasattr(pipe, "named_steps") and "model" in pipe.named_steps:
            model = pipe.named_steps["model"]

        name = model.__class__.__name__.lower()
        if "xgb" in name:
            return model, "xgb"
        if "logisticregression" in name or "linear" in name:
            return model, "linear"
        return model, "unknown"

    # -------------------------
    # Predictions (monotone)
    # -------------------------
    def predict_proba(self, X: pd.DataFrame) -> Dict[str, np.ndarray]:
        X_aligned = self._ensure_numeric_float(self._align_X(X))

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

    # -------------------------
    # Feature importance (global)
    # -------------------------
    def get_feature_importance(self, target: str, top_n: int = 20) -> List[Dict[str, Any]]:
        """
        Global importance per horizon:
          - XGB: feature_importances_
          - LogisticRegression: abs(coef_)
        """
        if target not in self.target_cols:
            raise ValueError(f"Unknown target: {target}")

        model, kind = self._get_inner_estimator(target)

        if hasattr(model, "feature_importances_"):
            imp = np.asarray(model.feature_importances_, dtype=float)
        elif hasattr(model, "coef_"):
            coef = np.asarray(model.coef_, dtype=float).reshape(-1)
            imp = np.abs(coef)
        else:
            raise RuntimeError(f"Model for {target} has no feature_importances_ or coef_.")

        if imp.shape[0] != len(self.feature_columns):
            raise RuntimeError(
                f"Importance length mismatch: got {imp.shape[0]} but expected {len(self.feature_columns)}."
            )

        order = np.argsort(-imp)
        out: List[Dict[str, Any]] = []
        for i in order[:top_n]:
            out.append({
                "feature": self.feature_columns[int(i)],
                "importance": float(imp[int(i)]),
                "model_kind": kind,
            })
        return out

    # -------------------------
    # SHAP explainability (local)
    # -------------------------
    def explain_one(self, X_one_row: pd.DataFrame, top_n: int = 10) -> Dict[str, Any]:
        """
        Local SHAP explanation per horizon for a single row.

        IMPORTANT:
        - Your models are CalibratedClassifierCV(Pipeline(imputer->model)).
        - SHAP must run on the underlying model with the SAME imputed features.
        - This function fixes the 'object dtype' crash by forcing numeric.
        """
        try:
            import shap
        except Exception as e:
            raise RuntimeError("SHAP is not installed. Run: pip install shap") from e

        # align + force numeric float
        X1 = self._ensure_numeric_float(self._align_X(X_one_row))

        result: Dict[str, Any] = {}

        for t in self.target_cols:
            pipe = self._get_fitted_pipeline(t)
            model, kind = self._get_inner_estimator(t)

            # apply the fitted imputer
            X_imp_df = self._transform_with_imputer(pipe, X1)

            # choose explainer
            if kind == "xgb":
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(X_imp_df)
                # expected_value can be scalar or array-like
                base_value = explainer.expected_value
                if isinstance(base_value, (list, np.ndarray)):
                    base_value = float(np.asarray(base_value).reshape(-1)[0])
                else:
                    base_value = float(base_value)

                values = np.asarray(shap_values).reshape(-1)

            elif kind == "linear":
                # for LR, use background if present, else error
                if self.background_X is None:
                    raise RuntimeError("No background_X stored in bundle; rebuild bundle with background_X for SHAP.")

                bg = self._ensure_numeric_float(self._align_X(self.background_X))
                bg_imp_df = self._transform_with_imputer(pipe, bg)

                explainer = shap.LinearExplainer(model, bg_imp_df, feature_perturbation="interventional")
                sv = explainer(X_imp_df)
                values = np.asarray(sv.values).reshape(-1)

                base = sv.base_values
                if isinstance(base, (list, np.ndarray)):
                    base_value = float(np.asarray(base).reshape(-1)[0])
                else:
                    base_value = float(base)

            else:
                # generic fallback (can be slower)
                if self.background_X is None:
                    raise RuntimeError("No background_X stored in bundle; rebuild bundle with background_X for SHAP.")

                bg = self._ensure_numeric_float(self._align_X(self.background_X))
                bg_imp_df = self._transform_with_imputer(pipe, bg)

                explainer = shap.Explainer(model, bg_imp_df)
                sv = explainer(X_imp_df)
                values = np.asarray(sv.values).reshape(-1)

                base = sv.base_values
                if isinstance(base, (list, np.ndarray)):
                    base_value = float(np.asarray(base).reshape(-1)[0])
                else:
                    base_value = float(base)

            # top contributions
            idxs = np.argsort(-np.abs(values))[:top_n]
            contrib = []
            for j in idxs:
                fv = X_imp_df.iloc[0, int(j)]
                contrib.append({
                    "feature": self.feature_columns[int(j)],
                    "shap_value": float(values[int(j)]),
                    "feature_value": None if pd.isna(fv) else float(fv),
                })

            result[t] = {
                "base_value": float(base_value),
                "top_contributions": contrib,
            }

        return result
