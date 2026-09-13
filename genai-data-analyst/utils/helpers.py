"""
General Helper Functions.
"""

from typing import Union

def format_number(val: Union[int, float]) -> str:
    """Format numbers into clean human-friendly strings."""
    if abs(val) >= 1_000_000:
        return f"{val / 1_000_000:.2f}M"
    elif abs(val) >= 1_000:
        return f"{val / 1_000:.1f}K"
    elif isinstance(val, float):
        return f"{val:.2f}"
    return str(val)

def format_currency(val: Union[int, float]) -> str:
    """Format currency amount."""
    return f"${val:,.2f}"

def format_percent(val: float) -> str:
    """Format percentage value."""
    return f"{val:.1f}%"
