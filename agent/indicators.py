"""
CryptoMind AI - Technical Indicators Engine
Calculates 20+ technical indicators for trading analysis
"""

import math
from typing import List, Dict, Any, Tuple, Optional


def calculate_sma(closes: List[float], period: int) -> List[float]:
    """Calculate Simple Moving Average."""
    if len(closes) < period:
        return []
    
    sma = []
    for i in range(period - 1, len(closes)):
        avg = sum(closes[i - period + 1:i + 1]) / period
        sma.append(avg)
    return sma


def calculate_ema(closes: List[float], period: int) -> List[float]:
    """Calculate Exponential Moving Average."""
    if len(closes) < period:
        return []
    
    multiplier = 2 / (period + 1)
    ema = [sum(closes[:period]) / period]  # Start with SMA
    
    for close in closes[period:]:
        ema.append((close - ema[-1]) * multiplier + ema[-1])
    
    return ema


def calculate_rsi(closes: List[float], period: int = 14) -> Dict[str, Any]:
    """
    Calculate Relative Strength Index.
    
    Returns:
        Dict with RSI value and signal interpretation
    """
    if len(closes) < period + 1:
        return {"value": 50, "signal": "NEUTRAL", "strength": 50}
    
    gains = []
    losses = []
    
    for i in range(1, len(closes)):
        change = closes[i] - closes[i-1]
        gains.append(max(change, 0))
        losses.append(abs(min(change, 0)))
    
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    
    if avg_loss == 0:
        rsi = 100
    else:
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
    
    # Interpret signal
    if rsi >= 70:
        signal = "OVERBOUGHT"
        strength = min(100, int((rsi - 70) * 3.33 + 70))
    elif rsi <= 30:
        signal = "OVERSOLD"
        strength = min(100, int((30 - rsi) * 3.33 + 70))
    elif rsi > 50:
        signal = "UP"
        strength = int((rsi - 50) * 2 + 50)
    elif rsi < 50:
        signal = "DOWN"
        strength = int((50 - rsi) * 2 + 50)
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "value": round(rsi, 1),
        "signal": signal,
        "strength": strength,
        "description": f"RSI at {round(rsi, 1)}"
    }


def calculate_macd(
    closes: List[float],
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> Dict[str, Any]:
    """
    Calculate MACD (Moving Average Convergence Divergence).
    """
    if len(closes) < slow + signal:
        return {"value": 0, "signal": "NEUTRAL", "strength": 50}
    
    ema_fast = calculate_ema(closes, fast)
    ema_slow = calculate_ema(closes, slow)
    
    # Align the EMAs
    diff = len(ema_fast) - len(ema_slow)
    ema_fast = ema_fast[diff:]
    
    macd_line = [f - s for f, s in zip(ema_fast, ema_slow)]
    signal_line = calculate_ema(macd_line, signal)
    
    if not macd_line or not signal_line:
        return {"value": 0, "signal": "NEUTRAL", "strength": 50}
    
    current_macd = macd_line[-1]
    current_signal = signal_line[-1] if signal_line else 0
    histogram = current_macd - current_signal
    
    # Determine signal
    if current_macd > current_signal and current_macd > 0:
        sig = "UP"
        strength = min(90, 60 + int(abs(histogram) * 1000))
    elif current_macd < current_signal and current_macd < 0:
        sig = "DOWN"
        strength = min(90, 60 + int(abs(histogram) * 1000))
    elif current_macd > current_signal:
        sig = "UP"
        strength = 55
    elif current_macd < current_signal:
        sig = "DOWN"
        strength = 55
    else:
        sig = "NEUTRAL"
        strength = 50
    
    return {
        "macd": round(current_macd, 6),
        "signal_line": round(current_signal, 6),
        "histogram": round(histogram, 6),
        "signal": sig,
        "strength": min(strength, 90),
        "description": f"MACD {'bullish' if sig == 'UP' else 'bearish' if sig == 'DOWN' else 'neutral'}"
    }


def calculate_stochastic(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    k_period: int = 14,
    d_period: int = 3
) -> Dict[str, Any]:
    """
    Calculate Stochastic Oscillator.
    """
    if len(closes) < k_period + d_period:
        return {"k": 50, "d": 50, "signal": "NEUTRAL", "strength": 50}
    
    k_values = []
    for i in range(k_period - 1, len(closes)):
        period_high = max(highs[i - k_period + 1:i + 1])
        period_low = min(lows[i - k_period + 1:i + 1])
        
        if period_high == period_low:
            k = 50
        else:
            k = ((closes[i] - period_low) / (period_high - period_low)) * 100
        k_values.append(k)
    
    # Calculate %D (SMA of %K)
    d_values = calculate_sma(k_values, d_period)
    
    current_k = k_values[-1] if k_values else 50
    current_d = d_values[-1] if d_values else 50
    
    # Determine signal
    if current_k < 20 and current_d < 20:
        signal = "UP"  # Oversold - potential buy
        strength = min(100, int((20 - current_k) * 4.5 + 70))
    elif current_k > 80 and current_d > 80:
        signal = "DOWN"  # Overbought - potential sell
        strength = min(100, int((current_k - 80) * 4.5 + 70))
    elif current_k > current_d:
        signal = "UP"
        strength = 55
    elif current_k < current_d:
        signal = "DOWN"
        strength = 55
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "k": round(current_k, 1),
        "d": round(current_d, 1),
        "signal": signal,
        "strength": strength,
        "description": f"Stochastic K:{round(current_k, 0)}/D:{round(current_d, 0)}"
    }


