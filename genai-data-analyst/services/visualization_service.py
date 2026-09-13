"""
Interactive Visualization Service using Plotly.
"""

from typing import Dict, Any, Optional, List
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
import numpy as np

def create_chart(
    df: pd.DataFrame,
    chart_type: str,
    x: str,
    y: Optional[str] = None,
    color: Optional[str] = None,
    title: Optional[str] = None,
    aggregation: str = "sum"
) -> go.Figure:
    """
    Generate an interactive Plotly figure based on chart type and column parameters.
    """
    chart_type = chart_type.lower()
    title_text = title or f"{chart_type.title()} Chart: {y or ''} by {x}"
    
    # Template & design styling
    template = "plotly_white"
    color_discrete_sequence = px.colors.qualitative.Prism
    
    if chart_type == "bar":
        if y:
            # Aggregate if multiple rows exist per x
            if df[x].duplicated().any():
                if aggregation == "mean":
                    agg_df = df.groupby(x)[y].mean().reset_index()
                elif aggregation == "count":
                    agg_df = df.groupby(x)[y].count().reset_index()
                else:
                    agg_df = df.groupby(x)[y].sum().reset_index()
                fig = px.bar(agg_df, x=x, y=y, title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
            else:
                fig = px.bar(df, x=x, y=y, color=color, title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
        else:
            fig = px.bar(df[x].value_counts().reset_index(), x='index', y=x, title=title_text, template=template)
            
    elif chart_type == "line":
        if y:
            fig = px.line(df, x=x, y=y, color=color, markers=True, title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
        else:
            fig = px.line(df, x=x, title=title_text, template=template)
            
    elif chart_type == "area":
        fig = px.area(df, x=x, y=y, color=color, title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
        
    elif chart_type == "scatter":
        fig = px.scatter(df, x=x, y=y, color=color, trendline="ols" if pd.api.types.is_numeric_dtype(df[x]) and pd.api.types.is_numeric_dtype(df[y]) else None, title=title_text, template=template)
        
    elif chart_type == "histogram":
        fig = px.histogram(df, x=x, color=color, marginal="box", title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
        
    elif chart_type == "box":
        fig = px.box(df, x=x, y=y, color=color, title=title_text, template=template, color_discrete_sequence=color_discrete_sequence)
        
    elif chart_type == "pie":
        if y:
            agg = df.groupby(x)[y].sum().reset_index()
            fig = px.pie(agg, names=x, values=y, title=title_text, template=template, hole=0.35, color_discrete_sequence=color_discrete_sequence)
        else:
            counts = df[x].value_counts().reset_index()
            fig = px.pie(counts, names='index', values=x, title=title_text, template=template, hole=0.35, color_discrete_sequence=color_discrete_sequence)
            
    elif chart_type == "heatmap" or chart_type == "correlation matrix":
        corr = df.select_dtypes(include=[np.number]).corr().round(2)
        fig = px.imshow(corr, text_auto=True, aspect="auto", color_continuous_scale="RdBu_r", title=title_text or "Correlation Heatmap")
        
    else:
        fig = px.bar(df, x=x, y=y, title=title_text, template=template)
        
    fig.update_layout(
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(family="Inter, sans-serif"),
        hoverlabel=dict(bgcolor="white", font_size=12)
    )
    return fig

def create_anomaly_scatter(df: pd.DataFrame, col: str, anomaly_indices: List[int]) -> go.Figure:
    """
    Generate an anomaly visualization chart highlighting anomalous data points.
    """
    fig = go.Figure()
    
    # Normal points
    normal_mask = ~df.index.isin(anomaly_indices)
    fig.add_trace(go.Scatter(
        x=df.index[normal_mask],
        y=df[col][normal_mask],
        mode='markers',
        name='Normal Points',
        marker=dict(color='#2563EB', size=7, opacity=0.7)
    ))
    
    # Anomalous points
    if anomaly_indices:
        fig.add_trace(go.Scatter(
            x=anomaly_indices,
            y=df.loc[anomaly_indices, col],
            mode='markers',
            name='Detected Anomalies',
            marker=dict(color='#EF4444', size=12, symbol='diamond-open', line=dict(width=2, color='#DC2626'))
        ))
        
    fig.update_layout(
        title=f"Anomaly Detection Scatter: {col}",
        xaxis_title="Record Index",
        yaxis_title=col,
        template="plotly_white",
        margin=dict(l=40, r=40, t=60, b=40)
    )
    return fig
