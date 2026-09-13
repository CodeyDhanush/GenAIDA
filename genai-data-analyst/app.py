"""
Main Streamlit Application Entry Point for GenAI Data Analyst Assistant.
"""

import streamlit as st
from config.settings import APP_NAME, APP_DESCRIPTION, PAGE_ICON, LAYOUT
from utils.session import init_session_state, clear_session_dataset
from services.gemini_service import GeminiService

# Import all UI sub-modules
from ui.home import render_home
from ui.overview import render_overview
from ui.chat import render_chat
from ui.visualization import render_visualization
from ui.data_quality import render_data_quality
from ui.anomaly import render_anomaly
from ui.correlation import render_correlation
from ui.predictive import render_predictive
from ui.insights import render_insights
from ui.reports import render_reports

# Page configuration
st.set_page_config(
    page_title=APP_NAME,
    page_icon=PAGE_ICON,
    layout=LAYOUT,
    initial_sidebar_state="expanded"
)

# Initialize session state variables
init_session_state()

# Custom SaaS-style CSS
st.markdown("""
<style>
    /* Clean layout & typography */
    .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    /* Metric card styling */
    [data-testid="stMetric"] {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 18px;
        box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    
    /* Top bar & headers */
    h1, h2, h3 {
        color: #0f172a;
        font-weight: 700;
    }
    
    /* Modern buttons */
    .stButton>button {
        border-radius: 8px;
        font-weight: 500;
        transition: all 0.2s ease-in-out;
    }
    
    /* Sidebar polish */
    [data-testid="stSidebar"] {
        background-color: #f8fafc;
        border-right: 1px solid #e2e8f0;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar Navigation
with st.sidebar:
    st.markdown(f"### {PAGE_ICON} **{APP_NAME}**")
    st.caption("AI-Powered Analytical Intelligence")
    
    # Dataset Status Badge
    df = st.session_state.get("dataset")
    ds_name = st.session_state.get("dataset_name", "None")
    if df is not None:
        st.success(f"📁 **Active:** {ds_name}\n({len(df):,} rows, {len(df.columns)} cols)")
        if st.button("🔄 Clear Data & Reset", use_container_width=True):
            clear_session_dataset()
            st.rerun()
    else:
        st.warning("⚠️ No dataset loaded")
        
    st.markdown("---")
    
    # Navigation Menu
    nav_options = [
        "🏠 Home",
        "📊 Dataset Overview",
        "💬 AI Analyst",
        "📈 Visual Analytics",
        "🔍 Data Quality",
        "🚨 Anomaly Detection",
        "🔗 Correlation Analysis",
        "🧠 Predictive Analytics",
        "💡 AI Insights",
        "📄 Reports"
    ]
    
    selected_nav = st.radio("Navigation", nav_options, index=0)
    
    st.markdown("---")
    
    # API Status Indicator
    gemini_svc = GeminiService()
    if gemini_svc.is_available():
        st.markdown("🟢 **Gemini AI:** Connected")
    else:
        st.markdown("🟡 **Gemini AI:** Offline Mode (Local Analysis Active)")
        
    st.caption("v1.0.0 • Production Ready")

# Route navigation to respective view
if selected_nav == "🏠 Home":
    render_home()
elif selected_nav == "📊 Dataset Overview":
    render_overview()
elif selected_nav == "💬 AI Analyst":
    render_chat()
elif selected_nav == "📈 Visual Analytics":
    render_visualization()
elif selected_nav == "🔍 Data Quality":
    render_data_quality()
elif selected_nav == "🚨 Anomaly Detection":
    render_anomaly()
elif selected_nav == "🔗 Correlation Analysis":
    render_correlation()
elif selected_nav == "🧠 Predictive Analytics":
    render_predictive()
elif selected_nav == "💡 AI Insights":
    render_insights()
elif selected_nav == "📄 Reports":
    render_reports()
