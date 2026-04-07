"""
Pydantic v2 schemas for all core data entities.

Entities:
    - AssetMaster:       asset_id, asset_type, site_id, installation_date, maintenance_policy, criticality_tier
    - TelemetryReading:  timestamp, asset_id, sensor_name, sensor_value, unit, quality_flag
    - EventLog:          event_id, timestamp, asset_id, event_type, severity, event_text
    - MaintenanceLog:    work_order_id, asset_id, action_type, parts_used, duration_minutes, cost, outcome
    - FailureGroundTruth: asset_id, failure_time, failure_mode, impact_cost, downtime_minutes
"""
