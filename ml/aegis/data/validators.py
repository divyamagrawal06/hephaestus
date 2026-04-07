"""
Data validators for quality checks used by the Quality Agent.

Each function returns a structured dict (not True/False) so the
Quality Agent can include it in its AgentOutput.

Validators:
    - check_missingness:        % missing per column
    - check_sensor_freeze:      Constant-value windows (sensor malfunction)
    - check_outlier_bursts:     Sudden extreme value spikes
    - check_timestamp_integrity: Gaps, duplicates, ordering
    - check_feature_drift:      Distribution shift vs historical baseline (KS test)
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats


# ---------------------------------------------------------------------------
# Missingness
# ---------------------------------------------------------------------------

def check_missingness(df: pd.DataFrame) -> dict[str, Any]:
    """
    Calculate percentage of missing values per column.

    Args:
        df: Any DataFrame (typically telemetry).

    Returns:
        {
            "total_rows": int,
            "columns": {
                "sensor_value": {"missing_count": 142, "missing_pct": 1.42},
                ...
            },
            "overall_missing_pct": 0.85,
            "verdict": "ok" | "suspect" | "unreliable"
        }
    """
    total_rows = len(df)
    if total_rows == 0:
        return {
            "total_rows": 0,
            "columns": {},
            "overall_missing_pct": 0.0,
            "verdict": "unreliable",
        }

    columns: dict[str, dict[str, Any]] = {}
    total_missing = 0

    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        missing_pct = round(missing_count / total_rows * 100, 2)
        columns[col] = {
            "missing_count": missing_count,
            "missing_pct": missing_pct,
        }
        total_missing += missing_count

    total_cells = total_rows * len(df.columns)
    overall_pct = round(total_missing / total_cells * 100, 2) if total_cells > 0 else 0.0

    if overall_pct > 20:
        verdict = "unreliable"
    elif overall_pct > 5:
        verdict = "suspect"
    else:
        verdict = "ok"

    return {
        "total_rows": total_rows,
        "columns": columns,
        "overall_missing_pct": overall_pct,
        "verdict": verdict,
    }


# ---------------------------------------------------------------------------
# Sensor Freeze Detection
# ---------------------------------------------------------------------------

def check_sensor_freeze(
    df: pd.DataFrame,
    threshold_hours: float = 2.0,
    value_col: str = "sensor_value",
    time_col: str = "timestamp",
    group_cols: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Find sensors reporting a constant value for longer than threshold_hours.

    A frozen sensor indicates malfunction — no real sensor holds *exactly*
    the same value for hours. This checks for zero variance over a window.

    Args:
        df: Telemetry DataFrame.
        threshold_hours: Minimum freeze duration to flag.
        value_col: Column containing sensor values.
        time_col: Column containing timestamps.
        group_cols: Columns to group by (default: ["asset_id", "sensor_name"]).

    Returns:
        List of freeze incidents:
        [
            {
                "asset_id": "PUMP-0042",
                "sensor_name": "vibration_x",
                "frozen_value": 3.21,
                "freeze_start": "2026-01-15T10:00:00",
                "freeze_end": "2026-01-15T16:00:00",
                "duration_hours": 6.0
            }
        ]
    """
    if group_cols is None:
        group_cols = ["asset_id", "sensor_name"]

    df = df.sort_values([*group_cols, time_col]).copy()
    freeze_incidents: list[dict[str, Any]] = []

    for group_key, group_df in df.groupby(group_cols):
        if len(group_df) < 4:
            continue

        values = group_df[value_col].values
        timestamps = pd.to_datetime(group_df[time_col].values)

        # Find runs of identical values
        run_start = 0
        for i in range(1, len(values)):
            if values[i] != values[run_start] or np.isnan(values[i]):
                # Check if the run was long enough
                if i - run_start >= 4:  # At least 4 identical readings
                    duration_hours = (
                        timestamps[i - 1] - timestamps[run_start]
                    ).total_seconds() / 3600

                    if duration_hours >= threshold_hours:
                        keys = dict(zip(group_cols, group_key if isinstance(group_key, tuple) else [group_key]))
                        freeze_incidents.append({
                            **keys,
                            "frozen_value": round(float(values[run_start]), 4),
                            "freeze_start": str(timestamps[run_start]),
                            "freeze_end": str(timestamps[i - 1]),
                            "duration_hours": round(duration_hours, 2),
                        })
                run_start = i

        # Check the final run
        if len(values) - run_start >= 4:
            duration_hours = (
                timestamps[-1] - timestamps[run_start]
            ).total_seconds() / 3600
            if duration_hours >= threshold_hours:
                keys = dict(zip(group_cols, group_key if isinstance(group_key, tuple) else [group_key]))
                freeze_incidents.append({
                    **keys,
                    "frozen_value": round(float(values[run_start]), 4),
                    "freeze_start": str(timestamps[run_start]),
                    "freeze_end": str(timestamps[-1]),
                    "duration_hours": round(duration_hours, 2),
                })

    return freeze_incidents


