"""
Streamlit UI: Anomaly Detection and Outlier Analysis.
"""

import streamlit as st
import pandas as pd
import numpy as np
from analytics.anomaly import detect_anomalies
from services.visualization_service import create_anomaly_scatter
from services.gemini_service import GeminiService

def render_anomaly():
    """Render Anomaly Detection studio."""
    st.header("🚨 Statistical & ML Anomaly Detection")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not num_cols:
        st.error("No numerical columns found for anomaly detection.")
        return
        
    c1, c2, c3 = st.columns(3)
    target_col = c1.selectbox("Target Numerical Feature", num_cols)
    method = c2.selectbox("Detection Algorithm", ["IQR", "Z-Score", "Isolation Forest"])
    
    threshold_default = 1.5 if method == "IQR" else 3.0 if method == "Z-Score" else 5.0
    threshold = c3.number_input("Sensitivity / Threshold", value=threshold_default, step=0.1)
    
    if st.button("Run Anomaly Detection", type="primary"):
        with st.spinner("Executing anomaly detection algorithms..."):
            result = detect_anomalies(df, target_col, method=method, threshold=threshold)
            
            if "error" in result:
                st.error(result["error"])
                return
                
            m1, m2, m3 = st.columns(3)
            m1.metric("Anomalies Found", f"{result['anomaly_count']:,}")
            m2.metric("Anomaly Rate", f"{result['anomaly_percentage']}%")
            m3.metric("Normal Records", f"{result['total_records'] - result['anomaly_count']:,}")
            
            # Scatter Plot Visualization
            fig = create_anomaly_scatter(df, target_col, result["anomaly_indices"])
            st.plotly_chart(fig, use_container_width=True)
            
            # AI Natural Language Explanation
            gemini = GeminiService()
            summary_info = f"Detected {result['anomaly_count']} anomalous records ({result['anomaly_percentage']}%) in '{target_col}' using {method} (threshold={threshold})."
            st.subheader("🤖 AI Explanation of Detected Anomalies")
            explanation = gemini.generate_nl_response(
                f"Explain why these anomalies in {target_col} occurred and what operational actions to take.",
                summary_info,
                {col: str(df[col].dtype) for col in df.columns}
            )
            st.info(explanation)
            
            # Affected records table
            if result["anomaly_count"] > 0:
                st.subheader("Affected Outlier Records")
                st.dataframe(result["affected_records"], use_container_width=True)
