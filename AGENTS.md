# ANVIL Architecture & System Rulebook

## Core Rules & Invariants

### 1. Strict Market Data Integrity: Real Fyers Data Only
- **NO Dummy or Synthetic Data**: Under no circumstances should the system generate synthetic Brownian motion, randomized price drift, or artificial mock options strikes when serving market data.
- **Strict Fyers API v3 Ingestion**: Spot quotes and Option Chains must be directly fetched from the official FYERS API v3 (`/data/quotes` and `/data/options-chain-v3`) and streamed via the Go engine WebSocket.
- **Explicit Unauthenticated State**: If the Fyers token is missing, expired, or disconnected, the system must strictly return an explicit error status (`is_live: false`, `source: "DISCONNECTED"`, `status: "DATA_FEED_REQUIRED"`). It must never disguise missing feeds by fabricating fake ticks.
- **Go Engine Matching**: The Go engine tick streamer must only broadcast authentic Level-1 ticks stored in Redis (`anvil:fyers_quote:{symbol}`). It must never synthesize random prices with `rand.Float64()`.

### 2. DhanHQ API v2 Wire Compatibility
- All order placement (`POST /v2/orders`), positions (`GET /v2/positions`), trades (`GET /v2/trades`), and fund limits (`GET /v2/fundlimit`) endpoints must strictly comply with DhanHQ API v2 wire specifications.
- Support both Dhan Client ID (`dhan_client_id`) and Bearer Access Token (`access_token`) authentication headers.

### 3. Kill Switch & Risk Mitigation
- Emergency kill switch (`GET/POST/DELETE /v2/killswitch`) immediately cancels all pending orders, squares off all open derivative positions, and locks the account until explicitly unlocked.

### 4. Clean & Professional UI Standards
- Keep the user interface sleek, modern, and high-tech.
- Landing pages must focus on streamlined authentication and clean access into the trading terminal.
- Avoid duplicate marketing cards, redundant code blocks, or bloated promotional text.
