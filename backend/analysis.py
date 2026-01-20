import pandas as pd
import numpy as np
import statsmodels.api as sm
from statsmodels.tsa.stattools import acf, pacf

class TimeSeriesAnalyzer:
    def __init__(self):
        pass

    def analyze(self, df: pd.DataFrame, target_column: str, lags: int = 40):
        """
        Calculates ACF and PACF for the given column.
        """
        if target_column not in df.columns:
            return {"error": f"Column '{target_column}' not found"}

        series = df[target_column].dropna()
        
        # Ensure numeric
        try:
            series = pd.to_numeric(series)
        except ValueError:
             return {"error": f"Column '{target_column}' is not numeric"}
        
        if len(series) < 2:
            return {"error": "Not enough data points"}

        # Calculate ACF and PACF
        # nlags cannot be larger than sample size
        available_lags = min(lags, len(series) // 2 - 1)
        if available_lags < 1:
            available_lags = len(series) - 1

        acf_values = acf(series, nlags=available_lags, fft=True)
        pacf_values = pacf(series, nlags=available_lags)

        # Basic Stats
        stats = {
            "mean": float(series.mean()),
            "std": float(series.std()),
            "min": float(series.min()),
            "max": float(series.max()),
            "count": int(len(series))
        }

        return {
            "acf": acf_values.tolist(),
            "pacf": pacf_values.tolist(),
            "stats": stats,
            "lags": list(range(available_lags + 1))
        }
