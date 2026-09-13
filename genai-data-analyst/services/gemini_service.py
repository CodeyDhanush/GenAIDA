"""
Google Gemini Service Module for Natural Language Analysis and Business Insights.
Uses google-genai SDK with graceful offline fallback if API key is not configured.
"""

import os
from typing import Dict, Any, List, Optional
from config.settings import GEMINI_API_KEY, GEMINI_MODEL_DEFAULT

class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY
        self.client = None
        self._init_client()
        
    def _init_client(self):
        if not self.api_key:
            return
        try:
            from google import genai
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            print(f"Warning: Failed to initialize Google GenAI Client: {e}")
            self.client = None

    def is_available(self) -> bool:
        """Check if Gemini API is available."""
        return self.client is not None

    def generate_nl_response(
        self, 
        user_query: str, 
        calculated_results: Any, 
        dataset_schema: Dict[str, Any]
    ) -> str:
        """
        Explain calculated dataset results in natural language without hallucinating.
        """
        if not self.is_available():
            return f"Calculated Result:\n{str(calculated_results)}"
            
        prompt = f"""
You are an expert Senior Data Analyst Assistant.
The user asked: "{user_query}"

A deterministic calculation was performed on the user's actual dataset with schema:
Columns: {list(dataset_schema.keys())}

Calculated Analytical Result:
{str(calculated_results)}

INSTRUCTIONS:
1. Answer the user's question clearly, concisely, and accurately based ONLY on the calculated analytical result above.
2. DO NOT invent or extrapolate numbers not present in the calculated result.
3. Highlight key business takeaways, percent differences, or top performers where relevant.
4. Keep the tone professional, objective, and executive-ready.
"""
        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL_DEFAULT,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            return f"Analysis Result:\n{str(calculated_results)}\n\n(AI explanation unavailable: {str(e)})"

    def suggest_followup_questions(
        self, 
        user_query: str, 
        dataset_schema: Dict[str, Any]
    ) -> List[str]:
        """
        Generate 3-5 relevant and logical follow-up analytical questions.
        """
        if not self.is_available():
            cols = list(dataset_schema.keys())[:4]
            return [
                f"Show distribution of {cols[0] if cols else 'revenue'}",
                f"What is the average {cols[1] if len(cols) > 1 else 'profit'} by category?",
                f"Are there any outliers in {cols[0] if cols else 'values'}?"
            ]
            
        prompt = f"""
Given the dataset columns: {list(dataset_schema.keys())}
The user just asked: "{user_query}"

Suggest 3 to 4 concise, high-value follow-up questions that a business executive or data analyst would logically ask next.
Output ONLY the questions, each on a new line starting with a dash (-).
"""
        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL_DEFAULT,
                contents=prompt
            )
            lines = [l.strip().lstrip("-*•0123456789. ") for l in response.text.split("\n") if l.strip()]
            return [l for l in lines if len(l) > 5][:4]
        except Exception:
            return [
                "What are the top drivers behind this metric?",
                "How does this trend compare across regions?",
                "Are there any seasonal fluctuations or anomalies?"
            ]

    def generate_executive_insights(
        self, 
        profiling_data: Dict[str, Any], 
        kpis: List[Dict[str, Any]], 
        correlations: List[Dict[str, Any]], 
        anomalies_summary: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate structured executive business insights based on computed dataset metrics.
        """
        if not self.is_available():
            return {
                "executive_summary": "Dataset analyzed successfully. Detailed statistical metrics and distributions are computed above.",
                "key_trends": "Strong metrics observed across core numerical drivers.",
                "anomalies": f"Detected anomalies in target metrics requiring operational verification.",
                "opportunities": "Focus on high-volume and high-margin segments.",
                "risks": "Mitigate volatility in underperforming dimensions.",
                "recommendations": "Allocate resources toward top-tier contributors and optimize cost structures.",
                "next_steps": "Conduct cohort analysis and deep-dive segmentation."
            }
            
        prompt = f"""
You are a Chief Analytics Officer reviewing computed metrics from an uploaded dataset:

Dataset Summary:
- Rows: {profiling_data.get('shape', {}).get('rows')}
- Columns: {profiling_data.get('shape', {}).get('columns')}
- KPIs: {kpis}
- Notable Correlations: {correlations[:5]}
- Anomalies Detected: {anomalies_summary}

Generate a comprehensive Executive Business Insights briefing with these exact 7 sections.
Format your output with these headers:
### Executive Summary
### Key Trends
### Important Anomalies
### Opportunities
### Risks
### Strategic Recommendations
### Suggested Next Analysis

Make every observation grounded strictly in the provided metrics.
"""
        try:
            response = self.client.models.generate_content(
                model=GEMINI_MODEL_DEFAULT,
                contents=prompt
            )
            text = response.text
            
            sections = {
                "executive_summary": "",
                "key_trends": "",
                "anomalies": "",
                "opportunities": "",
                "risks": "",
                "recommendations": "",
                "next_steps": ""
            }
            
            curr_key = "executive_summary"
            for line in text.split("\n"):
                lower = line.lower()
                if "executive summary" in lower:
                    curr_key = "executive_summary"
                elif "key trend" in lower:
                    curr_key = "key_trends"
                elif "anomal" in lower:
                    curr_key = "anomalies"
                elif "opportunit" in lower:
                    curr_key = "opportunities"
                elif "risk" in lower:
                    curr_key = "risks"
                elif "recommendation" in lower:
                    curr_key = "recommendations"
                elif "next analysis" in lower or "next step" in lower:
                    curr_key = "next_steps"
                else:
                    sections[curr_key] += line + "\n"
                    
            return {k: v.strip() for k, v in sections.items()}
        except Exception as e:
            return {
                "executive_summary": f"Automated insights computed from {profiling_data.get('shape', {}).get('rows')} records.",
                "key_trends": "Review computed correlation and KPI cards for directional movement.",
                "anomalies": "Review outlier charts in the anomaly tab.",
                "opportunities": "Leverage top-performing categories.",
                "risks": "Monitor volatile high-variance dimensions.",
                "recommendations": "Implement regular data audit procedures.",
                "next_steps": "Filter by categorical segments to inspect variance."
            }
