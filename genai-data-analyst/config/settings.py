"""
Configuration Settings for GenAI Data Analyst Assistant.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
SAMPLE_DATA_DIR = BASE_DIR / "data"

# Application Metadata
APP_NAME = "GenAI Data Analyst Assistant"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "Upload your data, ask questions in natural language, and get AI-powered insights."

# Gemini API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_DEFAULT = "gemini-2.5-flash"
GEMINI_TIMEOUT_SECONDS = int(os.getenv("DEFAULT_TIMEOUT_SECONDS", "45"))

# Data constraints
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_ROWS_FOR_INLINE_PROFILING = 250_000

# UI Theme Config
PAGE_ICON = "📊"
LAYOUT = "wide"
THEME_PRIMARY_COLOR = "#2563EB"
THEME_SECONDARY_COLOR = "#0F172A"
