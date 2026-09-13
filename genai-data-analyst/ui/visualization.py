"""
Streamlit UI: Visual Analytics & AI Dashboard Generator.
"""

import streamlit as st
import numpy as np
import pandas as pd
from services.visualization_service import create_chart
from analytics.descriptive import calculate_kpis

def render_visualization():
    """Render chart exploration studio and AI Dashboard Generator."""
    st.header("📈 Visual Analytics & Dashboard Generator")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    tab_dashboard, tab_builder = st.tabs(["🚀 AI Auto-Dashboard", "🎨 Custom Chart Builder"])
    
    with tab_dashboard:
        st.subheader("Automated Executive KPI Dashboard")
        kpis = calculate_kpis(df)
        
        # Render KPI Cards in columns
        if kpis:
            kpi_cols = st.columns(len(kpis))
            for i, k in enumerate(kpis):
                kpi_cols[i].metric(
                    label=k["title"], 
                    value=k.get("formatted_total", f"{k['total']:,.2f}"), 
                    delta=f"Avg: {k.get('formatted_average', f'{k.get(\"average\", 0):,.2f}')}"
                )
                
        st.markdown("---")
        
        # Auto-detect best columns for charts
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        date_cols = [c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'year', 'month'])]
        
        dash_c1, dash_c2 = st.columns(2)
        
        with dash_c1:
            if cat_cols and num_cols:
                fig1 = create_chart(df, "bar", x=cat_cols[0], y=num_cols[0], title=f"{num_cols[0]} by {cat_cols[0]}")
                st.plotly_chart(fig1, use_container_width=True)
            elif len(num_cols) >= 1:
                fig1 = create_chart(df, "histogram", x=num_cols[0], title=f"Distribution of {num_cols[0]}")
                st.plotly_chart(fig1, use_container_width=True)
                
        with dash_c2:
            if len(cat_cols) > 1 and num_cols:
                fig2 = create_chart(df, "pie", x=cat_cols[1], y=num_cols[0], title=f"{num_cols[0]} Distribution by {cat_cols[1]}")
                st.plotly_chart(fig2, use_container_width=True)
            elif len(num_cols) >= 2:
                fig2 = create_chart(df, "scatter", x=num_cols[0], y=num_cols[1], title=f"{num_cols[1]} vs {num_cols[0]}")
                st.plotly_chart(fig2, use_container_width=True)
                
        if date_cols and num_cols:
            st.subheader(f"Temporal Trend Analysis: {num_cols[0]} over {date_cols[0]}")
            fig3 = create_chart(df, "line", x=date_cols[0], y=num_cols[0], title=f"Timeline of {num_cols[0]}")
            st.plotly_chart(fig3, use_container_width=True)

    with tab_builder:
        st.subheader("Custom Interactive Visualization Builder")
        c1, c2, c3, c4 = st.columns(4)
        
        chart_types = ["Bar", "Line", "Area", "Scatter", "Histogram", "Box", "Pie", "Heatmap"]
        selected_type = c1.selectbox("Chart Type", chart_types)
        
        all_cols = list(df.columns)
        x_col = c2.selectbox("X-Axis / Category Dimension", all_cols)
        
        numeric_and_none = [None] + num_cols
        y_col = c3.selectbox("Y-Axis (Metric)", numeric_and_none if selected_type != "Heatmap" else [None])
        
        cat_and_none = [None] + cat_cols
        color_col = c4.selectbox("Color / Group Dimension", cat_and_none)
        
        if st.button("Generate Visualization", type="primary"):
            fig = create_chart(
                df,
                chart_type=selected_type,
                x=x_col,
                y=y_col,
                color=color_col,
                title=f"{selected_type} Chart of {y_col or x_col}"
            )
            st.plotly_chart(fig, use_container_width=True)
