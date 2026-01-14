"""
CryptoMind AI - Trading Tools
LiveKit Agent tools for crypto trading analysis
"""

import logging
from livekit.agents import function_tool, RunContext
from typing import Optional

from analysis import perform_full_analysis, get_quick_analysis


import json

_room = None

def set_room(room):
    global _room
    _room = room

@function_tool()
async def analyze_trading_pair(
    context: RunContext,
    symbol: str,
    timeframe: str = "1H"
) -> str:
    """
    Perform comprehensive technical analysis on a crypto trading pair.
    
    Args:
        symbol: The trading pair to analyze (e.g., "BTC/USDT", "ETH/USDT", "ALGO/USDT")
        timeframe: The candle timeframe for analysis. Options: 
                   "1M" (1 minute), "5M" (5 minutes), "15M" (15 minutes), 
                   "30M" (30 minutes), "1H" or "H1" (1 hour), 
                   "2H" or "H2" (2 hours), "4H" or "H4" (4 hours), 
                   "1D" or "D1" (1 day), "1W" or "W1" (1 week)
    
    Returns:
        A concise analysis with verdict and trade targets
    """
    try:
        logging.info(f"Starting analysis for {symbol} on {timeframe} timeframe")
        
        # Signal the UI that we are starting
        if _room:
            try:
                start_payload = json.dumps({
                    "topic": "analysis_status",
                    "status": "started",
                    "symbol": symbol,
                    "timeframe": timeframe
                })
                await _room.local_participant.publish_data(start_payload, topic="analysis_status", reliable=True)
                logging.info(f"Sent analysis_started signal for {symbol}")
            except Exception as e:
                logging.error(f"Failed to send start signal: {e}")

        # Perform the full analysis
        result = await perform_full_analysis(symbol, timeframe)
        
        if "error" in result:
            return f"Analysis failed for {symbol}: {result['error']}"
        
        # Extract key data
        market = result.get("market_data", {})
        verdict = result.get("verdict", {})
        targets = result.get("trade_targets", {})
        indicators = result.get("indicators", {})
        aggregation = result.get("signal_aggregation", {})
        
        # Build concise response for AI to speak
        direction = verdict.get("direction", "NEUTRAL")
        confidence = verdict.get("confidence", 0)
        
        # Get key indicator values
        rsi = indicators.get("momentum", {}).get("rsi", {})
        macd = indicators.get("trend", {}).get("macd", {})
        adx = indicators.get("trend", {}).get("adx", {})
        
        # Publish structured data to the room for frontend
        if _room:
            try:
                # Format data for frontend parsing in AnalysisProgress
                frontend_data = {
                    "price": f"${market.get('current_price', 0):.5f}",
                    "change": f"{market.get('change_24h_pct', 0):+.2f}%",
                    "candles": 300,
                    "rsi": { 
                        "value": rsi.get('value', 50), 
                        "signal": rsi.get('signal', 'NEUTRAL') 
                    },
                    "macd": { "signal": macd.get('signal', 'NEUTRAL') },
                    "adx": { "value": adx.get('value', 25) },
                    "upSignals": aggregation.get('up_signals', 0),
                    "downSignals": aggregation.get('down_signals', 0),
                    "upScore": aggregation.get('up_score', 0),
                    "downScore": aggregation.get('down_score', 0),
                    "verdict": direction,
                    "confidence": confidence,
                    "entry": targets.get('entry_display', 'N/A'),
                    "target": targets.get('target_display', 'N/A'),
                    "stop": targets.get('stop_loss', 'N/A')
                }
                
                payload = json.dumps({
                    "topic": "analysis_data", 
                    "data": frontend_data,
                    "symbol": symbol,
                    "timeframe": timeframe
                })
                
                await _room.local_participant.publish_data(payload, topic="analysis_data", reliable=True)
                logging.info("Published analysis data to room")
            except Exception as e:
                logging.error(f"Failed to publish data: {e}")

        response = f"""Analysis complete for {symbol}. Verdict: {direction} ({confidence}% confidence).
See full results in the display above.
Entry: {targets.get('entry_display', 'N/A')}
Target: {targets.get('target_display', 'N/A')}
Stop: {targets.get('stop_loss', 'N/A')}"""

        return response
        
    except Exception as e:
        logging.error(f"Error analyzing {symbol}: {e}")
        return f"An error occurred while analyzing {symbol}: {str(e)}"


@function_tool()
async def get_crypto_price(
    context: RunContext,
    symbol: str
) -> str:
    """
    Get the current price and 24h stats for a crypto trading pair.
    
    Args:
        symbol: The trading pair (e.g., "BTC/USDT", "ETH/USDT")
    
    Returns:
        Current price, 24h change, and volume information
    """
    try:
        from crypto_data import get_24h_stats
        
        stats = await get_24h_stats(symbol)
        
        if "error" in stats:
            return f"Could not fetch price for {symbol}: {stats['error']}"
        
        return f"""
Current price for {stats.get('symbol', symbol)}:
- Price: ${stats.get('current_price', 0):.5f}
- 24h Change: {stats.get('change_24h_pct', 0):+.2f}%
- 24h High: ${stats.get('high_24h', 0):.5f}
- 24h Low: ${stats.get('low_24h', 0):.5f}
- 24h Volume: ${stats.get('volume_24h_to', 0):,.2f}
"""
        
    except Exception as e:
        logging.error(f"Error fetching price for {symbol}: {e}")
        return f"An error occurred: {str(e)}"


