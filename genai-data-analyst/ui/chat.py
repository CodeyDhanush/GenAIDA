"""
Streamlit UI: Natural Language AI Data Analyst Chat.
"""

import streamlit as st
import pandas as pd
from services.analysis_service import AnalysisService
from services.visualization_service import create_chart

def render_chat():
    """Render interactive AI chat interface for natural language querying."""
    st.header("💬 Natural Language AI Data Analyst")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first to start querying.")
        return
        
    analysis_svc = AnalysisService()
    
    # Action bar: Clear history & quick prompt chips
    top_c1, top_c2 = st.columns([3, 1])
    with top_c2:
        if st.button("🗑️ Clear Conversation", use_container_width=True):
            st.session_state["chat_history"] = []
            st.rerun()
            
    # Sample queries buttons
    st.caption("Quick Queries:")
    quick_cols = st.columns(4)
    quick_prompts = [
        "Top 10 products by revenue",
        "Average sales by region",
        "Monthly revenue trends",
        "Profit distribution"
    ]
    for i, p in enumerate(quick_prompts):
        if quick_cols[i].button(p, key=f"quick_btn_{i}"):
            _execute_query(df, analysis_svc, p)
            st.rerun()

    # Display Chat History
    for entry in st.session_state.get("chat_history", []):
        with st.chat_message("user"):
            st.markdown(f"**{entry['query']}**")
            
        with st.chat_message("assistant"):
            st.markdown(entry["nl_explanation"])
            
            # Show Pandas execution plan
            with st.expander("🔍 View Pandas Code Execution Plan"):
                st.code(entry["pandas_code"], language="python")
                
            # Render chart if applicable
            viz = entry.get("visualization")
            if viz and viz.get("type") in ["bar", "line", "area", "histogram"]:
                try:
                    res_df = pd.DataFrame(entry["raw_result"]) if isinstance(entry["raw_result"], list) else df
                    fig = create_chart(
                        res_df, 
                        chart_type=viz.get("type", "bar"), 
                        x=viz.get("x"), 
                        y=viz.get("y"), 
                        title=viz.get("title")
                    )
                    st.plotly_chart(fig, use_container_width=True)
                except Exception as e:
                    st.caption(f"(Visualization omitted: {e})")
                    
            # Follow-up questions chips
            if entry.get("followup_questions"):
                st.markdown("**Suggested Follow-ups:**")
                for fq in entry["followup_questions"]:
                    if st.button(f"➡️ {fq}", key=f"fq_{hash(fq)}"):
                        _execute_query(df, analysis_svc, fq)
                        st.rerun()

    # User Input Field
    user_q = st.chat_input("Ask a question about your data (e.g. 'What is the top category by profit?')...")
    if user_q:
        _execute_query(df, analysis_svc, user_q)
        st.rerun()

def _execute_query(df, analysis_svc, query_text):
    with st.spinner("Analyzing dataset with Python & Gemini..."):
        result = analysis_svc.process_query(df, query_text)
        if "chat_history" not in st.session_state:
            st.session_state["chat_history"] = []
        st.session_state["chat_history"].append(result)
