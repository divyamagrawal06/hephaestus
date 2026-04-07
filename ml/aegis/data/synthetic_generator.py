"""
Synthetic Data Generator

Generates realistic fleet telemetry for hackathon demo:
    - Minimum 3 asset classes (pumps, compressors, turbines)
    - Minimum 200 assets
    - 1M+ telemetry rows over 6-12 month simulated horizon
    - Patterns: sensor drift, sudden spikes, gradual degradation
    - At least 4 failure modes with overlap
    - Includes noisy and missing channels
"""
