"""
Session State Manager for Streamlit.
"""

import streamlit as st
import pandas as pd
from typing import Optional

def init_session_state():
    """Initialize default session state keys."""
    defaults = {
        "dataset": None,
        "dataset_name": None,
        "profiling": None,
        "chat_history": [],
        "current_query": "",
        "data_quality_score": None,
        "generated_insights": None,
        "active_tab": "Home"
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

def clear_session_dataset():
    """Reset dataset and associated computed artifacts."""
    st.session_state["dataset"] = None
    st.session_state["dataset_name"] = None
    st.session_state["profiling"] = None
    st.session_state["chat_history"] = []
    st.session_state["data_quality_score"] = None
    st.session_state["generated_insights"] = None

def get_current_df() -> Optional[pd.DataFrame]:
    """Retrieve currently active DataFrame."""
    return st.session_state.get("dataset")
