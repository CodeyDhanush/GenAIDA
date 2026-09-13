"""
Safe Analysis Pipeline for Natural Language Queries against DataFrames.
"""

from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
from services.gemini_service import GeminiService
from utils.security import is_safe_code_execution

class AnalysisService:
    def __init__(self, gemini_service: Optional[GeminiService] = None):
        self.gemini = gemini_service or GeminiService()
        
    def process_query(self, df: pd.DataFrame, query: str) -> Dict[str, Any]:
        """
        Execute safe analytical query pipeline:
        1. Parse intent & identify columns
        2. Execute Pandas calculation safely
        3. Formulate visualization parameters
        4. Request Gemini natural language explanation & follow-up questions
        """
        q_lower = query.lower().strip()
        num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Determine intent & execute deterministic calculation
        calc_result, plan_code, viz_rec = self._execute_safe_analysis(df, query, num_cols, cat_cols)
        
        # Generate Gemini explanation
        schema_dict = {col: str(df[col].dtype) for col in df.columns}
        nl_answer = self.gemini.generate_nl_response(query, calc_result, schema_dict)
        
        # Generate suggested follow-up questions
        follow_ups = self.gemini.suggest_followup_questions(query, schema_dict)
        
        return {
            "query": query,
            "pandas_code": plan_code,
            "raw_result": calc_result,
            "nl_explanation": nl_answer,
            "visualization": viz_rec,
            "followup_questions": follow_ups
        }
        
    def _execute_safe_analysis(
        self, 
        df: pd.DataFrame, 
        query: str, 
        num_cols: list, 
        cat_cols: list
    ) -> Tuple[Any, str, Dict[str, Any]]:
        """
        Pattern matching and safe Pandas execution engine.
        """
        q = query.lower()
        
        # 1. Top N query (e.g. "top 10 products by revenue", "top 5 customers")
        if "top" in q or "highest" in q or "best" in q:
            # find category column mentioned
            target_cat = next((c for c in cat_cols if c.lower() in q or c.lower().replace("_", " ") in q), cat_cols[0] if cat_cols else None)
            target_num = next((c for c in num_cols if c.lower() in q or c.lower().replace("_", " ") in q), num_cols[0] if num_cols else None)
            
            n = 10
            import re
            n_match = re.search(r'\b(\d+)\b', q)
            if n_match:
                n = int(n_match.group(1))
                
            if target_cat and target_num:
                grouped = df.groupby(target_cat)[target_num].sum().reset_index()
                sorted_df = grouped.sort_values(by=target_num, ascending=False).head(n)
                code = f"df.groupby('{target_cat}')['{target_num}'].sum().reset_index().sort_values(by='{target_num}', ascending=False).head({n})"
                viz = {"type": "bar", "x": target_cat, "y": target_num, "title": f"Top {n} {target_cat} by Total {target_num}", "data": sorted_df.to_dict(orient="records")}
                return sorted_df.to_dict(orient="records"), code, viz

        # 2. Average by group (e.g. "average sales by region")
        if "average" in q or "mean" in q or "avg" in q:
            target_cat = next((c for c in cat_cols if c.lower() in q or c.lower().replace("_", " ") in q), cat_cols[0] if cat_cols else None)
            target_num = next((c for c in num_cols if c.lower() in q or c.lower().replace("_", " ") in q), num_cols[0] if num_cols else None)
            
            if target_cat and target_num:
                res_df = df.groupby(target_cat)[target_num].mean().reset_index().sort_values(by=target_num, ascending=False)
                code = f"df.groupby('{target_cat}')['{target_num}'].mean().reset_index().sort_values(by='{target_num}', ascending=False)"
                viz = {"type": "bar", "x": target_cat, "y": target_num, "title": f"Average {target_num} by {target_cat}", "data": res_df.to_dict(orient="records")}
                return res_df.to_dict(orient="records"), code, viz

        # 3. Monthly trend (e.g. "show monthly revenue trends")
        if "month" in q or "trend" in q or "over time" in q or "date" in q:
            date_col = next((c for c in df.columns if any(k in c.lower() for k in ['date', 'time', 'year', 'month'])), None)
            target_num = next((c for c in num_cols if c.lower() in q or c.lower().replace("_", " ") in q), num_cols[0] if num_cols else None)
            
            if date_col and target_num:
                df_temp = df.copy()
                try:
                    df_temp['__period'] = pd.to_datetime(df_temp[date_col]).dt.to_period('M').astype(str)
                    trend_df = df_temp.groupby('__period')[target_num].sum().reset_index()
                    code = f"df.groupby(pd.to_datetime(df['{date_col}']).dt.to_period('M'))['{target_num}'].sum().reset_index()"
                    viz = {"type": "line", "x": "__period", "y": target_num, "title": f"Monthly Trend of {target_num}", "data": trend_df.to_dict(orient="records")}
                    return trend_df.to_dict(orient="records"), code, viz
                except Exception:
                    pass

        # 4. Distribution or Histogram
        if "distribution" in q or "spread" in q or "histogram" in q:
            target_num = next((c for c in num_cols if c.lower() in q or c.lower().replace("_", " ") in q), num_cols[0] if num_cols else None)
            if target_num:
                series = df[target_num].dropna()
                summary_stats = {
                    "count": int(series.count()),
                    "mean": float(series.mean()),
                    "std": float(series.std()),
                    "min": float(series.min()),
                    "25%": float(series.quantile(0.25)),
                    "median": float(series.median()),
                    "75%": float(series.quantile(0.75)),
                    "max": float(series.max())
                }
                code = f"df['{target_num}'].describe().to_dict()"
                viz = {"type": "histogram", "x": target_num, "title": f"Distribution of {target_num}"}
                return summary_stats, code, viz

        # 5. Default Group Aggregation or General Summary
        primary_cat = cat_cols[0] if cat_cols else None
        primary_num = num_cols[0] if num_cols else None
        
        if primary_cat and primary_num:
            agg_df = df.groupby(primary_cat)[primary_num].sum().reset_index().sort_values(by=primary_num, ascending=False).head(10)
            code = f"df.groupby('{primary_cat}')['{primary_num}'].sum().reset_index().head(10)"
            viz = {"type": "bar", "x": primary_cat, "y": primary_num, "title": f"Total {primary_num} by {primary_cat}", "data": agg_df.to_dict(orient="records")}
            return agg_df.to_dict(orient="records"), code, viz
            
        # Fallback to dataset summary
        res = df.describe().to_dict()
        code = "df.describe().to_dict()"
        viz = {"type": "table", "title": "Descriptive Summary"}
        return res, code, viz