def calculate_bollinger_bands(
    closes: List[float],
    period: int = 20,
    std_dev: float = 2.0
) -> Dict[str, Any]:
    """
    Calculate Bollinger Bands.
    """
    if len(closes) < period:
        return {"signal": "NEUTRAL", "strength": 50}
    
    sma = calculate_sma(closes, period)
    if not sma:
        return {"signal": "NEUTRAL", "strength": 50}
    
    middle_band = sma[-1]
    
    # Calculate standard deviation
    recent_closes = closes[-period:]
    variance = sum((x - middle_band) ** 2 for x in recent_closes) / period
    std = math.sqrt(variance)
    
    upper_band = middle_band + (std_dev * std)
    lower_band = middle_band - (std_dev * std)
    
    current_price = closes[-1]
    band_width = ((upper_band - lower_band) / middle_band) * 100
    
    # Position within bands (0-100)
    if upper_band != lower_band:
        position = ((current_price - lower_band) / (upper_band - lower_band)) * 100
    else:
        position = 50
    
    # Determine signal
    if current_price >= upper_band:
        signal = "DOWN"  # Near upper band - potential reversal
        strength = min(80, 60 + int((current_price - upper_band) / (upper_band - middle_band) * 20))
    elif current_price <= lower_band:
        signal = "UP"  # Near lower band - potential reversal
        strength = min(80, 60 + int((lower_band - current_price) / (middle_band - lower_band) * 20))
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "upper": round(upper_band, 5),
        "middle": round(middle_band, 5),
        "lower": round(lower_band, 5),
        "width_pct": round(band_width, 2),
        "position": round(position, 1),
        "signal": signal,
        "strength": strength,
        "description": f"BB Width: {round(band_width, 2)}%"
    }


