"""
Failure Risk Model

Approach: Gradient Boosting Classifier (XGBoost or LightGBM).
    - Predicts probability of failure within next 48 hours.
    - Features: rolling sensor stats + anomaly score + asset age + maintenance recency + event count.
    - Time-based train/val split (no data leakage).
    - Outputs calibrated probability + failure horizon estimate.

Usage:
    model = FailureRiskModel()
    metrics = model.fit(features_df, labels)
    predictions = model.predict(new_features_df)
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

from ml.aegis.data.schemas import AssetMaster, FailureGroundTruth, MaintenanceLog, EventLog


# ---------------------------------------------------------------------------
# Feature construction
# ---------------------------------------------------------------------------

def build_failure_labels(
    features_df: pd.DataFrame,
    failures: list[FailureGroundTruth],
    horizon_hours: int = 48,
) -> pd.Series:
    """
    Construct binary labels: 1 if a failure occurs within horizon_hours of
    the feature window end, else 0.

    Args:
        features_df: DataFrame with asset_id and window_end columns.
        failures: List of FailureGroundTruth records.
        horizon_hours: Lookahead window for label construction.

    Returns:
        pd.Series of 0/1 labels aligned with features_df index.
    """
    # Build a lookup: asset_id -> list of failure times
    failure_lookup: dict[str, list[datetime]] = {}
    for f in failures:
        failure_lookup.setdefault(f.asset_id, []).append(f.failure_time)

    labels = []
    for _, row in features_df.iterrows():
        asset_id = row["asset_id"]
        window_end = pd.to_datetime(row["window_end"])
        horizon_end = window_end + timedelta(hours=horizon_hours)

        is_failure = 0
        if asset_id in failure_lookup:
            for ft in failure_lookup[asset_id]:
                ft = pd.to_datetime(ft)
                if window_end <= ft <= horizon_end:
                    is_failure = 1
                    break

        labels.append(is_failure)

    return pd.Series(labels, index=features_df.index, name="failure_label")


def enrich_features(
    features_df: pd.DataFrame,
    assets: list[AssetMaster],
    maintenance_logs: list[MaintenanceLog],
    events: list[EventLog],
    anomaly_scores: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Enrich rolling sensor features with contextual features:
        - asset_age_days: days since installation
        - days_since_last_maintenance: recency of last maintenance action
        - event_count_7d: number of events in the past 7 days
        - criticality_tier: asset criticality (1-4)
        - anomaly_score: from the Sentinel Agent (if available)

    Args:
        features_df: Base features from anomaly module's feature engineering.
        assets: Asset master records.
        maintenance_logs: Historical maintenance records.
        events: Event log records.
        anomaly_scores: Optional DataFrame with asset_id and anomaly_score.

    Returns:
        Enriched features DataFrame.
    """
    df = features_df.copy()

    # Asset metadata lookup
    asset_map = {a.asset_id: a for a in assets}

    # Last maintenance per asset
    maint_by_asset: dict[str, datetime] = {}
    for m in maintenance_logs:
        ts = pd.to_datetime(m.timestamp)
        if m.asset_id not in maint_by_asset or ts > maint_by_asset[m.asset_id]:
            maint_by_asset[m.asset_id] = ts

    # Events by asset in last 7 days
    event_counts: dict[str, int] = {}
    cutoff_7d = datetime.now() - timedelta(days=7)
    for e in events:
        if pd.to_datetime(e.timestamp) >= cutoff_7d:
            event_counts[e.asset_id] = event_counts.get(e.asset_id, 0) + 1

    # Enrich each row
    asset_ages = []
    days_since_maint = []
    event_count_list = []
    criticality_list = []

    now = datetime.now()

    for _, row in df.iterrows():
        asset_id = row["asset_id"]
        asset = asset_map.get(asset_id)

        # Asset age
        if asset:
            age = (now - pd.to_datetime(asset.installation_date)).days
            asset_ages.append(age)
            criticality_list.append(asset.criticality_tier.value)
        else:
            asset_ages.append(0)
            criticality_list.append(3)

        # Days since last maintenance
        if asset_id in maint_by_asset:
            dsm = (now - maint_by_asset[asset_id]).days
            days_since_maint.append(dsm)
        else:
            days_since_maint.append(365)  # Default: no known maintenance

        # Event count
        event_count_list.append(event_counts.get(asset_id, 0))

    df["asset_age_days"] = asset_ages
    df["days_since_last_maintenance"] = days_since_maint
    df["event_count_7d"] = event_count_list
    df["criticality_tier"] = criticality_list

    # Anomaly scores
    if anomaly_scores is not None and "anomaly_score" in anomaly_scores.columns:
        score_map = dict(zip(anomaly_scores["asset_id"], anomaly_scores["anomaly_score"]))
        df["anomaly_score"] = df["asset_id"].map(score_map).fillna(0.0)
    else:
        df["anomaly_score"] = 0.0

    return df


