"""
Synthetic Data Generator

Generates realistic fleet telemetry for hackathon demo:
    - 3 asset classes: pumps (80), compressors (70), turbines (50)
    - 200 total assets across 3-5 sites
    - 1M+ telemetry rows over ~6-month simulated horizon
    - Degradation patterns: gradual drift, sudden spike, oscillation, sensor freeze
    - 4 failure modes with overlap: bearing_failure, seal_leak, overheating, electrical_fault
    - Includes noisy and missing channels
    - Correlated event logs, maintenance logs, and failure ground truth
"""

from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

from ml.aegis.data.schemas import (
    ActionType,
    AssetMaster,
    AssetType,
    CriticalityTier,
    EventLog,
    EventType,
    FailureGroundTruth,
    FailureMode,
    MaintenanceLog,
    MaintenanceOutcome,
    MaintenancePolicy,
    Severity,
)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Sensor definitions per asset class
SENSOR_CONFIG: dict[AssetType, list[dict[str, Any]]] = {
    AssetType.PUMP: [
        {"name": "vibration_x", "unit": "mm/s", "mean": 2.5, "std": 0.4, "noise": 0.1},
        {"name": "vibration_y", "unit": "mm/s", "mean": 2.3, "std": 0.35, "noise": 0.1},
        {"name": "temperature", "unit": "°C", "mean": 65.0, "std": 3.0, "noise": 0.5},
        {"name": "pressure", "unit": "bar", "mean": 4.5, "std": 0.3, "noise": 0.08},
        {"name": "flow_rate", "unit": "m³/h", "mean": 12.0, "std": 1.0, "noise": 0.2},
    ],
    AssetType.COMPRESSOR: [
        {"name": "vibration", "unit": "mm/s", "mean": 3.0, "std": 0.5, "noise": 0.12},
        {"name": "discharge_temp", "unit": "°C", "mean": 90.0, "std": 5.0, "noise": 1.0},
        {"name": "suction_pressure", "unit": "bar", "mean": 1.2, "std": 0.15, "noise": 0.04},
        {"name": "discharge_pressure", "unit": "bar", "mean": 8.0, "std": 0.6, "noise": 0.1},
        {"name": "oil_temp", "unit": "°C", "mean": 55.0, "std": 3.0, "noise": 0.5},
    ],
    AssetType.TURBINE: [
        {"name": "vibration_axial", "unit": "mm/s", "mean": 1.8, "std": 0.3, "noise": 0.08},
        {"name": "vibration_radial", "unit": "mm/s", "mean": 2.0, "std": 0.35, "noise": 0.09},
        {"name": "exhaust_temp", "unit": "°C", "mean": 450.0, "std": 15.0, "noise": 3.0},
        {"name": "bearing_temp", "unit": "°C", "mean": 70.0, "std": 4.0, "noise": 0.8},
        {"name": "rpm", "unit": "RPM", "mean": 3600.0, "std": 50.0, "noise": 10.0},
    ],
}

# Degradation pattern definitions
DEGRADATION_PATTERNS = {
    FailureMode.BEARING_FAILURE: {
        "affected_sensors": ["vibration_x", "vibration_y", "vibration", "vibration_axial", "vibration_radial"],
        "pattern": "gradual_drift",
        "drift_rate_per_day": 0.08,  # multiplicative factor per day
        "duration_days": (14, 28),  # 2-4 weeks before failure
    },
    FailureMode.SEAL_LEAK: {
        "affected_sensors": ["pressure", "suction_pressure", "discharge_pressure", "flow_rate"],
        "pattern": "sudden_spike",
        "spike_magnitude": 2.5,  # standard deviations
        "duration_days": (7, 14),
    },
    FailureMode.OVERHEATING: {
        "affected_sensors": ["temperature", "discharge_temp", "exhaust_temp", "bearing_temp", "oil_temp"],
        "pattern": "gradual_drift",
        "drift_rate_per_day": 0.05,
        "duration_days": (10, 21),
    },
    FailureMode.ELECTRICAL_FAULT: {
        "affected_sensors": ["rpm", "vibration_x", "vibration"],
        "pattern": "oscillation",
        "oscillation_growth_rate": 0.06,
        "duration_days": (5, 14),
    },
}