def calculate_adx(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    period: int = 14
) -> Dict[str, Any]:
    """
    Calculate Average Directional Index (ADX) for trend strength.
    """
    if len(closes) < period * 2:
        return {"value": 25, "signal": "NEUTRAL", "strength": 50}
    
    # Calculate True Range and Directional Movement
    tr_list = []
    plus_dm = []
    minus_dm = []
    
    for i in range(1, len(closes)):
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i-1])
        low_close = abs(lows[i] - closes[i-1])
        tr = max(high_low, high_close, low_close)
        tr_list.append(tr)
        
        up_move = highs[i] - highs[i-1]
        down_move = lows[i-1] - lows[i]
        
        if up_move > down_move and up_move > 0:
            plus_dm.append(up_move)
        else:
            plus_dm.append(0)
        
        if down_move > up_move and down_move > 0:
            minus_dm.append(down_move)
        else:
            minus_dm.append(0)
    
    if len(tr_list) < period:
        return {"value": 25, "signal": "NEUTRAL", "strength": 50}
    
    # Smoothed averages
    atr = sum(tr_list[:period])
    plus_di = sum(plus_dm[:period])
    minus_di = sum(minus_dm[:period])
    
    for i in range(period, len(tr_list)):
        atr = atr - (atr / period) + tr_list[i]
        plus_di = plus_di - (plus_di / period) + plus_dm[i]
        minus_di = minus_di - (minus_di / period) + minus_dm[i]
    
    if atr == 0:
        return {"value": 25, "signal": "NEUTRAL", "strength": 50}
    
    plus_di_val = (plus_di / atr) * 100
    minus_di_val = (minus_di / atr) * 100
    
    di_sum = plus_di_val + minus_di_val
    if di_sum == 0:
        dx = 0
    else:
        dx = abs(plus_di_val - minus_di_val) / di_sum * 100
    
    # ADX is smoothed DX (simplified)
    adx = dx
    
    # Determine signal based on trend strength and direction
    if adx >= 25:
        if plus_di_val > minus_di_val:
            signal = "UP"
        else:
            signal = "DOWN"
        strength = min(90, int(adx * 2))
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "value": round(adx, 1),
        "plus_di": round(plus_di_val, 1),
        "minus_di": round(minus_di_val, 1),
        "signal": signal,
        "strength": strength,
        "trend_strength": "Strong" if adx >= 25 else "Weak",
        "description": f"ADX {round(adx, 1)} - {'Trending' if adx >= 25 else 'Ranging'}"
    }


def calculate_atr(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    period: int = 14
) -> float:
    """Calculate Average True Range."""
    if len(closes) < period + 1:
        return 0
    
    tr_list = []
    for i in range(1, len(closes)):
        high_low = highs[i] - lows[i]
        high_close = abs(highs[i] - closes[i-1])
        low_close = abs(lows[i] - closes[i-1])
        tr = max(high_low, high_close, low_close)
        tr_list.append(tr)
    
    atr = sum(tr_list[-period:]) / period
    return atr


def calculate_momentum(closes: List[float], period: int = 10) -> Dict[str, Any]:
    """Calculate Price Momentum."""
    if len(closes) < period + 1:
        return {"value": 0, "signal": "NEUTRAL", "strength": 50}
    
    momentum = closes[-1] - closes[-period - 1]
    pct_change = (momentum / closes[-period - 1]) * 100 if closes[-period - 1] != 0 else 0
    
    if momentum > 0:
        signal = "UP"
        strength = min(90, 50 + int(abs(pct_change) * 10))
    elif momentum < 0:
        signal = "DOWN"
        strength = min(90, 50 + int(abs(pct_change) * 10))
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "value": round(momentum, 5),
        "pct_change": round(pct_change, 2),
        "signal": signal,
        "strength": strength,
        "description": f"Momentum: {'+' if momentum > 0 else ''}{round(pct_change, 2)}%"
    }


def calculate_roc(closes: List[float], period: int = 12) -> Dict[str, Any]:
    """Calculate Rate of Change."""
    if len(closes) < period + 1:
        return {"value": 0, "signal": "NEUTRAL", "strength": 50}
    
    roc = ((closes[-1] - closes[-period - 1]) / closes[-period - 1]) * 100 if closes[-period - 1] != 0 else 0
    
    if roc > 0:
        signal = "UP"
        strength = min(90, 50 + int(abs(roc) * 5))
    elif roc < 0:
        signal = "DOWN"
        strength = min(90, 50 + int(abs(roc) * 5))
    else:
        signal = "NEUTRAL"
        strength = 50
    
    return {
        "value": round(roc, 2),
        "signal": signal,
        "strength": strength,
        "description": f"ROC: {'+' if roc > 0 else ''}{round(roc, 2)}%"
    }


