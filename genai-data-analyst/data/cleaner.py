"""
Data cleaning and preprocessing operations.
"""

from typing import Tuple, List
import pandas as pd
import numpy as np

def remove_duplicates(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """Remove duplicate rows from dataset."""
    initial_len = len(df)
    cleaned_df = df.drop_duplicates().reset_index(drop=True)
    removed_count = initial_len - len(cleaned_df)
    return cleaned_df, removed_count

def handle_missing_values(df: pd.DataFrame, strategy: str = "drop", columns: List[str] = None) -> pd.DataFrame:
    """
    Handle missing values with strategies:
    - 'drop': drop rows with missing values
    - 'mean': impute with column mean (numerical)
    - 'median': impute with column median (numerical)
    - 'mode': impute with column mode
    - 'ffill': forward fill
    """
    df_clean = df.copy()
    target_cols = columns if columns else list(df.columns)
    
    if strategy == "drop":
        df_clean = df_clean.dropna(subset=target_cols).reset_index(drop=True)
    elif strategy == "mean":
        for col in target_cols:
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                df_clean[col] = df_clean[col].fillna(df_clean[col].mean())
    elif strategy == "median":
        for col in target_cols:
            if pd.api.types.is_numeric_dtype(df_clean[col]):
                df_clean[col] = df_clean[col].fillna(df_clean[col].median())
    elif strategy == "mode":
        for col in target_cols:
            mode_val = df_clean[col].mode()
            if not mode_val.empty:
                df_clean[col] = df_clean[col].fillna(mode_val[0])
    elif strategy == "ffill":
        df_clean[target_cols] = df_clean[target_cols].ffill()
        
    return df_clean
