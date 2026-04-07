"""
ML Models — prediction engine for Hephaestus.

Modules:
    anomaly:        Isolation Forest + z-score hybrid anomaly detector
    failure_risk:   Gradient boosting failure probability classifier
    rul:            Remaining Useful Life (survival regression)
    explainability: SHAP-based feature contribution explanations

Usage:
    from ml.aegis.models.anomaly import AnomalyDetector
    from ml.aegis.models.failure_risk import FailureRiskModel
    from ml.aegis.models.rul import RULEstimator
    from ml.aegis.models.explainability import ModelExplainer
"""