# Fleet composition
FLEET_CONFIG = {
    AssetType.PUMP: {"count": 80, "tier_weights": [0.10, 0.25, 0.40, 0.25]},
    AssetType.COMPRESSOR: {"count": 70, "tier_weights": [0.15, 0.30, 0.35, 0.20]},
    AssetType.TURBINE: {"count": 50, "tier_weights": [0.30, 0.35, 0.25, 0.10]},
}

SITE_IDS = ["SITE-ALPHA", "SITE-BETA", "SITE-GAMMA", "SITE-DELTA", "SITE-EPSILON"]

READING_INTERVAL_MINUTES = 15
HISTORY_DAYS = 180  # 6 months


# ---------------------------------------------------------------------------
# Asset Master Generation
# ---------------------------------------------------------------------------

def generate_asset_master(seed: int = 42) -> list[AssetMaster]:
    """Generate the fleet of 200 assets across 3 classes and 5 sites."""
    rng = np.random.default_rng(seed)
    assets: list[AssetMaster] = []

    for asset_type, config in FLEET_CONFIG.items():
        for i in range(config["count"]):
            asset_id = f"{asset_type.value.upper()}-{i:04d}"
            tier = rng.choice(
                [CriticalityTier.TIER_1, CriticalityTier.TIER_2,
                 CriticalityTier.TIER_3, CriticalityTier.TIER_4],
                p=config["tier_weights"],
            )
            install_years_ago = rng.uniform(1, 15)
            install_date = datetime.now() - timedelta(days=int(install_years_ago * 365))
            policy = rng.choice(list(MaintenancePolicy))
            site = rng.choice(SITE_IDS)

            assets.append(AssetMaster(
                asset_id=asset_id,
                asset_type=asset_type,
                site_id=site,
                installation_date=install_date,
                maintenance_policy=policy,
                criticality_tier=tier,
            ))

    return assets


# ---------------------------------------------------------------------------
# Telemetry Generation
# ---------------------------------------------------------------------------

def _apply_degradation(
    values: np.ndarray,
    pattern: str,
    start_idx: int,
    end_idx: int,
    config: dict[str, Any],
    rng: np.random.Generator,
) -> np.ndarray:
    """Apply a degradation pattern to a sensor's values in-place."""
    n_degrade = end_idx - start_idx
    if n_degrade <= 0:
        return values

    if pattern == "gradual_drift":
        drift_rate = config.get("drift_rate_per_day", 0.05)
        readings_per_day = 24 * 60 // READING_INTERVAL_MINUTES
        for i in range(n_degrade):
            day_fraction = i / readings_per_day
            multiplier = 1.0 + drift_rate * day_fraction
            values[start_idx + i] *= multiplier

    elif pattern == "sudden_spike":
        spike_mag = config.get("spike_magnitude", 2.5)
        base_std = np.std(values[:start_idx]) if start_idx > 10 else 1.0
        spike_start = start_idx + n_degrade // 3
        for i in range(spike_start, end_idx):
            recovery = 0.6 * np.exp(-0.01 * (i - spike_start))
            values[i] += base_std * spike_mag * (1.0 - recovery)

    elif pattern == "oscillation":
        growth_rate = config.get("oscillation_growth_rate", 0.06)
        readings_per_day = 24 * 60 // READING_INTERVAL_MINUTES
        for i in range(n_degrade):
            day_fraction = i / readings_per_day
            amplitude = growth_rate * day_fraction
            oscillation = amplitude * np.sin(2 * np.pi * i / (readings_per_day * 0.5))
            base_val = abs(values[start_idx + i]) if values[start_idx + i] != 0 else 1.0
            values[start_idx + i] += base_val * oscillation

    return values


