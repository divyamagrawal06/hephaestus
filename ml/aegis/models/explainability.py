"""
Explainability Module

Approach: SHAP (SHapley Additive exPlanations) for feature contribution summaries.
    - TreeExplainer for XGBoost/LightGBM/GradientBoosting models (fast, exact).
    - KernelExplainer fallback for Isolation Forest or unsupported models.
    - Returns structured dicts (not matplotlib plots) for agent consumption.
    - Root-cause confidence decomposition for the Causal Agent.

Usage:
    explainer = ModelExplainer()
    result = explainer.explain_prediction(model, feature_row, feature_names)
    bulk = explainer.explain_batch(model, features_df)
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from ml.aegis.data.schemas import ExplainabilityResult, FeatureContribution


# ---------------------------------------------------------------------------
# Model Explainer
# ---------------------------------------------------------------------------

class ModelExplainer:
    """
    Generates SHAP-based explanations for model predictions.

    Wraps both tree-based and kernel-based SHAP explainers with a
    unified interface. Outputs structured data ready for agent consumption.
    """

    def __init__(self, max_background_samples: int = 100):
        """
        Args:
            max_background_samples: Max samples for KernelExplainer background
                dataset. Smaller = faster but less precise.
        """
        self.max_background_samples = max_background_samples

    def _get_explainer(
        self,
        model: Any,
        background_data: np.ndarray | None = None,
    ) -> Any:
        """
        Create the appropriate SHAP explainer for the given model.

        Uses TreeExplainer for tree-based models (fast, exact).
        Falls back to KernelExplainer for anything else.
        """
        import shap

        model_type = type(model).__name__

        # Tree-based models: use fast TreeExplainer
        tree_models = {
            "XGBClassifier", "XGBRegressor",
            "LGBMClassifier", "LGBMRegressor",
            "GradientBoostingClassifier", "GradientBoostingRegressor",
            "RandomForestClassifier", "RandomForestRegressor",
            "IsolationForest",
        }

        if model_type in tree_models:
            try:
                return shap.TreeExplainer(model)
            except Exception:
                pass  # Fall through to KernelExplainer

        # Fallback: KernelExplainer (works with any model but slower)
        if background_data is None:
            raise ValueError(
                "KernelExplainer requires background_data. "
                "Pass training data as background_data parameter."
            )

        # Subsample background for speed
        if len(background_data) > self.max_background_samples:
            rng = np.random.default_rng(42)
            indices = rng.choice(len(background_data), self.max_background_samples, replace=False)
            background_data = background_data[indices]

        # Determine the predict function
        if hasattr(model, "predict_proba"):
            predict_fn = model.predict_proba
        elif hasattr(model, "decision_function"):
            predict_fn = model.decision_function
        else:
            predict_fn = model.predict

        return shap.KernelExplainer(predict_fn, background_data)

    def explain_prediction(
        self,
        model: Any,
        feature_values: np.ndarray | pd.Series,
        feature_names: list[str],
        model_name: str = "model",
        asset_id: str = "",
        prediction_value: float | None = None,
        background_data: np.ndarray | None = None,
        top_k: int = 10,
    ) -> ExplainabilityResult:
        """
        Generate SHAP explanation for a single prediction.

        Args:
            model: Trained model (XGBoost, LightGBM, sklearn, etc.).
            feature_values: 1D array of feature values for the instance.
            feature_names: List of feature column names.
            model_name: Identifier for the model ("anomaly" or "failure_risk").
            asset_id: Asset this prediction is for.
            prediction_value: The model's prediction (if already computed).
            background_data: Training data for KernelExplainer (if needed).
            top_k: Number of top contributors to return.

        Returns:
            ExplainabilityResult Pydantic model with top contributors.
        """
        import shap

        explainer = self._get_explainer(model, background_data)

        # Reshape to 2D if needed
        X = np.array(feature_values).reshape(1, -1)

        # Compute SHAP values
        shap_values = explainer.shap_values(X)

        # Handle multi-output (classifiers return one array per class)
        if isinstance(shap_values, list):
            # Use positive class (index 1) for binary classifiers
            shap_vals = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        else:
            shap_vals = shap_values[0]

        # Build contribution list
        contributions: list[FeatureContribution] = []
        for i, (name, sv) in enumerate(zip(feature_names, shap_vals)):
            direction = "increases_risk" if sv > 0 else "decreases_risk"
            contributions.append(FeatureContribution(
                feature=name,
                shap_value=round(float(sv), 6),
                direction=direction,
            ))

        # Sort by absolute SHAP value, take top K
        contributions.sort(key=lambda c: abs(c.shap_value), reverse=True)
        top_contributors = contributions[:top_k]

        # Get prediction if not provided
        if prediction_value is None:
            if hasattr(model, "predict_proba"):
                prediction_value = float(model.predict_proba(X)[0, 1])
            elif hasattr(model, "decision_function"):
                prediction_value = float(model.decision_function(X)[0])
            else:
                prediction_value = float(model.predict(X)[0])

        return ExplainabilityResult(
            asset_id=asset_id,
            prediction=round(prediction_value, 4),
            model_name=model_name,
            top_contributors=top_contributors,
        )

    def explain_batch(
        self,
        model: Any,
        features_df: pd.DataFrame,
        feature_columns: list[str],
        model_name: str = "model",
        predictions: np.ndarray | pd.Series | None = None,
        background_data: np.ndarray | None = None,
        top_k: int = 5,
    ) -> list[ExplainabilityResult]:
        """
        Generate SHAP explanations for all assets in a DataFrame.

        Args:
            model: Trained model.
            features_df: DataFrame with asset_id + feature columns.
            feature_columns: List of numeric feature columns to explain.
            model_name: "anomaly" or "failure_risk".
            predictions: Pre-computed predictions aligned with features_df.
            background_data: Training data for KernelExplainer (if needed).
            top_k: Top contributors per asset.

        Returns:
            List of ExplainabilityResult for each asset.
        """
        import shap

        explainer = self._get_explainer(model, background_data)
        X = features_df[feature_columns].fillna(0).values

        # Compute SHAP values for all rows at once (batched for speed)
        shap_values = explainer.shap_values(X)

        if isinstance(shap_values, list):
            shap_matrix = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            shap_matrix = shap_values

        # Get predictions if not provided
        if predictions is None:
            if hasattr(model, "predict_proba"):
                predictions = model.predict_proba(X)[:, 1]
            elif hasattr(model, "decision_function"):
                predictions = model.decision_function(X)
            else:
                predictions = model.predict(X)

        results: list[ExplainabilityResult] = []

        for i, (_, row) in enumerate(features_df.iterrows()):
            sv = shap_matrix[i]
            contributions = []
            for j, (name, val) in enumerate(zip(feature_columns, sv)):
                direction = "increases_risk" if val > 0 else "decreases_risk"
                contributions.append(FeatureContribution(
                    feature=name,
                    shap_value=round(float(val), 6),
                    direction=direction,
                ))

            contributions.sort(key=lambda c: abs(c.shap_value), reverse=True)

            results.append(ExplainabilityResult(
                asset_id=str(row.get("asset_id", f"row_{i}")),
                prediction=round(float(predictions[i]), 4),
                model_name=model_name,
                top_contributors=contributions[:top_k],
            ))

        return results


# ---------------------------------------------------------------------------
# Convenience functions
# ---------------------------------------------------------------------------

def get_top_risk_drivers(
    explanation: ExplainabilityResult,
    min_shap_magnitude: float = 0.01,
) -> list[dict[str, Any]]:
    """
    Extract the most important risk-increasing features from an explanation.

    Useful for the Causal Agent — maps sensor features to physical causes.

    Returns:
        List of dicts with feature, shap_value, and inferred_sensor.
    """
    drivers: list[dict[str, Any]] = []

    for contrib in explanation.top_contributors:
        if contrib.direction != "increases_risk":
            continue
        if abs(contrib.shap_value) < min_shap_magnitude:
            continue

        # Infer the base sensor name from the feature name
        # e.g., "vibration_x_mean" -> "vibration_x"
        sensor = contrib.feature
        for suffix in ("_mean", "_std", "_min", "_max", "_range", "_roc"):
            if sensor.endswith(suffix):
                sensor = sensor[: -len(suffix)]
                break

        drivers.append({
            "feature": contrib.feature,
            "shap_value": contrib.shap_value,
            "direction": contrib.direction,
            "inferred_sensor": sensor,
        })

    return drivers


def map_sensors_to_hypotheses(
    drivers: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Map dominant sensor features to potential root-cause hypotheses.

    This is a heuristic mapping used by the Causal Agent as a starting
    point before LLM-based reasoning refines the hypotheses.

    Returns:
        List of hypothesis dicts with cause, supporting_sensors, initial_confidence.
    """
    sensor_hypothesis_map = {
        "vibration": "bearing_degradation",
        "vibration_x": "bearing_degradation",
        "vibration_y": "bearing_degradation",
        "vibration_axial": "bearing_degradation",
        "vibration_radial": "shaft_imbalance",
        "temperature": "overheating",
        "discharge_temp": "overheating",
        "exhaust_temp": "overheating",
        "bearing_temp": "bearing_degradation",
        "oil_temp": "lubrication_failure",
        "pressure": "seal_leak",
        "suction_pressure": "intake_blockage",
        "discharge_pressure": "seal_leak",
        "flow_rate": "seal_leak",
        "rpm": "electrical_fault",
        "asset_age_days": "wear_out_degradation",
        "days_since_last_maintenance": "deferred_maintenance",
        "event_count_7d": "cascading_issues",
    }

    # Aggregate by hypothesis
    hypothesis_scores: dict[str, dict[str, Any]] = {}

    for driver in drivers:
        sensor = driver["inferred_sensor"]
        hypothesis = sensor_hypothesis_map.get(sensor, f"unknown_{sensor}")

        if hypothesis not in hypothesis_scores:
            hypothesis_scores[hypothesis] = {
                "cause": hypothesis,
                "supporting_sensors": [],
                "total_shap": 0.0,
            }

        hypothesis_scores[hypothesis]["supporting_sensors"].append(sensor)
        hypothesis_scores[hypothesis]["total_shap"] += abs(driver["shap_value"])

    # Convert to list, compute initial confidence
    results = []
    max_shap = max((h["total_shap"] for h in hypothesis_scores.values()), default=1.0)

    for h in hypothesis_scores.values():
        # Normalize into a 0.3-0.95 confidence range
        raw_confidence = h["total_shap"] / max_shap if max_shap > 0 else 0.5
        confidence = 0.3 + raw_confidence * 0.65

        results.append({
            "cause": h["cause"],
            "supporting_sensors": list(set(h["supporting_sensors"])),
            "initial_confidence": round(confidence, 4),
            "total_shap_magnitude": round(h["total_shap"], 6),
        })

    results.sort(key=lambda x: x["initial_confidence"], reverse=True)
    return results
