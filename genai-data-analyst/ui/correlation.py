"""
Streamlit UI: Correlation Analysis & Heatmap.
"""

import streamlit as st
import numpy as np
import pandas as pd
from analytics.correlation import compute_correlation_matrix, find_significant_correlations
from services.visualization_service import create_chart
from services.gemini_service import GeminiService

def render_correlation():
    """Render Correlation Analysis module."""
    st.header("🔗 Automated Correlation Analysis")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) < 2:
        st.error("Need at least 2 numerical columns to calculate correlations.")
        return
        
    c1, c2 = st.columns([1, 1])
    method = c1.selectbox("Correlation Method", ["pearson", "spearman"])
    threshold = c2.slider("Significance Threshold (|r|)", 0.3, 0.9, 0.5, step=0.05)
    
    corr_matrix = compute_correlation_matrix(df, method=method)
    sig_pairs = find_significant_correlations(df, threshold=threshold, method=method)
    
    st.subheader("Interactive Correlation Matrix Heatmap")
    fig = create_chart(df, "heatmap", x="", title=f"Pairwise {method.title()} Correlation Heatmap")
    st.plotly_chart(fig, use_container_width=True)
    
    col_pos, col_neg = st.columns(2)
    with col_pos:
        st.subheader("📈 Strong Positive Correlations (r ≥ threshold)")
        if sig_pairs["positive"]:
            st.dataframe(pd.DataFrame(sig_pairs["positive"]), use_container_width=True)
        else:
            st.caption("No positive correlations met the threshold.")
            
    with col_neg:
        st.subheader("📉 Strong Negative Correlations (r ≤ -threshold)")
        if sig_pairs["negative"]:
            st.dataframe(pd.DataFrame(sig_pairs["negative"]), use_container_width=True)
        else:
            st.caption("No negative correlations met the threshold.")
            
    # AI Explanation
    st.markdown("---")
    st.subheader("🤖 AI Interpretation of Relationships")
    st.caption("Note: Correlation indicates linear statistical association, not causation.")
    
    gemini = GeminiService()
    if st.button("Generate AI Relationship Summary", type="primary"):
        with st.spinner("Analyzing correlation structure with Gemini..."):
            top_relations = sig_pairs["positive"][:3] + sig_pairs["negative"][:3]
            explanation = gemini.generate_nl_response(
                "Explain the strongest business relationships from these correlations, clearly distinguishing correlation from causation.",
                top_relations,
                {col: str(df[col].dtype) for col in df.columns}
            )
            st.info(explanation)
