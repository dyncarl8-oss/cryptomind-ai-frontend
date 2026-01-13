"""
CryptoMind AI - Analysis Engine
Aggregates signals and generates trading verdicts with entry/target/stop-loss
"""

import asyncio
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime

from crypto_data import fetch_ohlcv, get_24h_stats, get_multiple_timeframe_data
from indicators import calculate_all_indicators, calculate_atr


def aggregate_signals(indicators: Dict[str, Any]) -> Dict[str, Any]:
    """
    Aggregate all indicator signals into a weighted score.
    
    Returns:
        Dict with signal counts, scores, and overall direction
    """
    up_signals = []
    down_signals = []
    neutral_signals = []
    
    up_score = 0
    down_score = 0
    
    # Weight multipliers for different indicator categories
    weights = {
        "rsi": 1.2,
        "stochastic": 1.0,
        "momentum": 0.8,
        "roc": 0.8,
        "macd": 1.5,
        "adx": 1.3,
        "sma": 1.4,
        "bollinger": 0.9,
        "volume": 0.7
    }
    
    for indicator_name, weight in weights.items():
        indicator = indicators.get(indicator_name, {})
        if isinstance(indicator, dict):
            signal = indicator.get("signal", "NEUTRAL")
            strength = indicator.get("strength", 50)
            
            signal_data = {
                "indicator": indicator_name.upper(),
                "signal": signal,
                "strength": strength,
                "weighted_score": strength * weight
            }
            
            if signal in ["UP", "OVERSOLD", "HIGH"]:
                up_signals.append(signal_data)
                up_score += strength * weight
            elif signal in ["DOWN", "OVERBOUGHT", "LOW"]:
                down_signals.append(signal_data)
                down_score += strength * weight
            else:
                neutral_signals.append(signal_data)
    
    total_signals = len(up_signals) + len(down_signals) + len(neutral_signals)
    
    # Determine overall direction
    if up_score > down_score * 1.2:
        direction = "UP"
        confidence = min(95, int((up_score / (up_score + down_score + 1)) * 100))
    elif down_score > up_score * 1.2:
        direction = "DOWN"
        confidence = min(95, int((down_score / (up_score + down_score + 1)) * 100))
    else:
        direction = "NEUTRAL"
        confidence = max(40, 100 - int(abs(up_score - down_score) / 10))
    
    # Signal alignment (how many signals agree)
    if direction == "UP":
        alignment = (len(up_signals) / total_signals) * 100 if total_signals > 0 else 50
    elif direction == "DOWN":
        alignment = (len(down_signals) / total_signals) * 100 if total_signals > 0 else 50
    else:
        alignment = (len(neutral_signals) / total_signals) * 100 if total_signals > 0 else 50
    
    return {
        "direction": direction,
        "confidence": confidence,
        "up_signals": len(up_signals),
        "down_signals": len(down_signals),
        "neutral_signals": len(neutral_signals),
        "up_score": round(up_score, 1),
        "down_score": round(down_score, 1),
        "signal_alignment": round(alignment, 1),
        "up_details": up_signals,
        "down_details": down_signals,
        "neutral_details": neutral_signals
    }