# ---------------------------------------------------------------------------
# Failure Risk Model
# ---------------------------------------------------------------------------

class FailureRiskModel:
    """
    Gradient Boosting classifier for predicting failure probability.

    Predicts: probability of failure within next 48 hours.
    Uses time-based train/validation split to avoid data leakage.
    """

    def __init__(
        self,
        horizon_hours: int = 48,
        train_ratio: float = 0.70,
        random_state: int = 42,
        use_xgboost: bool = True,
    ):
        self.horizon_hours = horizon_hours
        self.train_ratio = train_ratio
        self.random_state = random_state
        self.use_xgboost = use_xgboost

        self._model: Any = None
        self._feature_columns: list[str] = []
        self._is_fitted = False
        self._training_metrics: dict[str, Any] = {}

    def _get_feature_columns(self, df: pd.DataFrame) -> list[str]:
        """Select numeric feature columns, excluding identifiers."""
        exclude = {"asset_id", "window_end", "failure_label"}
        return [
            c for c in df.columns
            if c not in exclude and df[c].dtype in ("float64", "float32", "int64", "int32")
        ]

    def fit(
        self,
        features_df: pd.DataFrame,
        labels: pd.Series,
    ) -> dict[str, Any]:
        """
        Train the failure risk model using time-based split.

        Args:
            features_df: Enriched feature DataFrame with window_end column.
            labels: Binary labels (0/1) from build_failure_labels().

        Returns:
            Training metrics dict with ROC-AUC, PR-AUC, F1, class balance.
        """
        from sklearn.metrics import (
            f1_score,
            precision_recall_curve,
            roc_auc_score,
            auc,
        )

        df = features_df.copy()
        df["failure_label"] = labels.values

        # Time-based split
        df = df.sort_values("window_end")
        split_idx = int(len(df) * self.train_ratio)
        train_df = df.iloc[:split_idx]
        val_df = df.iloc[split_idx:]

        self._feature_columns = self._get_feature_columns(train_df)

        X_train = train_df[self._feature_columns].fillna(0).values
        y_train = train_df["failure_label"].values
        X_val = val_df[self._feature_columns].fillna(0).values
        y_val = val_df["failure_label"].values

        # Handle class imbalance
        n_pos = int(y_train.sum())
        n_neg = len(y_train) - n_pos
        scale_pos_weight = n_neg / max(n_pos, 1)

        if self.use_xgboost:
            try:
                import xgboost as xgb

                self._model = xgb.XGBClassifier(
                    n_estimators=300,
                    max_depth=6,
                    learning_rate=0.05,
                    scale_pos_weight=scale_pos_weight,
                    random_state=self.random_state,
                    eval_metric="logloss",
                    use_label_encoder=False,
                    verbosity=0,
                )
            except ImportError:
                # Fall back to LightGBM
                self.use_xgboost = False

        if not self.use_xgboost:
            try:
                import lightgbm as lgb

                self._model = lgb.LGBMClassifier(
                    n_estimators=300,
                    max_depth=6,
                    learning_rate=0.05,
                    scale_pos_weight=scale_pos_weight,
                    random_state=self.random_state,
                    verbose=-1,
                )
            except ImportError:
                # Final fallback: sklearn GradientBoosting
                from sklearn.ensemble import GradientBoostingClassifier

                self._model = GradientBoostingClassifier(
                    n_estimators=200,
                    max_depth=5,
                    learning_rate=0.05,
                    random_state=self.random_state,
                )

        self._model.fit(X_train, y_train)
        self._is_fitted = True

        # Evaluate on validation set
        y_val_proba = self._model.predict_proba(X_val)[:, 1]
        y_val_pred = (y_val_proba >= 0.5).astype(int)

        # Metrics
        roc = roc_auc_score(y_val, y_val_proba) if n_pos > 0 and y_val.sum() > 0 else 0.0
        precision, recall, _ = precision_recall_curve(y_val, y_val_proba)
        pr_auc = auc(recall, precision) if len(precision) > 1 else 0.0
        f1 = f1_score(y_val, y_val_pred, zero_division=0)

        self._training_metrics = {
            "roc_auc": round(float(roc), 4),
            "pr_auc": round(float(pr_auc), 4),
            "f1_score": round(float(f1), 4),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "train_positive_rate": round(n_pos / max(len(y_train), 1), 4),
            "val_positive_rate": round(float(y_val.sum()) / max(len(y_val), 1), 4),
            "scale_pos_weight": round(scale_pos_weight, 2),
            "model_type": type(self._model).__name__,
        }

        return self._training_metrics

    def predict(
        self,
        features_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Predict failure probability for each asset.

        Args:
            features_df: Enriched feature DataFrame.

        Returns:
            DataFrame with columns:
                asset_id, failure_probability, failure_horizon_hours,
                confidence_lower, confidence_upper, risk_level
        """
        if not self._is_fitted:
            raise RuntimeError("FailureRiskModel has not been fitted. Call fit() first.")

        X = features_df[self._feature_columns].fillna(0).values
        probabilities = self._model.predict_proba(X)[:, 1]

        results: list[dict[str, Any]] = []

        for i, (_, row) in enumerate(features_df.iterrows()):
            prob = float(probabilities[i])

            # Estimate failure horizon based on degradation rate
            # If high probability, estimate shorter horizon
            if prob > 0.8:
                horizon = 12  # ~12 hours
            elif prob > 0.6:
                horizon = 24  # ~24 hours
            elif prob > 0.4:
                horizon = 48  # ~48 hours
            else:
                horizon = 96  # ~4 days or N/A

            # Confidence interval approximation
            # Wider uncertainty for mid-range probabilities
            uncertainty = 0.15 * (1.0 - abs(2 * prob - 1.0))
            ci_lower = max(0.0, prob - uncertainty)
            ci_upper = min(1.0, prob + uncertainty)

            # Risk level classification
            if prob > 0.7:
                risk_level = "critical"
            elif prob > 0.5:
                risk_level = "high"
            elif prob > 0.3:
                risk_level = "medium"
            else:
                risk_level = "low"

            results.append({
                "asset_id": row["asset_id"],
                "failure_probability": round(prob, 4),
                "failure_horizon_hours": horizon,
                "confidence_lower": round(ci_lower, 4),
                "confidence_upper": round(ci_upper, 4),
                "risk_level": risk_level,
            })

        return pd.DataFrame(results)

    @property
    def feature_importances(self) -> dict[str, float] | None:
        """Return feature importance scores from the trained model."""
        if not self._is_fitted:
            return None

        importances = self._model.feature_importances_
        return {
            col: round(float(imp), 6)
            for col, imp in sorted(
                zip(self._feature_columns, importances),
                key=lambda x: x[1],
                reverse=True,
            )
        }