# ---------------------------------------------------------------------------
# Outlier Burst Detection
# ---------------------------------------------------------------------------

def check_outlier_bursts(
    df: pd.DataFrame,
    z_threshold: float = 4.0,
    value_col: str = "sensor_value",
    group_cols: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Find sudden extreme value spikes using robust z-score (MAD-based).

    Uses median and Median Absolute Deviation (MAD) instead of mean/std
    to be robust against the outliers themselves skewing the baseline.

    Args:
        df: Telemetry DataFrame.
        z_threshold: Z-score above which a reading is flagged.
        value_col: Column containing sensor values.
        group_cols: Columns to group by (default: ["asset_id", "sensor_name"]).

    Returns:
        List of outlier summaries:
        [
            {
                "asset_id": "PUMP-0042",
                "sensor_name": "vibration_x",
                "outlier_count": 23,
                "total_readings": 8640,
                "outlier_pct": 0.27,
                "max_z_score": 7.32,
                "verdict": "ok" | "suspect" | "unreliable"
            }
        ]
    """
    if group_cols is None:
        group_cols = ["asset_id", "sensor_name"]

    results: list[dict[str, Any]] = []

    for group_key, group_df in df.groupby(group_cols):
        values = group_df[value_col].dropna().values
        if len(values) < 10:
            continue

        median = np.median(values)
        mad = np.median(np.abs(values - median))
        # Scaled MAD to approximate std for normal distribution
        mad_scaled = mad * 1.4826 if mad > 0 else 1e-6

        z_scores = np.abs((values - median) / mad_scaled)
        outlier_mask = z_scores > z_threshold
        outlier_count = int(np.sum(outlier_mask))
        outlier_pct = round(outlier_count / len(values) * 100, 2)
        max_z = round(float(np.max(z_scores)), 2) if len(z_scores) > 0 else 0.0

        if outlier_pct > 5:
            verdict = "unreliable"
        elif outlier_pct > 1:
            verdict = "suspect"
        else:
            verdict = "ok"

        keys = dict(zip(group_cols, group_key if isinstance(group_key, tuple) else [group_key]))
        results.append({
            **keys,
            "outlier_count": outlier_count,
            "total_readings": len(values),
            "outlier_pct": outlier_pct,
            "max_z_score": max_z,
            "verdict": verdict,
        })

    return results


# ---------------------------------------------------------------------------
# Timestamp Integrity
# ---------------------------------------------------------------------------

def check_timestamp_integrity(
    df: pd.DataFrame,
    time_col: str = "timestamp",
    expected_interval_minutes: int = 15,
    group_cols: list[str] | None = None,
) -> dict[str, Any]:
    """
    Check for timestamp gaps, duplicates, and ordering issues.

    Args:
        df: Telemetry DataFrame.
        time_col: Name of the timestamp column.
        expected_interval_minutes: Expected gap between readings.
        group_cols: Columns to group by (default: ["asset_id", "sensor_name"]).

    Returns:
        {
            "total_rows": int,
            "duplicates": int,
            "out_of_order": int,
            "gap_incidents": [
                {"asset_id": ..., "sensor_name": ..., "gap_start": ...,
                 "gap_end": ..., "gap_minutes": ...}
            ],
            "verdict": "ok" | "suspect" | "unreliable"
        }
    """
    if group_cols is None:
        group_cols = ["asset_id", "sensor_name"]

    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col])

    # Global checks
    duplicates = int(df.duplicated(subset=[*group_cols, time_col]).sum())
    sorted_df = df.sort_values([*group_cols, time_col])
    out_of_order = int((df[time_col].values != sorted_df[time_col].values).sum())

    # Gap detection per group
    gap_threshold_minutes = expected_interval_minutes * 3  # 3x expected = suspicious gap
    gap_incidents: list[dict[str, Any]] = []

    for group_key, group_df in df.groupby(group_cols):
        ts = pd.to_datetime(group_df[time_col]).sort_values()
        if len(ts) < 2:
            continue

        diffs = ts.diff().dt.total_seconds() / 60  # in minutes
        large_gaps = diffs[diffs > gap_threshold_minutes]

        for idx in large_gaps.index:
            pos = ts.index.get_loc(idx)
            if pos > 0:
                prev_idx = ts.index[pos - 1]
                keys = dict(zip(group_cols, group_key if isinstance(group_key, tuple) else [group_key]))
                gap_incidents.append({
                    **keys,
                    "gap_start": str(ts.loc[prev_idx]),
                    "gap_end": str(ts.loc[idx]),
                    "gap_minutes": round(float(diffs.loc[idx]), 1),
                })

    if duplicates > 100 or out_of_order > 100 or len(gap_incidents) > 50:
        verdict = "unreliable"
    elif duplicates > 10 or out_of_order > 10 or len(gap_incidents) > 10:
        verdict = "suspect"
    else:
        verdict = "ok"

    return {
        "total_rows": len(df),
        "duplicates": duplicates,
        "out_of_order": out_of_order,
        "gap_incidents": gap_incidents[:50],  # Cap for readability
        "verdict": verdict,
    }


# ---------------------------------------------------------------------------
# Feature Drift Detection
# ---------------------------------------------------------------------------

def check_feature_drift(
    recent_df: pd.DataFrame,
    reference_df: pd.DataFrame,
    value_col: str = "sensor_value",
    group_cols: list[str] | None = None,
    significance_level: float = 0.01,
) -> list[dict[str, Any]]:
    """
    Compare distribution of recent sensor window against a historical
    reference window using the Kolmogorov-Smirnov (KS) test.

    Detects concept drift: the underlying data distribution has shifted,
    meaning models trained on historical data may be unreliable.

    Args:
        recent_df: Recent telemetry window.
        reference_df: Historical baseline telemetry.
        value_col: Column containing sensor values.
        group_cols: Columns to group by (default: ["asset_id", "sensor_name"]).
        significance_level: KS test p-value below which drift is flagged.

    Returns:
        List of drift results per sensor:
        [
            {
                "asset_id": "PUMP-0042",
                "sensor_name": "vibration_x",
                "ks_statistic": 0.23,
                "p_value": 0.001,
                "drift_detected": True,
                "recent_mean": 3.8,
                "reference_mean": 2.5,
                "shift_pct": 52.0,
                "verdict": "ok" | "suspect" | "unreliable"
            }
        ]
    """
    if group_cols is None:
        group_cols = ["asset_id", "sensor_name"]

    results: list[dict[str, Any]] = []

    recent_groups = recent_df.groupby(group_cols)
    reference_groups = reference_df.groupby(group_cols)

    for group_key, recent_group in recent_groups:
        if group_key not in reference_groups.groups:
            continue

        recent_values = recent_group[value_col].dropna().values
        ref_values = reference_groups.get_group(group_key)[value_col].dropna().values

        if len(recent_values) < 20 or len(ref_values) < 20:
            continue

        ks_stat, p_value = stats.ks_2samp(recent_values, ref_values)

        recent_mean = float(np.mean(recent_values))
        ref_mean = float(np.mean(ref_values))
        shift_pct = round(
            abs(recent_mean - ref_mean) / abs(ref_mean) * 100, 2,
        ) if ref_mean != 0 else 0.0

        drift_detected = p_value < significance_level

        if drift_detected and shift_pct > 30:
            verdict = "unreliable"
        elif drift_detected:
            verdict = "suspect"
        else:
            verdict = "ok"

        keys = dict(zip(group_cols, group_key if isinstance(group_key, tuple) else [group_key]))
        results.append({
            **keys,
            "ks_statistic": round(float(ks_stat), 4),
            "p_value": round(float(p_value), 6),
            "drift_detected": drift_detected,
            "recent_mean": round(recent_mean, 4),
            "reference_mean": round(ref_mean, 4),
            "shift_pct": shift_pct,
            "verdict": verdict,
        })

    return results


# ---------------------------------------------------------------------------
# Aggregate quality summary
# ---------------------------------------------------------------------------

def compute_quality_summary(
    missingness: dict[str, Any],
    freeze_incidents: list[dict[str, Any]],
    outlier_results: list[dict[str, Any]],
    timestamp_check: dict[str, Any],
    drift_results: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """
    Aggregate all quality checks into a single quality summary.

    Returns:
        {
            "overall_verdict": "ok" | "suspect" | "unreliable",
            "checks": {
                "missingness": verdict,
                "sensor_freeze": verdict,
                "outliers": verdict,
                "timestamps": verdict,
                "drift": verdict
            },
            "frozen_sensor_count": int,
            "suspect_sensor_count": int,
            "unreliable_sensor_count": int,
            "confidence_modifier": float  # 0.0-1.0, multiplier for downstream confidence
        }
    """
    verdicts = [
        missingness.get("verdict", "ok"),
        timestamp_check.get("verdict", "ok"),
    ]

    frozen_count = len(freeze_incidents)
    suspect_sensors = sum(1 for o in outlier_results if o.get("verdict") == "suspect")
    unreliable_sensors = sum(1 for o in outlier_results if o.get("verdict") == "unreliable")

    if frozen_count > 0:
        verdicts.append("suspect")
    if unreliable_sensors > 0:
        verdicts.append("unreliable")
    elif suspect_sensors > 5:
        verdicts.append("suspect")

    drift_verdict = "ok"
    if drift_results:
        drifted = sum(1 for d in drift_results if d.get("drift_detected", False))
        if drifted > len(drift_results) * 0.3:
            drift_verdict = "unreliable"
        elif drifted > 0:
            drift_verdict = "suspect"
        verdicts.append(drift_verdict)

    # Overall verdict is the worst of all checks
    if "unreliable" in verdicts:
        overall = "unreliable"
        confidence_modifier = 0.3
    elif "suspect" in verdicts:
        overall = "suspect"
        confidence_modifier = 0.7
    else:
        overall = "ok"
        confidence_modifier = 1.0

    return {
        "overall_verdict": overall,
        "checks": {
            "missingness": missingness.get("verdict", "ok"),
            "sensor_freeze": "suspect" if frozen_count > 0 else "ok",
            "outliers": "unreliable" if unreliable_sensors > 0 else ("suspect" if suspect_sensors > 0 else "ok"),
            "timestamps": timestamp_check.get("verdict", "ok"),
            "drift": drift_verdict,
        },
        "frozen_sensor_count": frozen_count,
        "suspect_sensor_count": suspect_sensors,
        "unreliable_sensor_count": unreliable_sensors,
        "confidence_modifier": confidence_modifier,
    }
