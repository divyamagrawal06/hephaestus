"""
Remaining Useful Life (RUL) Estimation

Approach: Dual strategy
    1. Survival regression (Cox Proportional Hazards) via lifelines
    2. Simple regression fallback predicting hours-until-failure

Used where failure ground truth labels exist. Optional enhancement
on top of the core failure probability model.

Usage:
    model = RULEstimator()
    model.fit(features_df, durations, event_observed)
    predictions = model.predict(new_features_df)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

from ml.aegis.data.schemas import AssetMaster, FailureGroundTruth


# ---------------------------------------------------------------------------
# Label construction for RUL
# ---------------------------------------------------------------------------

def build_rul_labels(
    features_df: pd.DataFrame,
    failures: list[FailureGroundTruth],
    assets: list[AssetMaster],
) -> pd.DataFrame:
    """
    For each (asset_id, window_end) row, compute:
        - duration: hours from window_end to the next failure (or end of observation)
        - event_observed: 1 if a failure eventually occurred, 0 if censored

    Assets without failures are right-censored (we know they survived at
    least until the last observation, but don't know when they'd fail).

    Returns:
        DataFrame with columns: asset_id, window_end, duration_hours, event_observed
    """
    # Next failure per asset (closest future failure from window_end)
    failure_lookup: dict[str, list[datetime]] = {}
    for f in failures:
        failure_lookup.setdefault(f.asset_id, []).append(pd.to_datetime(f.failure_time))

    # Sort failure times
    for times in failure_lookup.values():
        times.sort()

    # End of observation
    max_time = pd.to_datetime(features_df["window_end"]).max()

    rows: list[dict[str, Any]] = []
    for _, row in features_df.iterrows():
        asset_id = row["asset_id"]
        window_end = pd.to_datetime(row["window_end"])

        if asset_id in failure_lookup:
            # Find the next failure after this window
            future_failures = [ft for ft in failure_lookup[asset_id] if ft > window_end]
            if future_failures:
                next_failure = future_failures[0]
                duration_hours = (next_failure - window_end).total_seconds() / 3600
                event_observed = 1
            else:
                # Failure already happened before this window → censored
                duration_hours = (max_time - window_end).total_seconds() / 3600
                event_observed = 0
        else:
            # No failure on record → right-censored
            duration_hours = (max_time - window_end).total_seconds() / 3600
            event_observed = 0

        rows.append({
            "asset_id": asset_id,
            "window_end": window_end,
            "duration_hours": max(0.0, round(duration_hours, 2)),
            "event_observed": event_observed,
        })

    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# RUL Estimator
# ---------------------------------------------------------------------------

class RULEstimator:
    """
    Estimates Remaining Useful Life using survival analysis.

    Primary: Cox Proportional Hazards (lifelines).
    Fallback: Simple regression predicting hours-until-failure.
    """

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self._model: Any = None
        self._feature_columns: list[str] = []
        self._is_fitted = False
        self._model_type: str = "none"
        self._training_metrics: dict[str, Any] = {}

    def _get_feature_columns(self, df: pd.DataFrame) -> list[str]:
        exclude = {"asset_id", "window_end", "duration_hours", "event_observed", "failure_label"}
        return [
            c for c in df.columns
            if c not in exclude and df[c].dtype in ("float64", "float32", "int64", "int32")
        ]

    def fit(
        self,
        features_df: pd.DataFrame,
        rul_labels: pd.DataFrame,
    ) -> dict[str, Any]:
        """
        Train the RUL estimation model.

        Args:
            features_df: Enriched feature DataFrame.
            rul_labels: DataFrame from build_rul_labels() with
                        duration_hours and event_observed columns.

        Returns:
            Training metrics dict.
        """
        df = features_df.copy()
        df["duration_hours"] = rul_labels["duration_hours"].values
        df["event_observed"] = rul_labels["event_observed"].values

        # Only keep rows with positive duration
        df = df[df["duration_hours"] > 0].copy()

        self._feature_columns = self._get_feature_columns(df)
        X = df[self._feature_columns].fillna(0)

        try:
            from lifelines import CoxPHFitter

            # Prepare data for Cox model
            cox_df = X.copy()
            cox_df["duration_hours"] = df["duration_hours"].values
            cox_df["event_observed"] = df["event_observed"].values

            self._model = CoxPHFitter(penalizer=0.1)
            self._model.fit(
                cox_df,
                duration_col="duration_hours",
                event_col="event_observed",
            )
            self._model_type = "cox_ph"

            self._training_metrics = {
                "model_type": "CoxPHFitter",
                "concordance_index": round(float(self._model.concordance_index_), 4),
                "n_samples": len(cox_df),
                "n_events": int(df["event_observed"].sum()),
                "n_features": len(self._feature_columns),
            }

        except (ImportError, Exception) as e:
            # Fallback: simple regression on observed failures only
            from sklearn.ensemble import GradientBoostingRegressor

            observed = df[df["event_observed"] == 1]
            if len(observed) < 5:
                # Not enough data — return a dummy model
                self._is_fitted = True
                self._model_type = "dummy"
                self._training_metrics = {
                    "model_type": "dummy",
                    "reason": f"Only {len(observed)} observed failures — insufficient for training",
                }
                return self._training_metrics

            X_obs = observed[self._feature_columns].fillna(0).values
            y_obs = observed["duration_hours"].values

            self._model = GradientBoostingRegressor(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.05,
                random_state=self.random_state,
            )
            self._model.fit(X_obs, y_obs)
            self._model_type = "gbr_fallback"

            y_pred = self._model.predict(X_obs)
            mae = float(np.mean(np.abs(y_pred - y_obs)))

            self._training_metrics = {
                "model_type": "GradientBoostingRegressor (fallback)",
                "fallback_reason": str(e),
                "mae_hours": round(mae, 2),
                "n_samples": len(X_obs),
                "n_features": len(self._feature_columns),
            }

        self._is_fitted = True
        return self._training_metrics

    def predict(self, features_df: pd.DataFrame) -> pd.DataFrame:
        """
        Predict RUL for each asset.

        Returns:
            DataFrame with columns:
                asset_id, rul_hours, rul_days, confidence_lower_hours,
                confidence_upper_hours, estimation_quality
        """
        if not self._is_fitted:
            raise RuntimeError("RULEstimator has not been fitted. Call fit() first.")

        X = features_df[self._feature_columns].fillna(0)
        results: list[dict[str, Any]] = []

        if self._model_type == "dummy":
            # No model available — return conservative defaults
            for _, row in features_df.iterrows():
                results.append({
                    "asset_id": row["asset_id"],
                    "rul_hours": -1,
                    "rul_days": -1,
                    "confidence_lower_hours": 0,
                    "confidence_upper_hours": 0,
                    "estimation_quality": "unavailable",
                })
            return pd.DataFrame(results)

        if self._model_type == "cox_ph":
            # Cox model: predict median survival time
            median_survival = self._model.predict_median(X)

            for i, (_, row) in enumerate(features_df.iterrows()):
                rul_h = float(median_survival.iloc[i])
                if np.isinf(rul_h) or np.isnan(rul_h):
                    rul_h = 720  # Default 30 days if infinite

                # Approximate confidence interval: ±20%
                ci_lower = max(0, rul_h * 0.8)
                ci_upper = rul_h * 1.2

                quality = "high" if rul_h < 168 else ("medium" if rul_h < 720 else "low")

                results.append({
                    "asset_id": row["asset_id"],
                    "rul_hours": round(rul_h, 1),
                    "rul_days": round(rul_h / 24, 1),
                    "confidence_lower_hours": round(ci_lower, 1),
                    "confidence_upper_hours": round(ci_upper, 1),
                    "estimation_quality": quality,
                })

        elif self._model_type == "gbr_fallback":
            predictions = self._model.predict(X.values)

            for i, (_, row) in enumerate(features_df.iterrows()):
                rul_h = max(0.0, float(predictions[i]))
                ci_lower = max(0, rul_h * 0.7)
                ci_upper = rul_h * 1.3
                quality = "medium"

                results.append({
                    "asset_id": row["asset_id"],
                    "rul_hours": round(rul_h, 1),
                    "rul_days": round(rul_h / 24, 1),
                    "confidence_lower_hours": round(ci_lower, 1),
                    "confidence_upper_hours": round(ci_upper, 1),
                    "estimation_quality": quality,
                })

        return pd.DataFrame(results)
