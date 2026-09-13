"""
Streamlit UI: Dedicated AI Business Insights.
"""

import streamlit as st
import numpy as np
from services.gemini_service import GeminiService
from analytics.descriptive import calculate_kpis
from analytics.correlation import find_significant_correlations
from analytics.anomaly import detect_anomalies

def render_insights():
    """Render executive AI business insights page."""
    st.header("💡 AI Strategic Business Insights")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    st.markdown(
        "Generate a structured, C-level executive briefing summarizing key revenue trends, "
        "operational risks, strategic opportunities, and actionable next steps based on calculated facts."
    )
    
    if st.button("✨ Generate Full Executive Briefing", type="primary"):
        with st.spinner("Synthesizing multi-dimensional insights with Gemini..."):
            gemini = GeminiService()
            profiling = st.session_state.get("profiling", {})
            kpis = calculate_kpis(df)
            correlations = find_significant_correlations(df).get("positive", [])
            
            # Anomaly summary
            num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            anomalies_summary = {}
            if num_cols:
                anom = detect_anomalies(df, num_cols[0])
                anomalies_summary = {
                    "feature": num_cols[0],
                    "count": anom.get("anomaly_count", 0),
                    "rate": f"{anom.get('anomaly_percentage', 0)}%"
                }
                
            insights = gemini.generate_executive_insights(profiling, kpis, correlations, anomalies_summary)
            st.session_state["generated_insights"] = insights
            
    insights = st.session_state.get("generated_insights")
    if insights:
        c1, c2 = st.columns(2)
        with c1:
            st.subheader("📌 Executive Summary")
            st.info(insights.get("executive_summary", ""))
            
            st.subheader("📈 Key Growth Trends")
            st.write(insights.get("key_trends", ""))
            
            st.subheader("🎯 Business Opportunities")
            st.success(insights.get("opportunities", ""))
            
        with c2:
            st.subheader("🚨 Anomalies & Flagged Risks")
            st.warning(f"**Anomalies:** {insights.get('anomalies', '')}\n\n**Risks:** {insights.get('risks', '')}")
            
            st.subheader("📋 Strategic Recommendations")
            st.write(insights.get("recommendations", ""))
            
            st.subheader("🔍 Recommended Next Analysis")
            st.write(insights.get("next_steps", ""))
    else:
        st.info("Click the button above to generate a grounded executive briefing.")
