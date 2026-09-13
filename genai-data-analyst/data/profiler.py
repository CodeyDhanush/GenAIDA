"""
Automated Data Profiling Engine.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Perform deep statistical profiling of a DataFrame.
    """
    total_rows, total_cols = df.shape
    memory_bytes = df.memory_usage(deep=True).sum()
    memory_str = format_bytes(memory_bytes)
    duplicate_rows = int(df.duplicated().sum())
    
    # Classify column types
    numerical_cols = []
    categorical_cols = []
    datetime_cols = []
    boolean_cols = []
    id_cols = []
    
    col_profiles: Dict[str, Dict[str, Any]] = {}
    
    for col in df.columns:
        series = df[col]
        missing_count = int(series.isna().sum())
        missing_pct = round((missing_count / total_rows) * 100, 2) if total_rows > 0 else 0
        unique_count = int(series.nunique(dropna=True))
        
        # Check if datetime
        is_datetime = False
        if pd.api.types.is_datetime64_any_dtype(series):
            is_datetime = True
        elif series.dtype == 'object':
            # Probe sample to detect date strings
            sample = series.dropna().head(20)
            if len(sample) > 0 and 'date' in col.lower() or 'time' in col.lower():
                try:
                    pd.to_datetime(sample, errors='raise')
                    is_datetime = True
                except Exception:
                    is_datetime = False

        # Check if Boolean
        is_bool = pd.api.types.is_bool_dtype(series) or (unique_count == 2 and set(series.dropna().unique()).issubset({0, 1, True, False, "True", "False", "true", "false", "yes", "no", "Y", "N"}))
        
        # Check if ID
        is_id = False
        if (unique_count == total_rows and total_rows > 10) or any(k in col.lower() for k in ['id', 'uuid', 'guid', 'key', 'index', 'code']) and unique_count > total_rows * 0.8:
            is_id = True
            
        # Determine main type
        if is_datetime:
            col_type = "DateTime"
            datetime_cols.append(col)
        elif is_id:
            col_type = "ID"
            id_cols.append(col)
        elif is_bool:
            col_type = "Boolean"
            boolean_cols.append(col)
        elif pd.api.types.is_numeric_dtype(series):
            col_type = "Numerical"
            numerical_cols.append(col)
        else:
            col_type = "Categorical"
            categorical_cols.append(col)
            
        # Calculate statistics
        col_stats: Dict[str, Any] = {
            "type": col_type,
            "dtype": str(series.dtype),
            "missing_count": missing_count,
            "missing_percentage": missing_pct,
            "unique_count": unique_count,
            "cardinality": unique_count,
        }
        
        if col_type == "Numerical":
            valid_vals = series.dropna()
            if len(valid_vals) > 0:
                col_stats.update({
                    "mean": float(valid_vals.mean()),
                    "median": float(valid_vals.median()),
                    "std": float(valid_vals.std()) if len(valid_vals) > 1 else 0.0,
                    "min": float(valid_vals.min()),
                    "max": float(valid_vals.max()),
                    "q25": float(valid_vals.quantile(0.25)),
                    "q75": float(valid_vals.quantile(0.75)),
                    "skewness": float(valid_vals.skew()) if len(valid_vals) > 2 else 0.0,
                })
        elif col_type == "Categorical" or col_type == "Boolean":
            top_vals = series.value_counts(dropna=True).head(5).to_dict()
            col_stats["top_categories"] = {str(k): int(v) for k, v in top_vals.items()}
            
        col_profiles[col] = col_stats
        
    # Generate automated natural language summary
    summary_sentences = [
        f"Your dataset contains {total_rows:,} records and {total_cols} columns ({len(numerical_cols)} numerical, {len(categorical_cols)} categorical, {len(datetime_cols)} datetime)."
    ]
    
    # Skewed features
    skewed = [c for c in numerical_cols if abs(col_profiles[c].get("skewness", 0)) > 1.5]
    if skewed:
        summary_sentences.append(f"Features with high skewness include {', '.join(skewed[:3])}.")
        
    # Missing data
    cols_with_missing = [c for c in df.columns if col_profiles[c]["missing_percentage"] > 0]
    if cols_with_missing:
        top_missing = sorted(cols_with_missing, key=lambda c: col_profiles[c]["missing_percentage"], reverse=True)
        summary_sentences.append(f"Missing values detected in {len(cols_with_missing)} columns, highest in {top_missing[0]} ({col_profiles[top_missing[0]]['missing_percentage']}%).")
    else:
        summary_sentences.append("The dataset is complete with 0% missing values.")
        
    if duplicate_rows > 0:
        summary_sentences.append(f"Found {duplicate_rows:,} duplicate rows ({round((duplicate_rows/total_rows)*100, 2)}%).")

    return {
        "shape": {"rows": total_rows, "columns": total_cols},
        "memory": memory_str,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": round((duplicate_rows / total_rows) * 100, 2) if total_rows > 0 else 0,
        "numerical_columns": numerical_cols,
        "categorical_columns": categorical_cols,
        "datetime_columns": datetime_cols,
        "boolean_columns": boolean_cols,
        "id_columns": id_cols,
        "columns": col_profiles,
        "summary": " ".join(summary_sentences)
    }

def format_bytes(size: float) -> str:
    """Format bytes to human-readable string."""
    power = 1024
    n = 0
    units = {0: 'B', 1: 'KB', 2: 'MB', 3: 'GB', 4: 'TB'}
    while size > power and n < 4:
        size /= power
        n += 1
    return f"{size:.2f} {units[n]}"