def calculate_volume_analysis(candles: List[Dict]) -> Dict[str, Any]:
    """Analyze volume trends."""
    if len(candles) < 20:
        return {"signal": "NEUTRAL", "strength": 50}
    
    volumes = [c["volume"] for c in candles if c.get("volume", 0) > 0]
    
    if len(volumes) < 20:
        return {"signal": "NEUTRAL", "strength": 50}
    
    recent_avg = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else volumes[-1]
    historical_avg = sum(volumes[-20:]) / 20
    
    if historical_avg == 0:
        ratio = 1
    else:
        ratio = recent_avg / historical_avg
    
    volume_change_pct = (ratio - 1) * 100
    
    if ratio > 1.5:
        signal = "HIGH"
        strength = min(90, 60 + int((ratio - 1) * 30))
    elif ratio < 0.5:
        signal = "LOW"
        strength = min(90, 60 + int((1 - ratio) * 60))
    else:
        signal = "NEUTRAL"
        strength = 50 + int(abs(volume_change_pct))
    
    return {
        "current_volume": volumes[-1] if volumes else 0,
        "avg_volume": round(historical_avg, 2),
        "ratio": round(ratio, 2),
        "change_pct": round(volume_change_pct, 1),
        "signal": signal,
        "strength": min(strength, 90),
        "description": f"Volume {'+' if volume_change_pct > 0 else ''}{round(volume_change_pct, 1)}% vs avg"
    }


def calculate_sma_analysis(closes: List[float]) -> Dict[str, Any]:
    """Analyze price relative to SMA 20/50/200."""
    result = {
        "sma20": None,
        "sma50": None,
        "sma200": None,
        "signal": "NEUTRAL",
        "strength": 50
    }
    
    if len(closes) < 20:
        return result
    
    current_price = closes[-1]
    
    sma20 = calculate_sma(closes, 20)
    if sma20:
        result["sma20"] = round(sma20[-1], 5)
    
    if len(closes) >= 50:
        sma50 = calculate_sma(closes, 50)
        if sma50:
            result["sma50"] = round(sma50[-1], 5)
    
    if len(closes) >= 200:
        sma200 = calculate_sma(closes, 200)
        if sma200:
            result["sma200"] = round(sma200[-1], 5)
    
    # Determine signal based on price position relative to SMAs
    above_count = 0
    below_count = 0
    total = 0
    
    for sma_key in ["sma20", "sma50", "sma200"]:
        sma_val = result.get(sma_key)
        if sma_val is not None:
            total += 1
            if current_price > sma_val:
                above_count += 1
            else:
                below_count += 1
    
    if total > 0:
        if above_count == total:
            result["signal"] = "UP"
            result["strength"] = 70 + (total * 10)
        elif below_count == total:
            result["signal"] = "DOWN"
            result["strength"] = 70 + (total * 10)
        elif above_count > below_count:
            result["signal"] = "UP"
            result["strength"] = 55 + (above_count * 5)
        elif below_count > above_count:
            result["signal"] = "DOWN"
            result["strength"] = 55 + (below_count * 5)
    
    result["description"] = f"Price {'above' if result['signal'] == 'UP' else 'below' if result['signal'] == 'DOWN' else 'mixed'} SMAs"
    
    return result


def calculate_all_indicators(candles: List[Dict]) -> Dict[str, Any]:
    """
    Calculate all technical indicators from candle data.
    
    Args:
        candles: List of OHLCV candle dictionaries
    
    Returns:
        Dict with all indicator results
    """
    if not candles or len(candles) < 20:
        return {"error": "Insufficient data for analysis"}
    
    # Extract price arrays
    opens = [c["open"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    closes = [c["close"] for c in candles]
    
    current_price = closes[-1]
    
    return {
        "current_price": current_price,
        "candle_count": len(candles),
        
        # Momentum Indicators
        "rsi": calculate_rsi(closes, 14),
        "stochastic": calculate_stochastic(highs, lows, closes),
        "momentum": calculate_momentum(closes, 10),
        "roc": calculate_roc(closes, 12),
        
        # Trend Indicators
        "macd": calculate_macd(closes),
        "adx": calculate_adx(highs, lows, closes),
        "sma": calculate_sma_analysis(closes),
        
        # Volatility Indicators
        "bollinger": calculate_bollinger_bands(closes),
        "atr": round(calculate_atr(highs, lows, closes), 5),
        
        # Volume Indicators
        "volume": calculate_volume_analysis(candles)
    }
