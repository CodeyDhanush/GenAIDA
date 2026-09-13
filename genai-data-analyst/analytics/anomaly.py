"""
Anomaly Detection Module supporting IQR, Z-Score, and Isolation Forest.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.ensemble import IsolationForest

def detect_anomalies(
    df: pd.DataFrame, 
    column: str, 
    method: str = "IQR", 
    threshold: float = 1.5
) -> Dict[str, Any]:
    """
    Detect anomalies in a specific numerical column or across numerical features.
    Methods supported:
    - 'IQR': Interquartile Range multiplier (default 1.5)
    - 'Z-Score': Standard deviations from mean (default 3.0 or 2.5)
    - 'Isolation Forest': Machine learning contamination isolation
    """
    if column not in df.columns:
        return {"error": f"Column '{column}' not found in dataset."}
        
    series = df[column].dropna()
    if len(series) < 5:
        return {"error": "Insufficient data points for anomaly detection."}
        
    indices = []
    lower_bound = None
    upper_bound = None
    
    if method.upper() == "IQR":
        q25 = float(series.quantile(0.25))
        q75 = float(series.quantile(0.75))
        iqr = q75 - q25
        lower_bound = q25 - (threshold * iqr)
        upper_bound = q75 + (threshold * iqr)
        
        mask = (series < lower_bound) | (series > upper_bound)
        indices = series[mask].index.tolist()
        
    elif method.upper() == "Z-SCORE":
        z_scores = np.abs(stats.zscore(series))
        mask = z_scores > threshold
        indices = series[mask].index.tolist()
        mean_val = float(series.mean())
        std_val = float(series.std())
        lower_bound = mean_val - (threshold * std_val)
        upper_bound = mean_val + (threshold * std_val)
        
    elif method.upper() == "ISOLATION FOREST":
        # Multi-feature or single feature Isolation Forest
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        clean_subset = df[num_cols].dropna()
        if len(clean_subset) >= 10:
            contamination = min(0.1, max(0.01, threshold / 100.0 if threshold > 1 else threshold))
            iso = IsolationForest(contamination=contamination, random_state=42)
            preds = iso.fit_predict(clean_subset)
            anomaly_mask = preds == -1
            indices = clean_subset[anomaly_mask].index.tolist()
        else:
            # Fallback to IQR
            q25 = float(series.quantile(0.25))
            q75 = float(series.quantile(0.75))
            iqr = q75 - q25
            lower_bound = q25 - 1.5 * iqr
            upper_bound = q75 + 1.5 * iqr
            indices = series[(series < lower_bound) | (series > upper_bound)].index.tolist()

    affected_df = df.loc[indices].copy()
    
    return {
        "column": column,
        "method": method,
        "threshold": threshold,
        "total_records": len(df),
        "anomaly_count": len(indices),
        "anomaly_percentage": round((len(indices) / len(df)) * 100, 2) if len(df) > 0 else 0,
        "anomaly_indices": indices,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
        "affected_records": affected_df
    }
