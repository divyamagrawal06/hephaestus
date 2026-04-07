"""
Data loaders for CSV, JSON, parquet, and replay streams.

Provides typed loader functions that read data from disk and return
validated Pydantic models or typed DataFrames.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from ml.aegis.data.schemas import (
    AssetMaster,
    EventLog,
    FailureGroundTruth,
    MaintenanceLog,
)


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

def _detect_format(path: str | Path) -> str:
    """Auto-detect file format from extension."""
    suffix = Path(path).suffix.lower()
    format_map = {
        ".csv": "csv",
        ".json": "json",
        ".parquet": "parquet",
        ".pq": "parquet",
    }
    fmt = format_map.get(suffix)
    if fmt is None:
        raise ValueError(
            f"Unsupported file format '{suffix}'. "
            f"Supported: {list(format_map.keys())}"
        )
    return fmt


def _read_dataframe(path: str | Path) -> pd.DataFrame:
    """Read a file into a DataFrame based on its extension."""
    fmt = _detect_format(path)
    path = str(path)

    if fmt == "csv":
        return pd.read_csv(path, parse_dates=True)
    elif fmt == "json":
        return pd.read_json(path)
    elif fmt == "parquet":
        return pd.read_parquet(path)
    else:
        raise ValueError(f"Unknown format: {fmt}")


# ---------------------------------------------------------------------------
# Typed loaders
# ---------------------------------------------------------------------------

def load_asset_master(path: str | Path) -> list[AssetMaster]:
    """
    Load asset master data from CSV/JSON/parquet.

    Required columns: asset_id, asset_type, site_id, installation_date,
                      maintenance_policy, criticality_tier

    Returns:
        List of validated AssetMaster Pydantic objects.

    Raises:
        ValueError: If required columns are missing or types are invalid.
    """
    df = _read_dataframe(path)
    required = {"asset_id", "asset_type", "site_id", "installation_date",
                "maintenance_policy", "criticality_tier"}
    _validate_columns(df, required, "AssetMaster")

    if "installation_date" in df.columns:
        df["installation_date"] = pd.to_datetime(df["installation_date"])

    assets = []
    for _, row in df.iterrows():
        assets.append(AssetMaster(**row.to_dict()))
    return assets


def load_telemetry(path: str | Path) -> pd.DataFrame:
    """
    Load telemetry data from CSV/JSON/parquet.

    Required columns: timestamp, asset_id, sensor_name, sensor_value, unit

    Returns:
        DataFrame with validated column types.
        - timestamp: datetime64
        - sensor_value: float64
        - quality_flag: str (defaults to 'ok' if missing)
    """
    df = _read_dataframe(path)
    required = {"timestamp", "asset_id", "sensor_name", "sensor_value", "unit"}
    _validate_columns(df, required, "Telemetry")

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["sensor_value"] = pd.to_numeric(df["sensor_value"], errors="coerce")

    if "quality_flag" not in df.columns:
        df["quality_flag"] = "ok"

    return df


def load_events(path: str | Path) -> list[EventLog]:
    """
    Load event log data from CSV/JSON/parquet.

    Required columns: event_id, timestamp, asset_id, event_type, severity

    Returns:
        List of validated EventLog Pydantic objects.
    """
    df = _read_dataframe(path)
    required = {"event_id", "timestamp", "asset_id", "event_type", "severity"}
    _validate_columns(df, required, "EventLog")

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    if "event_text" not in df.columns:
        df["event_text"] = ""

    events = []
    for _, row in df.iterrows():
        events.append(EventLog(**row.to_dict()))
    return events


def load_maintenance(path: str | Path) -> list[MaintenanceLog]:
    """
    Load maintenance log data from CSV/JSON/parquet.

    Required columns: work_order_id, asset_id, timestamp, action_type,
                      duration_minutes, cost, outcome

    Returns:
        List of validated MaintenanceLog Pydantic objects.
    """
    df = _read_dataframe(path)
    required = {"work_order_id", "asset_id", "timestamp", "action_type",
                "duration_minutes", "cost", "outcome"}
    _validate_columns(df, required, "MaintenanceLog")

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    if "parts_used" not in df.columns:
        df["parts_used"] = [[] for _ in range(len(df))]
    elif df["parts_used"].dtype == object:
        # Handle string representation of lists from CSV
        import ast
        df["parts_used"] = df["parts_used"].apply(
            lambda x: ast.literal_eval(x) if isinstance(x, str) and x.startswith("[") else []
        )

    logs = []
    for _, row in df.iterrows():
        logs.append(MaintenanceLog(**row.to_dict()))
    return logs


def load_failures(path: str | Path) -> list[FailureGroundTruth]:
    """
    Load failure ground truth from CSV/JSON/parquet.

    Required columns: asset_id, failure_time, failure_mode, impact_cost, downtime_minutes

    Returns:
        List of validated FailureGroundTruth Pydantic objects.
    """
    df = _read_dataframe(path)
    required = {"asset_id", "failure_time", "failure_mode", "impact_cost", "downtime_minutes"}
    _validate_columns(df, required, "FailureGroundTruth")

    df["failure_time"] = pd.to_datetime(df["failure_time"])

    failures = []
    for _, row in df.iterrows():
        failures.append(FailureGroundTruth(**row.to_dict()))
    return failures


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_columns(
    df: pd.DataFrame,
    required_columns: set[str],
    entity_name: str,
) -> None:
    """Check that all required columns exist in the DataFrame."""
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(
            f"[{entity_name}] Missing required columns: {sorted(missing)}. "
            f"Available columns: {sorted(df.columns)}"
        )
