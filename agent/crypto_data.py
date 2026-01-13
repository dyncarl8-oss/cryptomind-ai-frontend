"""
CryptoMind AI - Market Data Fetcher
Fetches OHLCV and market data from CryptoCompare API
"""

import os
import logging
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import datetime

# CryptoCompare API configuration
CRYPTOCOMPARE_API_KEY = os.getenv("CRYPTOCOMPARE_API_KEY", "8a639309466b93ee7cbfafaae16279eb22cffe30d1c68a25d0047d2a77d43ab2")
CRYPTOCOMPARE_BASE_URL = "https://min-api.cryptocompare.com/data"


async def fetch_ohlcv(
    symbol: str,
    timeframe: str = "1H",
    limit: int = 300,
    exchange: str = "Binance"
) -> Dict[str, Any]:
    """
    Fetch OHLCV (Open, High, Low, Close, Volume) candle data from CryptoCompare.
    
    Args:
        symbol: Trading pair like "BTC/USDT" or "ALGO/USDT"
        timeframe: Candle timeframe (1M, 5M, 15M, 30M, 1H, 2H, 4H, 1D, 1W)
        limit: Number of candles to fetch (max 2000)
        exchange: Exchange to fetch data from
    
    Returns:
        Dict with candle data and metadata
    """
    try:
        # Parse symbol
        parts = symbol.upper().replace("/", "").replace("-", "")
        if "USDT" in parts:
            fsym = parts.replace("USDT", "")
            tsym = "USDT"
        elif "USD" in parts:
            fsym = parts.replace("USD", "")
            tsym = "USD"
        elif "BTC" in parts:
            fsym = parts.replace("BTC", "")
            tsym = "BTC"
        else:
            fsym = parts[:3]
            tsym = parts[3:]
        
        # Map timeframe to API endpoint
        tf_map = {
            "1M": ("histominute", 1),
            "5M": ("histominute", 5),
            "15M": ("histominute", 15),
            "30M": ("histominute", 30),
            "1H": ("histohour", 1),
            "H1": ("histohour", 1),
            "2H": ("histohour", 2),
            "H2": ("histohour", 2),
            "4H": ("histohour", 4),
            "H4": ("histohour", 4),
            "1D": ("histoday", 1),
            "D1": ("histoday", 1),
            "1W": ("histoday", 7),
            "W1": ("histoday", 7),
        }
        
        endpoint, aggregate = tf_map.get(timeframe.upper(), ("histohour", 1))
        
        url = f"{CRYPTOCOMPARE_BASE_URL}/{endpoint}"
        params = {
            "fsym": fsym,
            "tsym": tsym,
            "limit": limit,
            "aggregate": aggregate,
            "e": exchange,
            "api_key": CRYPTOCOMPARE_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    logging.error(f"CryptoCompare API error: {response.status}")
                    return {"error": f"API returned status {response.status}"}
                
                data = await response.json()
                
                if data.get("Response") == "Error":
                    logging.error(f"CryptoCompare error: {data.get('Message')}")
                    return {"error": data.get("Message", "Unknown error")}
                
                # Handle different API response formats
                raw_data = data.get("Data", [])
                
                # Some endpoints return {"Data": {"Data": [...]}}
                # Others return {"Data": [...]}
                if isinstance(raw_data, dict):
                    candles = raw_data.get("Data", [])
                elif isinstance(raw_data, list):
                    candles = raw_data
                else:
                    candles = []
                
                if not candles:
                    return {"error": "No candle data returned"}
                
                # Format candle data
                formatted_candles = []
                for candle in candles:
                    if candle.get("close", 0) > 0:  # Filter out empty candles
                        formatted_candles.append({
                            "timestamp": candle["time"],
                            "datetime": datetime.fromtimestamp(candle["time"]).isoformat(),
                            "open": candle["open"],
                            "high": candle["high"],
                            "low": candle["low"],
                            "close": candle["close"],
                            "volume": candle.get("volumefrom", 0)
                        })
                
                current_price = formatted_candles[-1]["close"] if formatted_candles else 0
                
                return {
                    "symbol": f"{fsym}/{tsym}",
                    "timeframe": timeframe,
                    "exchange": exchange,
                    "candle_count": len(formatted_candles),
                    "current_price": current_price,
                    "candles": formatted_candles,
                    "fetched_at": datetime.now().isoformat()
                }
                
    except Exception as e:
        logging.error(f"Error fetching OHLCV data: {e}")
        return {"error": str(e)}


async def get_24h_stats(symbol: str) -> Dict[str, Any]:
    """
    Get 24-hour statistics for a trading pair.
    
    Args:
        symbol: Trading pair like "BTC/USDT"
    
    Returns:
        Dict with 24h price change, volume, high/low
    """
    try:
        parts = symbol.upper().replace("/", "").replace("-", "")
        if "USDT" in parts:
            fsym = parts.replace("USDT", "")
            tsym = "USDT"
        elif "USD" in parts:
            fsym = parts.replace("USD", "")
            tsym = "USD"
        else:
            fsym = parts[:3]
            tsym = parts[3:] or "USDT"
        
        url = f"{CRYPTOCOMPARE_BASE_URL}/pricemultifull"
        params = {
            "fsyms": fsym,
            "tsyms": tsym,
            "api_key": CRYPTOCOMPARE_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status != 200:
                    return {"error": f"API returned status {response.status}"}
                
                data = await response.json()
                
                raw_data = data.get("RAW", {}).get(fsym, {}).get(tsym, {})
                
                if not raw_data:
                    return {"error": "No data available for this pair"}
                
                return {
                    "symbol": f"{fsym}/{tsym}",
                    "current_price": raw_data.get("PRICE", 0),
                    "change_24h": raw_data.get("CHANGE24HOUR", 0),
                    "change_24h_pct": raw_data.get("CHANGEPCT24HOUR", 0),
                    "high_24h": raw_data.get("HIGH24HOUR", 0),
                    "low_24h": raw_data.get("LOW24HOUR", 0),
                    "volume_24h": raw_data.get("VOLUME24HOUR", 0),
                    "volume_24h_to": raw_data.get("VOLUME24HOURTO", 0),
                    "market_cap": raw_data.get("MKTCAP", 0),
                    "last_update": datetime.fromtimestamp(
                        raw_data.get("LASTUPDATE", 0)
                    ).isoformat() if raw_data.get("LASTUPDATE") else None
                }
                
    except Exception as e:
        logging.error(f"Error fetching 24h stats: {e}")
        return {"error": str(e)}


async def get_multiple_timeframe_data(
    symbol: str,
    timeframes: List[str] = ["1H", "4H", "1D"]
) -> Dict[str, Any]:
    """
    Fetch data for multiple timeframes for multi-timeframe analysis.
    
    Args:
        symbol: Trading pair
        timeframes: List of timeframes to fetch
    
    Returns:
        Dict with data for each timeframe
    """
    results = {}
    for tf in timeframes:
        data = await fetch_ohlcv(symbol, tf, limit=100)
        results[tf] = data
    
    return {
        "symbol": symbol,
        "timeframes": results,
        "fetched_at": datetime.now().isoformat()
    }
