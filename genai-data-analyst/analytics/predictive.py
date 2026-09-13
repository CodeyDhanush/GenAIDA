"""
Predictive Analytics and Machine Learning Modeling Engine.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score, accuracy_score, precision_score, recall_score, f1_score

def train_predictive_model(
    df: pd.DataFrame, 
    target_col: str, 
    feature_cols: Optional[List[str]] = None,
    model_type: str = "Random Forest"
) -> Dict[str, Any]:
    """
    Train and evaluate a supervised predictive model with automated task type detection.
    """
    if target_col not in df.columns:
        return {"error": f"Target column '{target_col}' not found."}
        
    df_clean = df.copy()
    
    # Drop rows where target is missing
    df_clean = df_clean.dropna(subset=[target_col])
    if len(df_clean) < 10:
        return {"error": "Insufficient data rows (need at least 10 valid rows)."}
        
    # Auto-detect problem type
    target_series = df_clean[target_col]
    unique_targets = target_series.nunique()
    
    is_classification = False
    if not pd.api.types.is_numeric_dtype(target_series) or unique_targets <= 10:
        is_classification = True
        
    # Select features if not provided
    if not feature_cols:
        feature_cols = [c for c in df_clean.columns if c != target_col and not any(k in c.lower() for k in ['id', 'uuid', 'code', 'date', 'time'])]
        
    if not feature_cols:
        return {"error": "No valid predictor features available."}
        
    # Prepare X and y
    X_raw = df_clean[feature_cols].copy()
    
    # Preprocess categorical features
    encoders = {}
    for col in X_raw.columns:
        if X_raw[col].dtype == 'object' or not pd.api.types.is_numeric_dtype(X_raw[col]):
            le = LabelEncoder()
            X_raw[col] = le.fit_transform(X_raw[col].astype(str).fillna("Missing"))
            encoders[col] = le
        else:
            X_raw[col] = X_raw[col].fillna(X_raw[col].median())
            
    if is_classification:
        target_encoder = LabelEncoder()
        y = target_encoder.fit_transform(target_series.astype(str))
        classes = [str(c) for c in target_encoder.classes_]
    else:
        y = target_series.astype(float).values
        classes = []
        
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X_raw, y, test_size=0.25, random_state=42)
    
    # Model instantiation
    feature_importance = {}
    metrics = {}
    
    if is_classification:
        if model_type == "Logistic Regression":
            clf = LogisticRegression(max_iter=500, random_state=42)
        elif model_type == "Gradient Boosting":
            clf = GradientBoostingClassifier(n_estimators=100, random_state=42)
        else:
            clf = RandomForestClassifier(n_estimators=100, random_state=42)
            
        clf.fit(X_train, y_train)
        y_pred = clf.predict(X_test)
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
        rec = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
        
        metrics = {
            "Accuracy": round(acc, 4),
            "Precision": round(prec, 4),
            "Recall": round(rec, 4),
            "F1-Score": round(f1, 4)
        }
        
        if hasattr(clf, "feature_importances_"):
            for col, imp in zip(feature_cols, clf.feature_importances_):
                feature_importance[col] = round(float(imp), 4)
        elif hasattr(clf, "coef_"):
            for col, coef in zip(feature_cols, np.abs(clf.coef_[0])):
                feature_importance[col] = round(float(coef), 4)
                
    else: # Regression
        if model_type == "Linear Regression":
            reg = LinearRegression()
        elif model_type == "Gradient Boosting":
            reg = GradientBoostingRegressor(n_estimators=100, random_state=42)
        else:
            reg = RandomForestRegressor(n_estimators=100, random_state=42)
            
        reg.fit(X_train, y_train)
        y_pred = reg.predict(X_test)
        
        r2 = float(r2_score(y_test, y_pred))
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        
        metrics = {
            "R² Score": round(r2, 4),
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "Target Mean": round(float(y.mean()), 4)
        }
        
        if hasattr(reg, "feature_importances_"):
            for col, imp in zip(feature_cols, reg.feature_importances_):
                feature_importance[col] = round(float(imp), 4)
        elif hasattr(reg, "coef_"):
            for col, coef in zip(feature_cols, np.abs(reg.coef_)):
                feature_importance[col] = round(float(coef), 4)
                
    # Sort feature importance
    sorted_importance = dict(sorted(feature_importance.items(), key=lambda item: item[1], reverse=True))
    
    return {
        "task_type": "Classification" if is_classification else "Regression",
        "model_name": model_type,
        "target_column": target_col,
        "features": feature_cols,
        "sample_size": len(df_clean),
        "metrics": metrics,
        "feature_importance": sorted_importance,
        "classes": classes
    }
