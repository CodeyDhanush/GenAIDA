"""
Hypothesis testing and inferential statistical analysis.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np
from scipy import stats

def perform_t_test(
    df: pd.DataFrame, 
    numerical_col: str, 
    group_col: str, 
    group_val_a: str, 
    group_val_b: str
) -> Dict[str, Any]:
    """
    Perform independent two-sample t-test comparing two groups on a continuous metric.
    """
    group_a_data = df[df[group_col].astype(str) == str(group_val_a)][numerical_col].dropna()
    group_b_data = df[df[group_col].astype(str) == str(group_val_b)][numerical_col].dropna()
    
    if len(group_a_data) < 2 or len(group_b_data) < 2:
        return {"error": "Both groups must contain at least 2 observations."}
        
    t_stat, p_val = stats.ttest_ind(group_a_data, group_b_data, equal_var=False)
    
    return {
        "test": "Two-Sample Welch's T-Test",
        "metric": numerical_col,
        "group_column": group_col,
        "group_a": {"name": str(group_val_a), "count": len(group_a_data), "mean": round(float(group_a_data.mean()), 4), "std": round(float(group_a_data.std()), 4)},
        "group_b": {"name": str(group_val_b), "count": len(group_b_data), "mean": round(float(group_b_data.mean()), 4), "std": round(float(group_b_data.std()), 4)},
        "t_statistic": round(float(t_stat), 4),
        "p_value": round(float(p_val), 6),
        "is_significant": bool(p_val < 0.05),
        "conclusion": f"Difference between '{group_val_a}' and '{group_val_b}' is statistically {'significant' if p_val < 0.05 else 'not significant'} at α=0.05."
    }

def perform_anova(df: pd.DataFrame, numerical_col: str, group_col: str) -> Dict[str, Any]:
    """
    Perform One-Way ANOVA across multiple groups.
    """
    grouped = df.groupby(group_col)[numerical_col].apply(lambda s: s.dropna().tolist()).to_dict()
    valid_groups = {k: v for k, v in grouped.items() if len(v) >= 2}
    
    if len(valid_groups) < 2:
        return {"error": "Need at least 2 distinct groups with ≥ 2 values each for ANOVA."}
        
    groups_list = list(valid_groups.values())
    f_stat, p_val = stats.f_oneway(*groups_list)
    
    group_summaries = [
        {"group": str(k), "count": len(v), "mean": round(float(np.mean(v)), 4), "std": round(float(np.std(v)), 4)}
        for k, v in valid_groups.items()
    ]
    
    return {
        "test": "One-Way Analysis of Variance (ANOVA)",
        "metric": numerical_col,
        "group_column": group_col,
        "f_statistic": round(float(f_stat), 4),
        "p_value": round(float(p_val), 6),
        "is_significant": bool(p_val < 0.05),
        "group_summaries": group_summaries,
        "conclusion": f"Variation in '{numerical_col}' across '{group_col}' groups is {'statistically significant' if p_val < 0.05 else 'not statistically significant'} (p={p_val:.4f})."
    }

def perform_chi_square(df: pd.DataFrame, col1: str, col2: str) -> Dict[str, Any]:
    """
    Perform Chi-Square Test of Independence between two categorical variables.
    """
    contingency_table = pd.crosstab(df[col1].astype(str), df[col2].astype(str))
    if contingency_table.size < 4:
        return {"error": "Contingency table too small for Chi-Square test."}
        
    chi2, p_val, dof, expected = stats.chi2_contingency(contingency_table)
    
    return {
        "test": "Chi-Square Test of Independence",
        "variables": [col1, col2],
        "chi2_statistic": round(float(chi2), 4),
        "p_value": round(float(p_val), 6),
        "degrees_of_freedom": int(dof),
        "is_significant": bool(p_val < 0.05),
        "conclusion": f"There is {'a significant association' if p_val < 0.05 else 'no significant association'} between '{col1}' and '{col2}' (p={p_val:.4f})."
    }

def calculate_confidence_intervals(df: pd.DataFrame, confidence: float = 0.95) -> pd.DataFrame:
    """
    Calculate confidence intervals for all numerical columns.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns
    results = []
    
    for col in num_cols:
        series = df[col].dropna()
        n = len(series)
        if n < 2:
            continue
        mean = float(series.mean())
        sem = stats.sem(series)
        margin = sem * stats.t.ppf((1 + confidence) / 2., n - 1)
        results.append({
            "Column": col,
            "Mean": round(mean, 4),
            "Confidence Level": f"{int(confidence*100)}%",
            "Lower Bound": round(mean - margin, 4),
            "Upper Bound": round(mean + margin, 4),
            "Margin of Error (±)": round(margin, 4)
        })
        
    return pd.DataFrame(results)
