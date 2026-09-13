"""
Dataset validation routines.
"""

from typing import Tuple, List, Optional
import os
import pandas as pd
from config.settings import ALLOWED_EXTENSIONS, MAX_FILE_SIZE_MB

def validate_uploaded_file(file_name: str, file_size_bytes: int) -> Tuple[bool, Optional[str]]:
    """
    Validate uploaded file name, extension, and file size.
    """
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
    
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size_bytes > max_bytes:
        return False, f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_MB}MB."
        
    return True, None

def validate_dataframe(df: pd.DataFrame) -> Tuple[bool, Optional[str]]:
    """
    Verify dataframe validity (non-empty, contains valid column headers).
    """
    if df is None or df.empty:
        return False, "The uploaded dataset is empty."
        
    if df.shape[1] == 0:
        return False, "The uploaded dataset has no columns."
        
    if df.shape[0] == 0:
        return False, "The dataset contains header columns but no data rows."
        
    return True, None