def _apply_sensor_freeze(
    values: np.ndarray,
    rng: np.random.Generator,
    freeze_duration_readings: int = 48,
) -> np.ndarray:
    """Freeze a sensor at a constant value for a period (simulates malfunction)."""
    if len(values) < freeze_duration_readings * 2:
        return values
    start = rng.integers(len(values) // 4, len(values) // 2)
    end = min(start + freeze_duration_readings, len(values))
    frozen_value = values[start]
    values[start:end] = frozen_value
    return values


def generate_telemetry(
    assets: list[AssetMaster],
    degraded_assets: dict[str, list[FailureMode]],
    failure_times: dict[str, datetime],
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generate telemetry readings for all assets.

    Args:
        assets: List of AssetMaster objects.
        degraded_assets: Mapping of asset_id -> list of failure modes (for degraded assets).
        failure_times: Mapping of asset_id -> failure datetime.
        seed: Random seed.

    Returns:
        DataFrame with columns: timestamp, asset_id, sensor_name, sensor_value, unit, quality_flag
    """
    rng = np.random.default_rng(seed)
    end_time = datetime.now()
    start_time = end_time - timedelta(days=HISTORY_DAYS)
    readings_per_day = 24 * 60 // READING_INTERVAL_MINUTES
    total_readings = HISTORY_DAYS * readings_per_day

    timestamps = pd.date_range(start=start_time, periods=total_readings, freq=f"{READING_INTERVAL_MINUTES}min")

    all_rows: list[dict[str, Any]] = []

    for asset in assets:
        sensors = SENSOR_CONFIG[asset.asset_type]
        asset_failure_modes = degraded_assets.get(asset.asset_id, [])

        for sensor_cfg in sensors:
            # Generate base healthy signal
            values = rng.normal(
                loc=sensor_cfg["mean"],
                scale=sensor_cfg["std"],
                size=total_readings,
            )
            # Add inherent sensor noise
            values += rng.normal(0, sensor_cfg["noise"], size=total_readings)

            quality_flags = ["ok"] * total_readings

            # Apply degradation if this asset is degraded
            for fm in asset_failure_modes:
                deg_config = DEGRADATION_PATTERNS[fm]
                if sensor_cfg["name"] not in deg_config["affected_sensors"]:
                    continue

                failure_time = failure_times[asset.asset_id]
                duration_days = rng.integers(
                    deg_config["duration_days"][0],
                    deg_config["duration_days"][1] + 1,
                )
                degrade_start_time = failure_time - timedelta(days=duration_days)

                # Find indices
                degrade_start_idx = max(
                    0,
                    int((degrade_start_time - start_time).total_seconds()
                        / (READING_INTERVAL_MINUTES * 60)),
                )
                degrade_end_idx = min(
                    total_readings,
                    int((failure_time - start_time).total_seconds()
                        / (READING_INTERVAL_MINUTES * 60)),
                )

                values = _apply_degradation(
                    values, deg_config["pattern"],
                    degrade_start_idx, degrade_end_idx,
                    deg_config, rng,
                )

            # Randomly inject sensor freeze on ~5% of assets
            if rng.random() < 0.05:
                freeze_duration = rng.integers(24, 96)  # 6-24 hours of frozen data
                values = _apply_sensor_freeze(values, rng, freeze_duration)
                # Mark frozen readings as suspect
                freeze_start = len(values) // 3
                freeze_end = min(freeze_start + freeze_duration, len(values))
                for idx in range(freeze_start, freeze_end):
                    quality_flags[idx] = "suspect"

            # Randomly drop 2-5% of readings (missing data)
            missing_rate = rng.uniform(0.02, 0.05) if rng.random() < 0.3 else 0.0
            if missing_rate > 0:
                missing_mask = rng.random(total_readings) < missing_rate
                values[missing_mask] = np.nan
                for idx in np.where(missing_mask)[0]:
                    quality_flags[int(idx)] = "missing"

            # Build rows for this sensor
            for i in range(total_readings):
                if not np.isnan(values[i]):
                    all_rows.append({
                        "timestamp": timestamps[i],
                        "asset_id": asset.asset_id,
                        "sensor_name": sensor_cfg["name"],
                        "sensor_value": round(float(values[i]), 4),
                        "unit": sensor_cfg["unit"],
                        "quality_flag": quality_flags[i],
                    })

    df = pd.DataFrame(all_rows)
    return df


# ---------------------------------------------------------------------------
# Event Log Generation
# ---------------------------------------------------------------------------

def generate_events(
    assets: list[AssetMaster],
    degraded_assets: dict[str, list[FailureMode]],
    failure_times: dict[str, datetime],
    seed: int = 42,
) -> list[EventLog]:
    """Generate correlated event logs for the fleet."""
    rng = np.random.default_rng(seed)
    events: list[EventLog] = []

    for asset in assets:
        asset_failures = degraded_assets.get(asset.asset_id, [])

        if asset_failures:
            # Degraded asset: generate 5-15 warning/critical events
            n_events = rng.integers(5, 16)
            failure_time = failure_times[asset.asset_id]
            # Events cluster in the degradation window (2-4 weeks before failure)
            window_start = failure_time - timedelta(days=28)

            for _ in range(n_events):
                event_time = window_start + timedelta(
                    hours=float(rng.uniform(0, (failure_time - window_start).total_seconds() / 3600)),
                )
                # More severe events closer to failure
                time_to_failure = (failure_time - event_time).total_seconds() / 3600
                if time_to_failure < 48:
                    severity = Severity.CRITICAL
                    event_type = EventType.ALARM
                elif time_to_failure < 168:
                    severity = Severity.WARNING
                    event_type = EventType.WARNING
                else:
                    severity = Severity.INFO
                    event_type = rng.choice([EventType.WARNING, EventType.INFO])

                fm_text = asset_failures[0].value.replace("_", " ")
                event_texts = [
                    f"Abnormal {fm_text} signature detected",
                    f"Sensor threshold exceeded — possible {fm_text}",
                    f"Asset performance degradation observed",
                    f"Maintenance advisory: check for {fm_text}",
                    f"Anomalous reading spike on asset {asset.asset_id}",
                ]

                events.append(EventLog(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    timestamp=event_time,
                    asset_id=asset.asset_id,
                    event_type=event_type,
                    severity=severity,
                    event_text=rng.choice(event_texts),
                ))
        else:
            # Healthy asset: 0-2 routine info events
            n_events = rng.integers(0, 3)
            for _ in range(n_events):
                event_time = datetime.now() - timedelta(days=float(rng.uniform(0, HISTORY_DAYS)))
                events.append(EventLog(
                    event_id=f"EVT-{uuid.uuid4().hex[:8].upper()}",
                    timestamp=event_time,
                    asset_id=asset.asset_id,
                    event_type=EventType.INFO,
                    severity=Severity.INFO,
                    event_text=rng.choice([
                        "Routine check completed",
                        "Scheduled inspection passed",
                    ]),
                ))

    return events


# ---------------------------------------------------------------------------
# Maintenance Log Generation
# ---------------------------------------------------------------------------

def generate_maintenance_logs(
    assets: list[AssetMaster],
    seed: int = 42,
) -> list[MaintenanceLog]:
    """Generate historical maintenance records for all assets."""
    rng = np.random.default_rng(seed)
    logs: list[MaintenanceLog] = []

    action_costs = {
        ActionType.INSPECTION: (150, 300),
        ActionType.LUBRICATION: (100, 250),
        ActionType.CALIBRATION: (200, 400),
        ActionType.BEARING_REPLACEMENT: (1200, 2500),
        ActionType.SEAL_REPLACEMENT: (800, 1500),
        ActionType.ELECTRICAL_REPAIR: (600, 1800),
        ActionType.FULL_OVERHAUL: (5000, 15000),
    }

    action_durations = {
        ActionType.INSPECTION: (30, 90),
        ActionType.LUBRICATION: (20, 60),
        ActionType.CALIBRATION: (45, 120),
        ActionType.BEARING_REPLACEMENT: (120, 360),
        ActionType.SEAL_REPLACEMENT: (90, 240),
        ActionType.ELECTRICAL_REPAIR: (60, 300),
        ActionType.FULL_OVERHAUL: (480, 960),
    }

    for asset in assets:
        # Scheduled maintenance every 3-6 months
        interval_days = rng.integers(90, 180)
        current_date = datetime.now() - timedelta(days=HISTORY_DAYS)

        while current_date < datetime.now():
            action = rng.choice([ActionType.INSPECTION, ActionType.LUBRICATION, ActionType.CALIBRATION])
            cost_range = action_costs[action]
            dur_range = action_durations[action]

            parts: list[str] = []
            if action == ActionType.LUBRICATION:
                parts = ["lubricant_kit"]
            elif action == ActionType.CALIBRATION:
                parts = ["calibration_tool"]

            logs.append(MaintenanceLog(
                work_order_id=f"WO-{uuid.uuid4().hex[:8].upper()}",
                asset_id=asset.asset_id,
                timestamp=current_date,
                action_type=action,
                parts_used=parts,
                duration_minutes=int(rng.integers(dur_range[0], dur_range[1])),
                cost=round(float(rng.uniform(cost_range[0], cost_range[1])), 2),
                outcome=rng.choice(
                    [MaintenanceOutcome.SUCCESS, MaintenanceOutcome.PARTIAL],
                    p=[0.9, 0.1],
                ),
            ))

            current_date += timedelta(days=int(interval_days))

    return logs


# ---------------------------------------------------------------------------
# Failure Ground Truth + Degradation Assignment
# ---------------------------------------------------------------------------

def assign_degraded_assets(
    assets: list[AssetMaster],
    degradation_ratio: float = 0.15,
    seed: int = 42,
) -> tuple[dict[str, list[FailureMode]], dict[str, datetime]]:
    """
    Randomly select ~15-20% of assets to receive degradation patterns.

    Returns:
        degraded_assets: Mapping of asset_id -> list of failure modes
        failure_times: Mapping of asset_id -> datetime of failure
    """
    rng = np.random.default_rng(seed)
    degraded_assets: dict[str, list[FailureMode]] = {}
    failure_times: dict[str, datetime] = {}

    available_modes = list(FailureMode)

    for asset in assets:
        if rng.random() < degradation_ratio:
            # Primary failure mode
            primary_mode = rng.choice(available_modes)
            modes = [primary_mode]

            # 20% chance of overlapping second failure mode
            if rng.random() < 0.20:
                secondary = rng.choice([m for m in available_modes if m != primary_mode])
                modes.append(secondary)

            degraded_assets[asset.asset_id] = modes

            # Failure occurs in the last 1-3 months of the history
            days_ago = rng.integers(7, 90)
            failure_times[asset.asset_id] = datetime.now() - timedelta(days=int(days_ago))

    return degraded_assets, failure_times


def generate_failure_ground_truth(
    degraded_assets: dict[str, list[FailureMode]],
    failure_times: dict[str, datetime],
    seed: int = 42,
) -> list[FailureGroundTruth]:
    """Generate failure ground truth records for degraded assets."""
    rng = np.random.default_rng(seed)
    failures: list[FailureGroundTruth] = []

    impact_costs = {
        FailureMode.BEARING_FAILURE: (5000, 25000),
        FailureMode.SEAL_LEAK: (3000, 15000),
        FailureMode.OVERHEATING: (8000, 40000),
        FailureMode.ELECTRICAL_FAULT: (4000, 20000),
    }

    impact_downtime = {
        FailureMode.BEARING_FAILURE: (240, 720),    # 4-12 hours
        FailureMode.SEAL_LEAK: (120, 480),           # 2-8 hours
        FailureMode.OVERHEATING: (360, 1440),        # 6-24 hours
        FailureMode.ELECTRICAL_FAULT: (180, 600),    # 3-10 hours
    }

    for asset_id, modes in degraded_assets.items():
        for mode in modes:
            cost_range = impact_costs[mode]
            dt_range = impact_downtime[mode]
            failures.append(FailureGroundTruth(
                asset_id=asset_id,
                failure_time=failure_times[asset_id],
                failure_mode=mode,
                impact_cost=round(float(rng.uniform(cost_range[0], cost_range[1])), 2),
                downtime_minutes=int(rng.integers(dt_range[0], dt_range[1])),
            ))

    return failures


# ---------------------------------------------------------------------------
# Master Generator
# ---------------------------------------------------------------------------

def generate_all(
    seed: int = 42,
    output_dir: str | None = None,
) -> dict[str, Any]:
    """
    Generate the full synthetic dataset.

    Returns a dict with keys:
        - assets: list[AssetMaster]
        - telemetry: pd.DataFrame
        - events: list[EventLog]
        - maintenance: list[MaintenanceLog]
        - failures: list[FailureGroundTruth]
        - degraded_asset_ids: list[str]

    If output_dir is given, also saves to CSV/JSON in that directory.
    """
    print("[SynGen] Generating asset master...")
    assets = generate_asset_master(seed)
    print(f"[SynGen] Created {len(assets)} assets")

    print("[SynGen] Assigning degradation patterns...")
    degraded_assets, failure_times = assign_degraded_assets(assets, seed=seed)
    print(f"[SynGen] {len(degraded_assets)} assets marked for degradation")

    print("[SynGen] Generating telemetry (this may take a minute)...")
    telemetry_df = generate_telemetry(assets, degraded_assets, failure_times, seed=seed)
    print(f"[SynGen] Generated {len(telemetry_df):,} telemetry rows")

    print("[SynGen] Generating event logs...")
    events = generate_events(assets, degraded_assets, failure_times, seed=seed)
    print(f"[SynGen] Generated {len(events)} events")

    print("[SynGen] Generating maintenance logs...")
    maintenance = generate_maintenance_logs(assets, seed=seed)
    print(f"[SynGen] Generated {len(maintenance)} maintenance records")

    print("[SynGen] Generating failure ground truth...")
    failures = generate_failure_ground_truth(degraded_assets, failure_times, seed=seed)
    print(f"[SynGen] Generated {len(failures)} failure records")

    result = {
        "assets": assets,
        "telemetry": telemetry_df,
        "events": events,
        "maintenance": maintenance,
        "failures": failures,
        "degraded_asset_ids": list(degraded_assets.keys()),
        "failure_times": failure_times,
        "degraded_assets": degraded_assets,
    }

    if output_dir:
        import os
        os.makedirs(output_dir, exist_ok=True)

        # Assets
        assets_df = pd.DataFrame([a.model_dump() for a in assets])
        assets_df.to_csv(os.path.join(output_dir, "asset_master.csv"), index=False)

        # Telemetry
        telemetry_df.to_csv(os.path.join(output_dir, "telemetry.csv"), index=False)

        # Events
        events_df = pd.DataFrame([e.model_dump() for e in events])
        events_df.to_csv(os.path.join(output_dir, "events.csv"), index=False)

        # Maintenance
        maint_df = pd.DataFrame([m.model_dump() for m in maintenance])
        maint_df.to_csv(os.path.join(output_dir, "maintenance.csv"), index=False)

        # Failures
        fail_df = pd.DataFrame([f.model_dump() for f in failures])
        fail_df.to_csv(os.path.join(output_dir, "failures.csv"), index=False)

        print(f"[SynGen] All datasets saved to {output_dir}/")

    print("[SynGen] ✅ Generation complete!")
    return result


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    out_dir = sys.argv[1] if len(sys.argv) > 1 else "./synthetic_data"
    data = generate_all(seed=42, output_dir=out_dir)
    print(f"\nSummary:")
    print(f"  Assets:      {len(data['assets'])}")
    print(f"  Telemetry:   {len(data['telemetry']):,} rows")
    print(f"  Events:      {len(data['events'])}")
    print(f"  Maintenance: {len(data['maintenance'])}")
    print(f"  Failures:    {len(data['failures'])}")
    print(f"  Degraded:    {len(data['degraded_asset_ids'])} assets")
