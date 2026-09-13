"""
Correlation Analysis Module.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

def compute_correlation_matrix(df: pd.DataFrame, method: str = "pearson") -> pd.DataFrame:
    """
    Compute correlation matrix for all numeric columns.
    """
    num_df = df.select_dtypes(include=[np.number])
    if num_df.shape[1] < 2:
        return pd.DataFrame()
    return num_df.corr(method=method).round(4)

def find_significant_correlations(
    df: pd.DataFrame, 
    threshold: float = 0.5, 
    method: str = "pearson"
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Identify significant positive and negative pairwise correlations.
    """
    corr_matrix = compute_correlation_matrix(df, method=method)
    if corr_matrix.empty:
        return {"positive": [], "negative": []}
        
    cols = corr_matrix.columns
    positive_pairs = []
    negative_pairs = []
    
    seen = set()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            col1 = cols[i]
            col2 = cols[j]
            r = float(corr_matrix.loc[col1, col2])
            
            if np.isnan(r):
                continue
                
            pair_data = {
                "feature_x": col1,
                "feature_y": col2,
                "correlation": round(r, 4),
                "strength": "Very Strong" if abs(r) >= 0.8 else "Strong" if abs(r) >= 0.6 else "Moderate"
            }
            
            if r >= threshold:
                positive_pairs.append(pair_data)
            elif r <= -threshold:
                negative_pairs.append(pair_data)
                
    # Sort pairs by absolute magnitude
    positive_pairs = sorted(positive_pairs, key=lambda x: abs(x["correlation"]), reverse=True)
    negative_pairs = sorted(negative_pairs, key=lambda x: abs(x["correlation"]), reverse=True)
    
    return {
        "positive": positive_pairs,
        "negative": negative_pairs,
        "matrix": corr_matrix.to_dict()
    }
