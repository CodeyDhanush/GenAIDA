"""
Streamlit UI: Dataset Overview and Automated Profiling.
"""

import streamlit as st
import pandas as pd
from data.profiler import profile_dataset

def render_overview():
    """Render dataset overview and column profiling."""
    st.header("📊 Dataset Overview & Automated Profiling")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("No dataset loaded. Please upload a file or try the sample dataset on the Home tab.")
        return
        
    profiling = st.session_state.get("profiling") or profile_dataset(df)
    
    # KPI metrics summary row
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Rows", f"{profiling['shape']['rows']:,}")
    c2.metric("Columns", f"{profiling['shape']['columns']}")
    c3.metric("Memory Usage", profiling['memory'])
    c4.metric("Duplicates", f"{profiling['duplicate_rows']} ({profiling['duplicate_percentage']}%)")
    
    missing_total = sum(c['missing_count'] for c in profiling['columns'].values())
    c5.metric("Missing Cells", f"{missing_total:,}")
    
    # Automated Profiling Summary
    st.info(f"📋 **Automated Profiling Summary:**\n\n{profiling['summary']}")
    
    # Dataset Preview with Pagination
    st.subheader("Interactive Dataset Preview")
    page_size = st.selectbox("Rows per page", [10, 25, 50, 100], index=0)
    total_pages = max(1, (len(df) - 1) // page_size + 1)
    page_num = st.number_input("Page", min_value=1, max_value=total_pages, value=1)
    
    start_idx = (page_num - 1) * page_size
    end_idx = min(start_idx + page_size, len(df))
    st.dataframe(df.iloc[start_idx:end_idx], use_container_width=True)
    st.caption(f"Showing rows {start_idx + 1} to {end_idx} of {len(df):,}")
    
    # Detailed Column-by-Column Breakdown
    st.subheader("Column Types & Properties")
    col_records = []
    for col_name, stats in profiling["columns"].items():
        col_records.append({
            "Column": col_name,
            "Detected Type": stats["type"],
            "Data Type": stats["dtype"],
            "Missing Count": stats["missing_count"],
            "Missing %": f"{stats['missing_percentage']}%",
            "Unique Values": stats["unique_count"],
            "Mean / Top Category": f"{stats.get('mean', list(stats.get('top_categories', {}).keys())[:1])}"
        })
    st.dataframe(pd.DataFrame(col_records), use_container_width=True)
