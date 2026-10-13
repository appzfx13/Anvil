# Rule: Market Data Integrity & Zero Synthetic Fallback

## Policy
1. All market quotes, tickers, and option chains in ANVIL must strictly represent genuine real-time data from the FYERS Broker API v3 / WebSocket.
2. Synthetic Brownian motion drift, fake random price generators (`random.uniform`, `rand.Float64()`), and artificial strike generators are STRICTLY PROHIBITED.
3. When the Fyers access token is not configured or offline, the API and UI must clearly indicate `FEED_DISCONNECTED` or `DATA_FEED_REQUIRED`.
4. Option chains must be queried directly from `https://api-t1.fyers.in/data/options-chain-v3` with authentic strike prices, CE/PE LTP, OI, and volume.