def calculate_trade_targets(
    current_price: float,
    direction: str,
    atr: float,
    indicators: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculate entry, target, and stop-loss levels.
    """
    if atr == 0:
        atr = current_price * 0.02  # Default to 2% if ATR is 0
    
    # Get Bollinger Bands for reference
    bb = indicators.get("bollinger", {})
    bb_upper = bb.get("upper", current_price * 1.02)
    bb_lower = bb.get("lower", current_price * 0.98)
    
    # Get SMA levels
    sma = indicators.get("sma", {})
    sma50 = sma.get("sma50", current_price)
    
    if direction == "UP":
        # Long trade targets
        entry_low = current_price - (atr * 0.3)
        entry_high = current_price + (atr * 0.3)
        
        target_low = current_price + (atr * 2)
        target_high = current_price + (atr * 3)
        
        # Stop below recent support
        stop_loss = current_price - (atr * 1.5)
        
    elif direction == "DOWN":
        # Short trade targets
        entry_low = current_price - (atr * 0.3)
        entry_high = current_price + (atr * 0.3)
        
        target_low = current_price - (atr * 3)
        target_high = current_price - (atr * 2)
        
        # Stop above recent resistance
        stop_loss = current_price + (atr * 1.5)
        
    else:
        # Neutral - no trade
        return {
            "direction": "NEUTRAL",
            "entry": None,
            "target": None,
            "stop_loss": None,
            "risk_reward": None
        }
    
    # Calculate risk/reward ratio
    entry_mid = (entry_low + entry_high) / 2
    target_mid = (target_low + target_high) / 2
    
    risk = abs(entry_mid - stop_loss)
    reward = abs(target_mid - entry_mid)
    risk_reward = round(reward / risk, 2) if risk > 0 else 0
    
    return {
        "direction": direction,
        "entry_low": round(entry_low, 5),
        "entry_high": round(entry_high, 5),
        "entry_display": f"{round(entry_low, 5)} - {round(entry_high, 5)}",
        "target_low": round(min(target_low, target_high), 5),
        "target_high": round(max(target_low, target_high), 5),
        "target_display": f"{round(min(target_low, target_high), 5)} - {round(max(target_low, target_high), 5)}",
        "stop_loss": round(stop_loss, 5),
        "risk_reward": risk_reward,
        "atr": round(atr, 5)
    }


def generate_analysis_narrative(
    symbol: str,
    timeframe: str,
    indicators: Dict[str, Any],
    aggregation: Dict[str, Any],
    targets: Dict[str, Any]
) -> str:
    """
    Generate a detailed narrative for the AI to speak.
    """
    direction = aggregation["direction"]
    confidence = aggregation["confidence"]
    
    current_price = indicators.get("current_price", 0)
    rsi = indicators.get("rsi", {})
    macd = indicators.get("macd", {})
    adx = indicators.get("adx", {})
    sma = indicators.get("sma", {})
    volume = indicators.get("volume", {})
    
    narrative = f"""
I've completed my analysis of {symbol} on the {timeframe} timeframe.

**Data Collection Complete:**
- Current Price: ${current_price:.5f}
- Analyzed {indicators.get('candle_count', 0)} candles
- Volume is {volume.get('change_pct', 0):+.1f}% compared to average

**Technical Indicator Results:**

Momentum Indicators:
- RSI is at {rsi.get('value', 50):.1f}, indicating {rsi.get('signal', 'NEUTRAL').lower()} conditions
- Stochastic shows {indicators.get('stochastic', {}).get('signal', 'NEUTRAL').lower()} momentum

Trend Indicators:
- MACD is {macd.get('signal', 'NEUTRAL').lower()}, histogram at {macd.get('histogram', 0):.6f}
- ADX at {adx.get('value', 0):.1f} indicates {'trending' if adx.get('value', 0) >= 25 else 'ranging'} market
- Price is {sma.get('description', 'mixed relative to SMAs')}

**Signal Aggregation:**
- UP Signals: {aggregation['up_signals']} (Score: {aggregation['up_score']})
- DOWN Signals: {aggregation['down_signals']} (Score: {aggregation['down_score']})
- Neutral: {aggregation['neutral_signals']}
- Signal Alignment: {aggregation['signal_alignment']:.1f}%

**FINAL VERDICT:**
Direction: {direction}
Confidence: {confidence}%
"""

    if direction != "NEUTRAL" and targets.get("entry_display"):
        narrative += f"""
**Trade Targets:**
- Entry Zone: {targets['entry_display']}
- Target Zone: {targets['target_display']}
- Stop Loss: {targets['stop_loss']}
- Risk/Reward Ratio: {targets['risk_reward']}:1
"""

    # Add risk warnings
    if confidence < 70:
        narrative += "\n⚠️ Warning: Confidence is below 70%. Consider waiting for stronger signals."
    
    if adx.get("value", 0) < 20:
        narrative += "\n⚠️ Warning: ADX indicates weak trend. The market may be ranging."
    
    if volume.get("ratio", 1) < 0.5:
        narrative += "\n⚠️ Warning: Low volume detected. Watch for potential false breakouts."
    
    return narrative


async def perform_full_analysis(
    symbol: str,
    timeframe: str = "1H"
) -> Dict[str, Any]:
    """
    Perform complete trading analysis for a symbol.
    
    This is the main function that orchestrates the entire analysis pipeline.
    """
    try:
        analysis_start = datetime.now()
        
        # Step 1: Fetch market data
        ohlcv_data = await fetch_ohlcv(symbol, timeframe, limit=300)
        
        if "error" in ohlcv_data:
            return {
                "error": f"Failed to fetch data: {ohlcv_data['error']}",
                "symbol": symbol,
                "timeframe": timeframe
            }
        
        candles = ohlcv_data.get("candles", [])
        if len(candles) < 50:
            return {
                "error": "Insufficient candle data for analysis",
                "symbol": symbol,
                "timeframe": timeframe
            }
        
        # Step 2: Get 24h statistics
        stats_24h = await get_24h_stats(symbol)
        
        # Step 3: Calculate all technical indicators
        indicators = calculate_all_indicators(candles)
        
        if "error" in indicators:
            return {
                "error": indicators["error"],
                "symbol": symbol,
                "timeframe": timeframe
            }
        
        # Step 4: Aggregate signals
        aggregation = aggregate_signals(indicators)
        
        # Step 5: Calculate trade targets
        targets = calculate_trade_targets(
            current_price=indicators["current_price"],
            direction=aggregation["direction"],
            atr=indicators.get("atr", 0),
            indicators=indicators
        )
        
        # Step 6: Generate narrative
        narrative = generate_analysis_narrative(
            symbol=symbol,
            timeframe=timeframe,
            indicators=indicators,
            aggregation=aggregation,
            targets=targets
        )
        
        # Calculate quality score
        quality_factors = []
        
        # Volume quality
        vol_ratio = indicators.get("volume", {}).get("ratio", 1)
        quality_factors.append(min(100, vol_ratio * 50))
        
        # Trend clarity (ADX)
        adx_val = indicators.get("adx", {}).get("value", 0)
        quality_factors.append(min(100, adx_val * 2))
        
        # Signal alignment
        quality_factors.append(aggregation["signal_alignment"])
        
        # Confidence
        quality_factors.append(aggregation["confidence"])
        
        quality_score = sum(quality_factors) / len(quality_factors) if quality_factors else 50
        
        analysis_duration = (datetime.now() - analysis_start).total_seconds()
        
        return {
            "success": True,
            "symbol": ohlcv_data.get("symbol", symbol),
            "timeframe": timeframe,
            "exchange": ohlcv_data.get("exchange", "CryptoCompare"),
            "analyzed_at": datetime.now().isoformat(),
            "analysis_duration_seconds": round(analysis_duration, 2),
            
            # Market Data
            "market_data": {
                "current_price": indicators["current_price"],
                "candle_count": indicators["candle_count"],
                "change_24h_pct": stats_24h.get("change_24h_pct", 0),
                "volume_24h": stats_24h.get("volume_24h", 0),
                "high_24h": stats_24h.get("high_24h", 0),
                "low_24h": stats_24h.get("low_24h", 0)
            },
            
            # Technical Indicators
            "indicators": {
                "momentum": {
                    "rsi": indicators["rsi"],
                    "stochastic": indicators["stochastic"],
                    "momentum": indicators["momentum"],
                    "roc": indicators["roc"]
                },
                "trend": {
                    "macd": indicators["macd"],
                    "adx": indicators["adx"],
                    "sma": indicators["sma"]
                },
                "volatility": {
                    "bollinger": indicators["bollinger"],
                    "atr": indicators["atr"]
                },
                "volume": indicators["volume"]
            },
            
            # Signal Aggregation
            "signal_aggregation": aggregation,
            
            # Final Verdict
            "verdict": {
                "direction": aggregation["direction"],
                "confidence": aggregation["confidence"],
                "quality_score": round(quality_score, 1)
            },
            
            # Trade Targets
            "trade_targets": targets,
            
            # Narrative for AI to speak
            "narrative": narrative
        }
        
    except Exception as e:
        logging.error(f"Analysis error: {e}")
        return {
            "error": str(e),
            "symbol": symbol,
            "timeframe": timeframe
        }


async def get_quick_analysis(symbol: str) -> Dict[str, Any]:
    """
    Get a quick directional bias without full analysis.
    Useful for screening multiple pairs.
    """
    try:
        ohlcv = await fetch_ohlcv(symbol, "1H", limit=50)
        
        if "error" in ohlcv:
            return {"symbol": symbol, "error": ohlcv["error"]}
        
        candles = ohlcv.get("candles", [])
        if len(candles) < 20:
            return {"symbol": symbol, "error": "Insufficient data"}
        
        indicators = calculate_all_indicators(candles)
        aggregation = aggregate_signals(indicators)
        
        return {
            "symbol": symbol,
            "price": indicators["current_price"],
            "direction": aggregation["direction"],
            "confidence": aggregation["confidence"],
            "rsi": indicators.get("rsi", {}).get("value", 50)
        }
        
    except Exception as e:
        return {"symbol": symbol, "error": str(e)}
