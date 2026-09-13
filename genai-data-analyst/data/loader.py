"""
Dataset loading module supporting CSV and Excel files.
"""

from typing import Tuple, Optional
import io
import pandas as pd
from data.validator import validate_dataframe

def load_dataset(file_obj, file_name: str) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Load dataset from a file object (CSV or Excel) into a pandas DataFrame.
    """
    try:
        lower_name = file_name.lower()
        if lower_name.endswith('.csv'):
            # Try reading with utf-8 first, fallback to latin1/iso-8859-1
            try:
                df = pd.read_csv(file_obj)
            except UnicodeDecodeError:
                if hasattr(file_obj, 'seek'):
                    file_obj.seek(0)
                df = pd.read_csv(file_obj, encoding='latin1')
        elif lower_name.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(file_obj, engine='openpyxl' if lower_name.endswith('.xlsx') else None)
        else:
            return None, f"Unsupported file extension for {file_name}"
            
        # Clean column names by trimming whitespace
        df.columns = [str(c).strip() for c in df.columns]
        
        valid, err = validate_dataframe(df)
        if not valid:
            return None, err
            
        return df, None
    except Exception as e:
        return None, f"Error parsing dataset file: {str(e)}"

def load_sample_dataset() -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Load the built-in sample business sales dataset.
    """
    import os
    from pathlib import Path
    
    sample_path = Path(__file__).resolve().parent.parent / "sample_sales_data.csv"
    if not os.path.exists(sample_path):
        return None, "Sample sales data file not found."
        
    try:
        df = pd.read_csv(sample_path)
        return df, None
    except Exception as e:
        return None, f"Failed to load sample dataset: {str(e)}"
