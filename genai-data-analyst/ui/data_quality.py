"""
Streamlit UI: Data Quality Analysis & Audit.
"""

import streamlit as st
import pandas as pd
import numpy as np

def compute_data_quality_report(df: pd.DataFrame):
    """Calculate comprehensive data quality score and audit metrics."""
    total_cells = df.size
    total_rows = len(df)
    
    # 1. Missing Values
    missing_cells = df.isna().sum().sum()
    missing_pct = (missing_cells / total_cells) * 100 if total_cells > 0 else 0
    
    # 2. Duplicate rows
    dup_rows = df.duplicated().sum()
    dup_pct = (dup_rows / total_rows) * 100 if total_rows > 0 else 0
    
    # 3. Constant columns (0 variance)
    constant_cols = [c for c in df.columns if df[c].nunique(dropna=False) <= 1]
    
    # 4. Outliers estimate in numeric columns
    num_cols = df.select_dtypes(include=[np.number]).columns
    outlier_cells = 0
    for col in num_cols:
        s = df[col].dropna()
        if len(s) > 5:
            q25, q75 = s.quantile(0.25), s.quantile(0.75)
            iqr = q75 - q25
            outliers = ((s < (q25 - 1.5 * iqr)) | (s > (q75 + 1.5 * iqr))).sum()
            outlier_cells += outliers
            
    outlier_pct = (outlier_cells / (len(num_cols) * total_rows)) * 100 if len(num_cols) > 0 and total_rows > 0 else 0
    
    # 5. Multicollinearity (High correlations > 0.85)
    high_corr_pairs = []
    if len(num_cols) >= 2:
        corr_matrix = df[num_cols].corr().abs()
        for i in range(len(num_cols)):
            for j in range(i + 1, len(num_cols)):
                r = corr_matrix.iloc[i, j]
                if r > 0.85:
                    high_corr_pairs.append((num_cols[i], num_cols[j], round(r, 2)))
                    
    # Calculate Overall Quality Score (0-100)
    score = 100.0
    score -= min(30.0, missing_pct * 3)
    score -= min(25.0, dup_pct * 2.5)
    score -= min(20.0, outlier_pct * 1.5)
    score -= len(constant_cols) * 5
    score = max(0, min(100, int(round(score))))
    
    # Generate recommendations
    recommendations = []
    if missing_pct > 0:
        recommendations.append(f"Impute or handle {missing_cells:,} missing values ({missing_pct:.1f}% of total cells).")
    if dup_rows > 0:
        recommendations.append(f"Remove {dup_rows:,} duplicate records ({dup_pct:.1f}% of dataset).")
    if outlier_pct > 2.0:
        recommendations.append(f"Investigate extreme outliers detected across {outlier_pct:.1f}% of numerical cells.")
    if constant_cols:
        recommendations.append(f"Drop redundant single-value constant columns: {', '.join(constant_cols)}.")
    if high_corr_pairs:
        recommendations.append(f"Address multicollinearity between {len(high_corr_pairs)} highly correlated pairs (r > 0.85).")
    if not recommendations:
        recommendations.append("Excellent data hygiene! No critical data quality defects detected.")
        
    return {
        "score": score,
        "missing_cells": missing_cells,
        "missing_pct": round(missing_pct, 2),
        "duplicate_rows": dup_rows,
        "duplicate_pct": round(dup_pct, 2),
        "constant_cols": constant_cols,
        "outlier_pct": round(outlier_pct, 2),
        "high_corr_pairs": high_corr_pairs,
        "recommendations": recommendations
    }

def render_data_quality():
    """Render Data Quality Audit tab."""
    st.header("🔍 Data Quality Analysis & Audit")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    report = compute_data_quality_report(df)
    st.session_state["data_quality_score"] = report["score"]
    
    # Score banner
    c_score, c_stats = st.columns([1, 2])
    with c_score:
        st.subheader("Data Quality Score")
        score_val = report["score"]
        color = "green" if score_val >= 80 else "orange" if score_val >= 60 else "red"
        st.markdown(f"<h1 style='color:{color}; font-size: 56px; margin: 0;'>{score_val} / 100</h1>", unsafe_allow_html=True)
        st.caption("Calculated based on completeness, uniqueness, and consistency.")
        
    with c_stats:
        st.subheader("Quality Metrics Breakdown")
        m1, m2, m3 = st.columns(3)
        m1.metric("Missing Values", f"{report['missing_pct']}%", f"{report['missing_cells']:,} cells")
        m2.metric("Duplicates", f"{report['duplicate_pct']}%", f"{report['duplicate_rows']:,} rows")
        m3.metric("Outlier Rate", f"{report['outlier_pct']}%")
        
    st.markdown("---")
    
    st.subheader("💡 Recommendations to Improve Data Quality")
    for rec in report["recommendations"]:
        st.markdown(f"- ✅ {rec}")
        
    if report["high_corr_pairs"]:
        st.warning(f"⚠️ **High Collinearity Detected (>0.85):** {', '.join([f'{p[0]} ↔ {p[1]} (r={p[2]})' for p in report['high_corr_pairs']])}")
