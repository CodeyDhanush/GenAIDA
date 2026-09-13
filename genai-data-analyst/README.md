# GenAI Data Analyst Assistant 📊🤖

A production-grade, AI-powered data analytics platform that allows users to upload datasets (CSV and Excel), ask analytical questions in natural language, automatically generate insights, perform statistical hypothesis testing, build interactive Plotly visualizations, detect anomalies, train predictive machine learning models, and receive executive business recommendations grounded in actual calculations without hallucination.

---

## 🌟 Key Features

1. **Dataset Profiling & Hygiene Analysis**:
   - Automatic column classification (Numerical, Categorical, Datetime, Boolean, ID).
   - Cardinality, missing percentages, IQR, skewness, kurtosis, and duplicate row detection.
   - Comprehensive Data Quality Score (0–100) with concrete data remediation recommendations.

2. **Natural Language AI Data Analyst**:
   - Safe analytical query pipeline: Gemini parses intent and determines relevant features.
   - Deterministic execution in Python/Pandas first; Gemini explains the resulting metrics.
   - Dynamic follow-up questions suggestions tailored to previous findings.
   - Conversation history memory with downloadable analysis logs.

3. **Visual Analytics & AI Dashboard**:
   - Interactive Plotly charts: Bar, Line, Area, Scatter, Histogram, Box, Pie, and Correlation Heatmaps.
   - One-click AI Dashboard Generator summarizing primary revenue, order, and profit KPIs.

4. **Anomaly Detection**:
   - Multi-method detection: IQR (Interquartile Range), Z-Score, and Scikit-learn Isolation Forest.
   - Interactive scatter plots isolating anomalous data points with plain-language operational explanations.

5. **Statistical Hypothesis Testing**:
   - Two-Sample Welch's T-Test, One-Way ANOVA, and Chi-Square Test of Independence.
   - 95% Confidence intervals across all continuous metrics.

6. **Predictive Analytics & Machine Learning**:
   - Automated task inference: Regression vs. Multi-class Classification.
   - Model support: Random Forest, Gradient Boosting, Linear & Logistic Regression.
   - Performance evaluation (R², MAE, RMSE, Accuracy, Precision, Recall, F1) and feature importance ranking.

7. **Executive Reporting & Export**:
   - Beautiful, standalone executive briefing report formatted for printing/saving as PDF.
   - Cleaned dataset and query history exports in CSV format.

---

## 🏗️ Architecture & Safe Query Pipeline

```
User Query (Natural Language)
       │
       ▼
Google Gemini API (Intent Parsing & Schema Grounding)
       │
       ▼
Plan Pandas / Statistical Operation
       │
       ▼
AST Security Validator (Disallows arbitrary OS / shell execution)
       │
       ▼
Execute Against In-Memory Pandas DataFrame
       │
       ▼
Compute Numerical Results & Metrics
       │
       ▼
Gemini Natural Language Synthesis (Zero-hallucination explanation)
       │
       ▼
Render Answer + Interactive Plotly Chart + Suggested Follow-ups
```

---

## 💻 Tech Stack

- **Frontend & App Framework**: Streamlit
- **Backend & Data Processing**: Python 3.10+, Pandas, NumPy, OpenPyXL
- **AI & LLM Integration**: Google Gemini API via `@google/genai` / `google-genai`
- **Data Visualization**: Plotly Express & Graph Objects
- **Statistical Analytics**: SciPy, Statsmodels
- **Machine Learning**: Scikit-Learn
- **Containerization**: Docker

---

## 📂 Project Structure

```
genai-data-analyst/
│
├── app.py                      # Main Streamlit application entry point
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment variables
├── Dockerfile                  # Container definition for deployment
├── README.md                   # Complete documentation
├── sample_sales_data.csv       # Pre-bundled enterprise sales test dataset
│
├── config/
│   └── settings.py             # Global settings and environment variable bindings
│
├── services/
│   ├── gemini_service.py       # Google Gemini API integration and prompts
│   ├── analysis_service.py     # Safe Pandas query planner and executor
│   ├── visualization_service.py# Plotly interactive chart generators
│   └── report_service.py       # HTML/PDF report generators and exporters
│
├── data/
│   ├── loader.py               # CSV and Excel loaders with fallback encoding
│   ├── profiler.py             # Automated dataset statistical profiling
│   ├── cleaner.py              # Duplicate and missing value handling
│   └── validator.py            # File format and dataframe validation
│
├── analytics/
│   ├── descriptive.py          # Summary statistics and KPI calculations
│   ├── anomaly.py              # IQR, Z-Score, and Isolation Forest algorithms
│   ├── correlation.py          # Pearson/Spearman matrices and pair rankings
│   ├── statistics.py           # T-test, ANOVA, Chi-Square, Confidence Intervals
│   └── predictive.py           # Auto-ML Regression & Classification pipelines
│
├── ui/
│   ├── home.py                 # Landing page & dataset upload
│   ├── overview.py             # Profiling summary and paginated data preview
│   ├── chat.py                 # Natural language conversational analyst
│   ├── visualization.py        # Visual analytics studio & AI Dashboard
│   ├── data_quality.py         # Data quality scoring and recommendations
│   ├── anomaly.py              # Anomaly detection interface
│   ├── correlation.py          # Heatmaps and relationship explorer
│   ├── predictive.py           # ML training and feature importance
│   ├── insights.py             # Dedicated executive briefing generator
│   └── reports.py              # Report downloads and CSV exports
│
└── utils/
    ├── helpers.py              # String, currency, and numerical formatters
    ├── security.py             # AST-based code validation guardrails
    └── session.py              # Streamlit session state management
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- pip package manager
- Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))

### 2. Clone & Setup Virtual Environment
```bash
cd genai-data-analyst
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` and provide your Gemini API key:
```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 5. Run Locally
```bash
streamlit run app.py
```
Open your browser at `http://localhost:8501`.

---

## 🐳 Docker Deployment

### Build the Docker Image:
```bash
docker build -t genai-data-analyst .
```

### Run Container:
```bash
docker run -p 8501:8501 -e GEMINI_API_KEY="your_actual_gemini_api_key_here" genai-data-analyst
```
Access the application at `http://localhost:8501`.

---

## 🧪 Example Questions to Ask
- *"What are the top 10 products by revenue?"*
- *"What is the average sales by region?"*
- *"Which region has the highest profit?"*
- *"Show monthly revenue trends."*
- *"Are there any anomalies in profit?"*
- *"Which customers are most valuable?"*
- *"What factors are affecting sales?"*
- *"Give me three important business insights."*

---

## 🛡️ Security & Zero-Hallucination Guarantee
- **AST Security Guard**: Generated analysis steps are checked for forbidden calls (`os`, `sys`, `subprocess`, `exec`).
- **Data Grounding**: Numerical metrics are computed exclusively by Python/Pandas in memory. Gemini is strictly utilized for interpreting intent, explaining computed tables, synthesizing patterns, and framing business strategy.