@function_tool()
async def quick_market_scan(
    context: RunContext,
    symbols: str
) -> str:
    """
    Quickly scan multiple trading pairs for directional bias.
    
    Args:
        symbols: Comma-separated list of trading pairs (e.g., "BTC/USDT,ETH/USDT,SOL/USDT")
    
    Returns:
        Quick directional analysis for each symbol
    """
    try:
        import asyncio
        
        symbol_list = [s.strip() for s in symbols.split(",")]
        
        if len(symbol_list) > 5:
            symbol_list = symbol_list[:5]  # Limit to 5 pairs
        
        tasks = [get_quick_analysis(sym) for sym in symbol_list]
        results = await asyncio.gather(*tasks)
        
        response = "**Quick Market Scan Results:**\n\n"
        
        for result in results:
            sym = result.get("symbol", "Unknown")
            if "error" in result:
                response += f"- {sym}: Unable to analyze - {result['error']}\n"
            else:
                direction = result.get("direction", "NEUTRAL")
                confidence = result.get("confidence", 0)
                price = result.get("price", 0)
                rsi = result.get("rsi", 50)
                
                emoji = "🟢" if direction == "UP" else "🔴" if direction == "DOWN" else "⚪"
                response += f"{emoji} **{sym}**: {direction} ({confidence}% confidence) | Price: ${price:.5f} | RSI: {rsi:.1f}\n"
        
        return response
        
    except Exception as e:
        logging.error(f"Error in market scan: {e}")
        return f"An error occurred during market scan: {str(e)}"


@function_tool()
async def explain_indicator(
    context: RunContext,
    indicator: str
) -> str:
    """
    Explain what a technical indicator means and how to interpret it.
    
    Args:
        indicator: The indicator to explain (e.g., "RSI", "MACD", "Bollinger Bands")
    
    Returns:
        Educational explanation of the indicator
    """
    explanations = {
        "rsi": """
**RSI (Relative Strength Index)**

The RSI measures the speed and magnitude of recent price changes to evaluate overbought or oversold conditions.

- **Range**: 0 to 100
- **Overbought**: RSI > 70 (potential sell signal)
- **Oversold**: RSI < 30 (potential buy signal)
- **Neutral**: RSI between 30-70

**How I use it**: I look for divergences between price and RSI, and use extreme readings as potential reversal signals.
""",
        "macd": """
**MACD (Moving Average Convergence Divergence)**

MACD shows the relationship between two EMAs (12 and 26 period by default).

- **MACD Line**: 12 EMA - 26 EMA
- **Signal Line**: 9 EMA of MACD Line
- **Histogram**: MACD Line - Signal Line

**Signals**:
- Bullish: MACD crosses above Signal Line
- Bearish: MACD crosses below Signal Line

**How I use it**: I look for crossovers and histogram divergences to confirm trend direction.
""",
        "bollinger": """
**Bollinger Bands**

Bollinger Bands consist of a middle band (20 SMA) with upper and lower bands at 2 standard deviations.

- **Upper Band**: SMA + (2 × Standard Deviation)
- **Lower Band**: SMA - (2 × Standard Deviation)

**Signals**:
- Price near upper band: Potentially overbought
- Price near lower band: Potentially oversold
- Band squeeze: Low volatility, potential breakout coming

**How I use it**: I watch for price touches on the bands and band width for volatility analysis.
""",
        "adx": """
**ADX (Average Directional Index)**

ADX measures trend strength, not direction.

- **Range**: 0 to 100
- **Weak Trend**: ADX < 20
- **Trending**: ADX 20-40
- **Strong Trend**: ADX > 40

**How I use it**: I use ADX to determine if a market is trending (favoring trend-following strategies) or ranging (favoring mean reversion).
""",
        "stochastic": """
**Stochastic Oscillator**

Shows the position of the current close relative to the high-low range over a period.

- **%K**: Current close position in the range
- **%D**: 3-period SMA of %K

**Signals**:
- Overbought: > 80
- Oversold: < 20
- Bullish crossover: %K crosses above %D in oversold zone
- Bearish crossover: %K crosses below %D in overbought zone

**How I use it**: Best for ranging markets to identify potential reversal points.
"""
    }
    
    indicator_lower = indicator.lower().replace(" ", "").replace("bands", "")
    
    if indicator_lower in explanations:
        return explanations[indicator_lower]
    else:
        return f"I don't have a detailed explanation for '{indicator}'. Available indicators: RSI, MACD, Bollinger Bands, ADX, Stochastic."