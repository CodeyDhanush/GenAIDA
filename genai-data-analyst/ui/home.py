"""
Streamlit UI: Home / Landing Page.
"""

import streamlit as st
from data.loader import load_dataset, load_sample_dataset
from data.profiler import profile_dataset

def render_home():
    """Render modern landing page and upload section."""
    st.title("📊 GenAI Data Analyst Assistant")
    st.markdown(
        "**Upload your data, ask questions in natural language, and get AI-powered insights.** "
        "Engineered with automated data profiling, interactive visualizations, anomaly detection, "
        "predictive modeling, and executive report exports."
    )
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("Upload Dataset")
        uploaded_file = st.file_uploader(
            "Choose a dataset (CSV or Excel)", 
            type=["csv", "xlsx", "xls"],
            help="Maximum supported file size: 50MB"
        )
        
        if uploaded_file is not None:
            with st.spinner("Processing and profiling dataset..."):
                df, err = load_dataset(uploaded_file, uploaded_file.name)
                if err:
                    st.error(err)
                elif df is not None:
                    st.session_state["dataset"] = df
                    st.session_state["dataset_name"] = uploaded_file.name
                    st.session_state["profiling"] = profile_dataset(df)
                    st.success(f"Successfully loaded '{uploaded_file.name}' with {len(df):,} rows and {len(df.columns)} columns!")
                    st.rerun()

        st.markdown("---")
        st.markdown("### Or Test With Pre-Loaded Data")
        if st.button("🚀 Try Sample Dataset (Sales & Business Operations)", type="primary"):
            with st.spinner("Loading comprehensive sample business dataset..."):
                df, err = load_sample_dataset()
                if err:
                    st.error(err)
                elif df is not None:
                    st.session_state["dataset"] = df
                    st.session_state["dataset_name"] = "sample_sales_data.csv"
                    st.session_state["profiling"] = profile_dataset(df)
                    st.success("Sample business dataset loaded successfully!")
                    st.rerun()

    with col2:
        st.subheader("Example Natural Language Questions")
        example_questions = [
            "What are the top 10 products by revenue?",
            "What is the average sales by region?",
            "Which region has the highest profit?",
            "Show monthly revenue trends.",
            "Are there any anomalies in profit?",
            "Which customers are most valuable?",
            "What factors are affecting sales?",
            "Give me three important business insights."
        ]
        for q in example_questions:
            st.markdown(f"- *\"{q}\"*")
            
        st.info("💡 **Tip:** Once loaded, navigate using the sidebar to explore AI Analyst Chat, Anomaly Detection, Correlations, and Predictive Models.")
