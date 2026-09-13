"""
Streamlit UI: Predictive Analytics & ML Modeling.
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
from analytics.predictive import train_predictive_model
from services.gemini_service import GeminiService

def render_predictive():
    """Render Predictive Modeling studio."""
    st.header("🧠 Predictive Analytics & Machine Learning")
    df = st.session_state.get("dataset")
    if df is None:
        st.warning("Please upload a dataset first.")
        return
        
    all_cols = list(df.columns)
    c1, c2 = st.columns(2)
    target_col = c1.selectbox("Target Variable to Predict", all_cols, index=len(all_cols) - 1)
    
    model_choice = c2.selectbox("Algorithm", [
        "Random Forest",
        "Gradient Boosting",
        "Linear / Logistic Regression"
    ])
    
    # Feature selector multiselect
    candidate_features = [c for c in all_cols if c != target_col]
    features = st.multiselect("Select Predictor Features (Defaults to all)", candidate_features, default=candidate_features[:6])
    
    if st.button("🚀 Train & Evaluate Model", type="primary"):
        with st.spinner("Training predictive machine learning model..."):
            model_arg = "Linear Regression" if "Linear" in model_choice else model_choice
            result = train_predictive_model(df, target_col=target_col, feature_cols=features, model_type=model_arg)
            
            if "error" in result:
                st.error(result["error"])
                return
                
            st.success(f"Successfully trained {result['model_name']} for {result['task_type']} task!")
            
            # Metrics Row
            st.subheader(f"Model Performance Metrics ({result['task_type']})")
            metric_cols = st.columns(len(result["metrics"]))
            for i, (k, v) in enumerate(result["metrics"].items()):
                metric_cols[i].metric(k, v)
                
            # Feature Importance
            if result.get("feature_importance"):
                st.subheader("Feature Importance Ranking")
                fi_df = pd.DataFrame([
                    {"Feature": k, "Importance": v} 
                    for k, v in result["feature_importance"].items()
                ])
                fig = px.bar(
                    fi_df, 
                    x="Importance", 
                    y="Feature", 
                    orientation='h',
                    title="Key Drivers of Target Variable",
                    template="plotly_white"
                )
                fig.update_layout(yaxis=dict(autorange="reversed"))
                st.plotly_chart(fig, use_container_width=True)
                
            # Gemini explanation
            gemini = GeminiService()
            st.subheader("🤖 AI Model Insights & Driver Analysis")
            explanation = gemini.generate_nl_response(
                f"Explain which features most heavily influence {target_col} and how a business decision maker should use these predictive findings.",
                {"task": result["task_type"], "metrics": result["metrics"], "top_features": list(result["feature_importance"].items())[:4]},
                {col: str(df[col].dtype) for col in df.columns}
            )
            st.info(explanation)
