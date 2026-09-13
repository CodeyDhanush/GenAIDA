"""
Descriptive statistics calculation module.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

def calculate_descriptive_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate comprehensive descriptive statistics for all numerical columns.
    Includes Mean, Median, Mode, Std, Min, 25%, 50%, 75%, Max, Skewness, Kurtosis, Missing %.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns
    if len(num_cols) == 0:
        return pd.DataFrame()
        
    stats_list = []
    for col in num_cols:
        series = df[col].dropna()
        if len(series) == 0:
            continue
            
        stats_dict = {
            "Column": col,
            "Count": int(series.count()),
            "Missing %": round((df[col].isna().sum() / len(df)) * 100, 2),
            "Mean": round(float(series.mean()), 4),
            "Std Dev": round(float(series.std()), 4) if len(series) > 1 else 0.0,
            "Min": round(float(series.min()), 4),
            "25%": round(float(series.quantile(0.25)), 4),
            "Median (50%)": round(float(series.median()), 4),
            "75%": round(float(series.quantile(0.75)), 4),
            "Max": round(float(series.max()), 4),
            "IQR": round(float(series.quantile(0.75) - series.quantile(0.25)), 4),
            "Skewness": round(float(series.skew()), 4) if len(series) > 2 else 0.0,
            "Kurtosis": round(float(series.kurtosis()), 4) if len(series) > 3 else 0.0
        }
        stats_list.append(stats_dict)
        
    return pd.DataFrame(stats_list)

def calculate_kpis(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Automatically identify high-value KPIs based on numerical columns.
    """
    num_cols = df.select_dtypes(include=[np.number]).columns
    kpis = []
    
    # Priority keywords for KPI identification
    priority_keywords = ["revenue", "sales", "profit", "amount", "total", "cost", "orders", "quantity", "price"]
    found_cols = []
    
    for kw in priority_keywords:
        for col in num_cols:
            if kw in col.lower() and col not in found_cols:
                found_cols.append(col)
                series = df[col].dropna()
                val = float(series.sum())
                avg = float(series.mean())
                kpis.append({
                    "title": col.replace("_", " ").title(),
                    "total": val,
                    "average": avg,
                    "formatted_total": f"${val:,.2f}" if any(k in col.lower() for k in ["revenue", "profit", "sales", "cost", "price", "amount"]) else f"{val:,.0f}",
                    "formatted_average": f"${avg:,.2f}" if any(k in col.lower() for k in ["revenue", "profit", "sales", "cost", "price", "amount"]) else f"{avg:,.2f}"
                })
                if len(kpis) >= 4:
                    break
        if len(kpis) >= 4:
            break
            
    # If no priority matches, pick first 3-4 numerical columns
    if len(kpis) == 0:
        for col in num_cols[:4]:
            series = df[col].dropna()
            val = float(series.sum())
            kpis.append({
                "title": col.replace("_", " ").title(),
                "total": val,
                "average": float(series.mean()),
                "formatted_total": f"{val:,.2f}",
                "formatted_average": f"{float(series.mean()):,.2f}"
            })
            
    return kpis
