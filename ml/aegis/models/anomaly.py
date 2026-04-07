"""
Anomaly Detection Model

Approach: Isolation Forest + robust z-score hybrid.
    - Trains one Isolation Forest per asset class on healthy data only.
    - Computes rolling sensor statistics as features (mean, std, min, max, range, rate_of_change).
    - Z-score guard catches sudden point anomalies the IF may miss.
    - Dynamic thresholding per asset class (calibrated on healthy data).

Usage:
    detector = AnomalyDetector()
    detector.fit(telemetry_df, asset_master_list)
    scores_df = detector.score(new_telemetry_window)
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from ml.aegis.data.schemas import AssetMaster, AssetType


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def compute_rolling_features(
    telemetry_df: pd.DataFrame,
    window_hours: int = 24,
    reading_interval_minutes: int = 15,
) -> pd.DataFrame:
    """
    Convert raw time-series telemetry into a tabular feature vector
    per (asset_id, window_end_time).

    For each sensor, computes rolling statistics over the window:
        mean, std, min, max, range, rate_of_change (linear slope)

    Args:
        telemetry_df: Raw telemetry with columns:
            timestamp, asset_id, sensor_name, sensor_value, unit, quality_flag
        window_hours: Rolling window size in hours.
        reading_interval_minutes: Expected interval between readings.

    Returns:
        DataFrame with one row per (asset_id, window_end) and feature columns
        like vibration_x_mean, vibration_x_std, vibration_x_roc, etc.
    """
    window_size = (window_hours * 60) // reading_interval_minutes

    df = telemetry_df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["asset_id", "sensor_name", "timestamp"])

    # Pivot to wide format: one column per sensor
    pivot = df.pivot_table(
        index=["asset_id", "timestamp"],
        columns="sensor_name",
        values="sensor_value",
        aggfunc="first",
    ).reset_index()

    pivot = pivot.sort_values(["asset_id", "timestamp"])
    sensors = [c for c in pivot.columns if c not in ("asset_id", "timestamp")]

    feature_rows: list[dict[str, Any]] = []

    for asset_id, asset_df in pivot.groupby("asset_id"):
        asset_df = asset_df.sort_values("timestamp").reset_index(drop=True)

        if len(asset_df) < window_size:
            # Not enough data for a full window — use whatever is available
            effective_window = len(asset_df)
        else:
            effective_window = window_size

        # Take the latest window for scoring
        window_df = asset_df.tail(effective_window)
        row: dict[str, Any] = {
            "asset_id": asset_id,
            "window_end": window_df["timestamp"].iloc[-1],
        }

        for sensor in sensors:
            vals = window_df[sensor].dropna().values
            if len(vals) < 4:
                row[f"{sensor}_mean"] = np.nan
                row[f"{sensor}_std"] = np.nan
                row[f"{sensor}_min"] = np.nan
                row[f"{sensor}_max"] = np.nan
                row[f"{sensor}_range"] = np.nan
                row[f"{sensor}_roc"] = np.nan
                continue

            row[f"{sensor}_mean"] = float(np.mean(vals))
            row[f"{sensor}_std"] = float(np.std(vals))
            row[f"{sensor}_min"] = float(np.min(vals))
            row[f"{sensor}_max"] = float(np.max(vals))
            row[f"{sensor}_range"] = float(np.max(vals) - np.min(vals))

            # Rate of change: slope of linear fit
            if len(vals) > 1:
                x = np.arange(len(vals))
                coeffs = np.polyfit(x, vals, 1)
                row[f"{sensor}_roc"] = float(coeffs[0])
            else:
                row[f"{sensor}_roc"] = 0.0

        feature_rows.append(row)

    return pd.DataFrame(feature_rows)


def compute_rolling_features_all_windows(
    telemetry_df: pd.DataFrame,
    window_hours: int = 24,
    stride_hours: int = 6,
    reading_interval_minutes: int = 15,
) -> pd.DataFrame:
    """
    Compute rolling features over ALL windows (for training), not just the latest.

    Slides a window over the full time range with a given stride.

    Returns:
        DataFrame with one row per (asset_id, window_end) and feature columns.
    """
    window_size = (window_hours * 60) // reading_interval_minutes
    stride_size = (stride_hours * 60) // reading_interval_minutes

    df = telemetry_df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["asset_id", "sensor_name", "timestamp"])

    # Pivot to wide format
    pivot = df.pivot_table(
        index=["asset_id", "timestamp"],
        columns="sensor_name",
        values="sensor_value",
        aggfunc="first",
    ).reset_index()

    pivot = pivot.sort_values(["asset_id", "timestamp"])
    sensors = [c for c in pivot.columns if c not in ("asset_id", "timestamp")]

    all_feature_rows: list[dict[str, Any]] = []

    for asset_id, asset_df in pivot.groupby("asset_id"):
        asset_df = asset_df.sort_values("timestamp").reset_index(drop=True)

        if len(asset_df) < window_size:
            continue

        # Slide windows
        for end_idx in range(window_size, len(asset_df) + 1, stride_size):
            start_idx = end_idx - window_size
            window_df = asset_df.iloc[start_idx:end_idx]

            row: dict[str, Any] = {
                "asset_id": asset_id,
                "window_end": window_df["timestamp"].iloc[-1],
            }

            for sensor in sensors:
                vals = window_df[sensor].dropna().values
                if len(vals) < 4:
                    row[f"{sensor}_mean"] = np.nan
                    row[f"{sensor}_std"] = np.nan
                    row[f"{sensor}_min"] = np.nan
                    row[f"{sensor}_max"] = np.nan
                    row[f"{sensor}_range"] = np.nan
                    row[f"{sensor}_roc"] = np.nan
                    continue

                row[f"{sensor}_mean"] = float(np.mean(vals))
                row[f"{sensor}_std"] = float(np.std(vals))
                row[f"{sensor}_min"] = float(np.min(vals))
                row[f"{sensor}_max"] = float(np.max(vals))
                row[f"{sensor}_range"] = float(np.max(vals) - np.min(vals))

                if len(vals) > 1:
                    x = np.arange(len(vals))
                    coeffs = np.polyfit(x, vals, 1)
                    row[f"{sensor}_roc"] = float(coeffs[0])
                else:
                    row[f"{sensor}_roc"] = 0.0

            all_feature_rows.append(row)

    return pd.DataFrame(all_feature_rows)


# ---------------------------------------------------------------------------
# Robust Z-Score Guard
# ---------------------------------------------------------------------------

def compute_zscore_flags(
    telemetry_df: pd.DataFrame,
    z_threshold: float = 4.0,
    window_hours: int = 24,
) -> pd.DataFrame:
    """
    For each sensor per asset, compute robust z-score on the latest window.
    Flags any sensor with |z| > threshold as a point anomaly.

    Returns:
        DataFrame: asset_id, sensor_name, current_value, z_score, is_point_anomaly
    """
    df = telemetry_df.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    cutoff = df["timestamp"].max() - pd.Timedelta(hours=window_hours)
    recent = df[df["timestamp"] >= cutoff]

    results: list[dict[str, Any]] = []

    for (asset_id, sensor_name), group in recent.groupby(["asset_id", "sensor_name"]):
        values = group["sensor_value"].dropna().values
        if len(values) < 5:
            continue

        median = np.median(values)
        mad = np.median(np.abs(values - median))
        mad_scaled = mad * 1.4826 if mad > 0 else 1e-6

        latest_value = values[-1]
        z = abs((latest_value - median) / mad_scaled)

        results.append({
            "asset_id": asset_id,
            "sensor_name": sensor_name,
            "current_value": round(float(latest_value), 4),
            "z_score": round(float(z), 4),
            "is_point_anomaly": bool(z > z_threshold),
        })

    return pd.DataFrame(results)


# ---------------------------------------------------------------------------
# Anomaly Detector
# ---------------------------------------------------------------------------

class AnomalyDetector:
    """
    Isolation Forest + Z-Score hybrid anomaly detector.

    Trains one Isolation Forest per asset class on healthy data.
    At inference, produces anomaly scores (0-1 risk scale) per asset.
    Z-score guard catches sudden spikes missed by the IF.
    """

    def __init__(
        self,
        contamination: float = 0.05,
        n_estimators: int = 200,
        random_state: int = 42,
        z_threshold: float = 4.0,
    ):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.random_state = random_state
        self.z_threshold = z_threshold

        # One model per asset class
        self._models: dict[AssetType, IsolationForest] = {}
        self._feature_columns: dict[AssetType, list[str]] = {}
        self._thresholds: dict[AssetType, float] = {}
        self._asset_type_map: dict[str, AssetType] = {}
        self._is_fitted = False

    def fit(
        self,
        telemetry_df: pd.DataFrame,
        assets: list[AssetMaster],
        failure_asset_ids: set[str] | None = None,
        window_hours: int = 24,
        stride_hours: int = 6,
    ) -> dict[str, Any]:
        """
        Train anomaly detection models on healthy data.

        Args:
            telemetry_df: Full historical telemetry.
            assets: List of AssetMaster objects.
            failure_asset_ids: Set of asset IDs that experienced failures
                (these are excluded from training to learn only 'normal').
            window_hours: Rolling window size.
            stride_hours: Stride for sliding window.

        Returns:
            Training summary dict.
        """
        if failure_asset_ids is None:
            failure_asset_ids = set()

        # Build asset type map
        self._asset_type_map = {a.asset_id: a.asset_type for a in assets}

        # Group assets by type
        assets_by_type: dict[AssetType, list[str]] = {}
        for asset in assets:
            assets_by_type.setdefault(asset.asset_type, []).append(asset.asset_id)

        training_summary: dict[str, Any] = {}

        for asset_type, asset_ids in assets_by_type.items():
            # Filter to healthy assets only
            healthy_ids = [aid for aid in asset_ids if aid not in failure_asset_ids]
            if not healthy_ids:
                continue

            # Filter telemetry
            type_telemetry = telemetry_df[telemetry_df["asset_id"].isin(healthy_ids)]
            if len(type_telemetry) == 0:
                continue

            # Compute features
            features_df = compute_rolling_features_all_windows(
                type_telemetry,
                window_hours=window_hours,
                stride_hours=stride_hours,
            )

            # Select numeric feature columns
            feat_cols = [c for c in features_df.columns
                         if c not in ("asset_id", "window_end") and features_df[c].dtype in ("float64", "float32", "int64")]

            if not feat_cols:
                continue

            # Drop rows with NaN features
            X = features_df[feat_cols].dropna()
            if len(X) < 10:
                continue

            self._feature_columns[asset_type] = feat_cols

            # Train Isolation Forest
            model = IsolationForest(
                contamination=self.contamination,
                n_estimators=self.n_estimators,
                random_state=self.random_state,
                n_jobs=-1,
            )
            model.fit(X)
            self._models[asset_type] = model

            # Compute threshold: 95th percentile of anomaly scores on healthy data
            raw_scores = model.decision_function(X)
            # IF decision_function: more negative = more anomalous
            # We'll invert: anomaly_score = 1 - normalized(decision_function)
            self._thresholds[asset_type] = float(np.percentile(raw_scores, 5))

            training_summary[asset_type.value] = {
                "healthy_assets": len(healthy_ids),
                "training_windows": len(X),
                "feature_count": len(feat_cols),
                "threshold": round(self._thresholds[asset_type], 4),
            }

        self._is_fitted = True
        return training_summary

    def score(
        self,
        telemetry_df: pd.DataFrame,
        window_hours: int = 24,
    ) -> pd.DataFrame:
        """
        Score assets for anomaly risk.

        Args:
            telemetry_df: Recent telemetry window.
            window_hours: Window size for feature computation.

        Returns:
            DataFrame with columns:
                asset_id, anomaly_score (0-1), is_anomalous (bool),
                top_contributing_sensors (list), asset_type
        """
        if not self._is_fitted:
            raise RuntimeError("AnomalyDetector has not been fitted. Call fit() first.")

        # Compute features for latest window
        features_df = compute_rolling_features(telemetry_df, window_hours=window_hours)

        # Compute z-score flags
        zscore_df = compute_zscore_flags(telemetry_df, z_threshold=self.z_threshold, window_hours=window_hours)

        results: list[dict[str, Any]] = []

        for _, row in features_df.iterrows():
            asset_id = row["asset_id"]
            asset_type = self._asset_type_map.get(asset_id)

            if asset_type is None or asset_type not in self._models:
                continue

            model = self._models[asset_type]
            feat_cols = self._feature_columns[asset_type]
            threshold = self._thresholds[asset_type]

            # Build feature vector
            feat_values = []
            for col in feat_cols:
                val = row.get(col, np.nan)
                feat_values.append(val if not pd.isna(val) else 0.0)

            X = np.array(feat_values).reshape(1, -1)

            # Isolation Forest score
            raw_score = float(model.decision_function(X)[0])

            # Normalize to 0-1 risk scale
            # More negative raw_score = more anomalous = higher risk
            # Clamp between 0 and 1
            anomaly_score = max(0.0, min(1.0, 1.0 - (raw_score - threshold) / (abs(threshold) + 1e-6)))

            # Check z-score flags for this asset
            asset_zscores = zscore_df[zscore_df["asset_id"] == asset_id]
            has_point_anomaly = bool(asset_zscores["is_point_anomaly"].any()) if len(asset_zscores) > 0 else False

            # Boost score if z-score guard fires
            if has_point_anomaly:
                anomaly_score = max(anomaly_score, 0.75)

            is_anomalous = anomaly_score > 0.5

            # Find top contributing sensors based on feature deviation
            contributions: list[tuple[str, float]] = []
            for col in feat_cols:
                val = row.get(col, 0.0)
                if pd.isna(val):
                    continue
                # Use absolute value as a proxy for contribution
                # (In production, you'd use SHAP here, but this gives a quick ranking)
                if "_roc" in col:
                    contributions.append((col.replace("_roc", ""), abs(float(val)) * 100))
                elif "_std" in col:
                    contributions.append((col.replace("_std", ""), abs(float(val))))

            contributions.sort(key=lambda x: x[1], reverse=True)
            top_sensors = [c[0] for c in contributions[:3]]

            results.append({
                "asset_id": asset_id,
                "asset_type": asset_type.value,
                "anomaly_score": round(anomaly_score, 4),
                "is_anomalous": is_anomalous,
                "has_point_anomaly": has_point_anomaly,
                "top_contributing_sensors": top_sensors,
                "raw_if_score": round(raw_score, 4),
            })

        return pd.DataFrame(results)
