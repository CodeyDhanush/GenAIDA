"""
Streamlit UI: Export and Report Generation.
"""

import streamlit as st
import pandas as pd
from services.report_service import generate_csv_export, generate_html_report
from analytics.descriptive import calculate_kpis

def render_reports():
    """Render export and reporting page."""
    st.header("📄 Executive Reports & Data Export")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    dataset_name = st.session_state.get("dataset_name", "dataset")
    profiling = st.session_state.get("profiling", {})
    kpis = calculate_kpis(df)
    insights = st.session_state.get("generated_insights", {})
    quality_score = st.session_state.get("data_quality_score", 90)
    
    st.subheader("1. Download Executive Report")
    st.markdown("Generate a standalone, beautifully formatted executive briefing report ready to share or print as PDF.")
    
    html_content = generate_html_report(
        dataset_name=dataset_name,
        profiling=profiling,
        kpis=kpis,
        insights=insights,
        quality_score=quality_score
    )
    
    st.download_button(
        label="📥 Download Executive Report (HTML/Printable PDF)",
        data=html_content.encode('utf-8'),
        file_name=f"Executive_Report_{dataset_name.split('.')[0]}.html",
        mime="text/html",
        type="primary"
    )
    
    st.markdown("---")
    st.subheader("2. Export Cleaned or Filtered Dataset")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown(f"**Current Dataset:** {len(df):,} rows, {len(df.columns)} columns")
        csv_bytes = generate_csv_export(df)
        st.download_button(
            label="📥 Download Dataset (CSV)",
            data=csv_bytes,
            file_name=f"Export_{dataset_name.split('.')[0]}.csv",
            mime="text/csv"
        )
        
    with c2:
        if st.session_state.get("chat_history"):
            chat_data = []
            for item in st.session_state["chat_history"]:
                chat_data.append({
                    "Query": item.get("query"),
                    "Pandas Plan": item.get("pandas_code"),
                    "AI Answer": item.get("nl_explanation")
                })
            chat_df = pd.DataFrame(chat_data)
            st.download_button(
                label="📥 Download Analysis Q&A History (CSV)",
                data=generate_csv_export(chat_df),
                file_name=f"Analysis_History_{dataset_name.split('.')[0]}.csv",
                mime="text/csv"
            )
        else:
            st.caption("No chat analysis history recorded yet.")
