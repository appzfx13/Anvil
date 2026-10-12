# ANVIL

> **Precision Indian Derivative Execution Sandbox — Real-time Fyers Feed with Dhan-Compatible Wire Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Docker Support](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)](#)
[![Backend](https://img.shields.io/badge/Backend-Django%20%2B%20Python%203.13-092E20?logo=django&logoColor=white)](#)
[![Engine](https://img.shields.io/badge/Execution%20Engine-Go%201.23-00ADD8?logo=go&logoColor=white)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](#)
[![Protocol](https://img.shields.io/badge/Protocol-Dhan%20v2%20Compatible-FFA500)](#)

---

## 1. Overview

**ANVIL** is a standalone, ultra-low-latency sandbox broker engineered specifically for Indian algorithmic traders, quant developers, and multi-account trade automation systems. 

It provides a drop-in replacement for the **[DhanHQ API v2](https://dhanhq.co/docs/v2/)**, allowing algorithmic bots, automated strategy engines (such as Marmot), and execution frameworks to run against a hyper-realistic simulated exchange environment with **zero real financial risk**.

### Core Pillars
1. **Real-Time Market Data via FYERS API v3**: Ticks, Level-1 quotes, and option chains are streamed directly from FYERS real-time feeds, ensuring live market pricing.
2. **100% Dhan API v2 Wire Compatibility**: Any algorithm configured with Dhan's Python SDK, Go SDK, or REST endpoints can target ANVIL by changing the base URL.
3. **High-Speed Execution Engine in Go**: Ultra-low latency order matching (sub-50ms), simulated exchange latency, bracket orders (BO), stop-loss/take-profit tracking, and margin locking.
4. **Institutional Virtual Ledger**: Isolated sub-accounts, configurable starting margins (e.g. ₹1,00,000 to ₹1,00,00,000), real-time MTM (Mark-to-Market), and instant balance adjustments.
5. **Modern Single-Page Interface**: Clean React dark-mode trading dashboard, Gmail OTP + Google SSO authentication, interactive Option Chains for 5 Indian indices, and an embedded API playground.

---

## 2. Supported Indices

ANVIL includes native strike resolution, lot sizes, and Fyers symbol mappings for 5 major Indian benchmark indices:

| Index | Fyers Symbol | Underlying Exchange | Strike Step | Lot Size | Expiry Cycle |
|---|---|---|---|---|---|
| **NIFTY 50** | `NSE:NIFTY50-INDEX` | NSE F&O (`NSE_FNO`) | 50 | 25 / 75 | Weekly (Thursday) |
| **BANK NIFTY** | `NSE:NIFTYBANK-INDEX` | NSE F&O (`NSE_FNO`) | 100 | 15 | Weekly (Wednesday) |
| **FINNIFTY** | `NSE:FINNIFTY-INDEX` | NSE F&O (`NSE_FNO`) | 50 | 25 | Weekly (Tuesday) |
| **MIDCAPNIFTY** | `NSE:MIDCPNIFTY-INDEX` | NSE F&O (`NSE_FNO`) | 25 | 50 | Weekly (Monday) |
| **SENSEX** | `BSE:SENSEX-INDEX` | BSE F&O (`BSE_FNO`) | 100 | 10 | Weekly (Friday) |

---

## 3. Architecture & Data Flow

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  +---------------------------+       +-----------------------------------------+  |
|  | Algorithmic Trading Bot   |       | React Web Terminal (:80 / :5173)        |  |
|  | (Python / Marmot / SDK)   |       | - Trading Dashboard & Live MTM          |  |
|  | BaseURL: http://anvil:8088 |       | - Gmail OTP & Google SSO Authentication |  |
|  +-------------+-------------+       | - Interactive Option Chain & Dhan Docs  |  |
+----------------|---------------------+--------------------+--------------------+--+
                 | (Dhan v2 REST / WS)                      | (REST / Auth API)
                 v                                          v
+-----------------------------------------------------------------------------------+
|                               NGINX GATEWAY (:80)                                 |
|         /v2/*  -> Go Engine (:8088)       |   /api/* -> Django (:8000)            |
+--------------------+--------------------------------------+-----------------------+
                     |                                      |
                     v                                      v
+-----------------------------------+  +---------------------------------------------+
|    ANVIL GO MATCHING ENGINE       |  |          DJANGO BACKEND (:8000)             |
|             (:8088)               |  |                                             |
| - Dhan v2 REST Order Handlers     |  | - User Auth & Gmail 6-Digit OTP Service     |
| - In-Memory High-Speed Order Book |  | - Google OAuth2 SSO Provider                |
| - SL / TP / Bracket Order Engine  |  | - Dhan Client-ID & Access Token Generator   |
| - Marketfeed WebSocket Broadcast  |  | - Webhook / Postback Dispatcher             |
| - Sub-millisecond Execution Latency| | - Database Models & Virtual Ledgers         |
+--------------------+--------------+  +--------------------+------------------------+
                     |                                      |
                     |         +------------------+         |
                     +-------->|   REDIS (7.0)    |<--------+
                     |         | (Tick Cache &    |
                     |         |  Order Queue)    |
                     |         +--------+---------+
                     |                  ^
                     |                  |
                     |         +--------+------------------+
                     |         |    FYERS DATA FEED        |
                     |         |  - Real-Time Spot Quotes  |
                     |         |  - Live Option Chains     |
                     |         |  - 5 Supported Indices    |
                     |         +---------------------------+
                     v
       +----------------------------+
       |   POSTGRESQL DB (:5432)    |
       |  - Users & Credentials     |
       |  - Orders & Trade Books    |
       |  - Ledgers & Audit Logs    |
       +----------------------------+
```

---

## 4. Dhan v2 API Compatibility Specification

All trading endpoints match the **[DhanHQ API v2 contract](https://dhanhq.co/docs/v2/)**.

### Authentication Headers
Every request to the Dhan v2 endpoints requires:
```http
client-id: 1000000001
access-token: dhn_sec_sandbox_abcdef1234567890
```

### Supported Endpoints

#### Orders (`/v2/orders`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v2/orders` | Place new order (`MARKET`, `LIMIT`, `STOP_LOSS`, `STOP_LOSS_MARKET`). Returns `orderId` and status `PENDING`. Async matching fills in ~30-50ms to `TRADED`. |
| `GET` | `/v2/orders` | List all orders for the authenticated client ID. |
| `GET` | `/v2/orders/{orderId}` | Fetch details and fill status for a specific order. |
| `PUT` | `/v2/orders/{orderId}` | Modify price, trigger price, or quantity for a `PENDING` order. |
| `DELETE` | `/v2/orders/{orderId}` | Cancel a `PENDING` order. |
| `GET` | `/v2/orders/external/{correlationId}` | Fetch order by client-defined `correlationId`. |

#### Trades (`/v2/trades`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v2/trades` | List all executed trades for the day. |
| `GET` | `/v2/trades/{orderId}` | List fill executions for a given order ID. |

#### Positions (`/v2/positions`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v2/positions` | Return open and closed positions with real-time unrealized/realized MTM based on live Fyers tick prices. |
| `POST` | `/v2/positions/convert` | Convert position product type (e.g. `INTRADAY` to `CNC` / `MARGIN`). |

#### Holdings (`/v2/holdings`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v2/holdings` | Return portfolio equity holdings. |

#### Funds & Margins (`/v2/fundlimit`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v2/fundlimit` | Virtual account margin telemetry (`availabelBalance`, `sodLimit`, `utilizedAmount`, `withdrawableBalance`). |
| `POST` | `/v2/margincalculator` | Compute exact margin requirement before placing order. |

#### Option Chain & Quotes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v2/optionchain?index=NIFTY50` | Real-time option chain matrix with Greeks, strikes, CE/PE LTP directly from Fyers feed. |
| `GET` | `/v2/quotes?symbols=NSE:NIFTY50-INDEX` | Real-time quote snapshot. |

#### WebSocket Market Feed
- URL: `ws://localhost:8088/v2/marketfeed/ws` (or `/mock/v2/marketfeed/ws`)
- Broadcasts real-time tick packets, quote updates, and order status transitions (`PENDING` -> `TRADED` / `REJECTED`).

---

## 5. Web UI Features

1. **Landing Page (`/`)**:
   - Hero section showcasing ANVIL's low-latency capabilities.
   - Live index badge strip displaying real-time Fyers quotes for NIFTY50, BANK NIFTY, FINNIFTY, SENSEX, and MIDCAPNIFTY.
   - Quick architecture overview and interactive feature highlights.
2. **Authentication (`/auth`)**:
   - **Email 6-Digit OTP**: Enters email address -> sends high-priority OTP using Gmail SMTP (or fallback sandbox dev console) -> instant verification -> JWT session.
   - **Google SSO**: One-tap sign-in via Google OAuth.
3. **Trading Terminal Dashboard (`/dashboard`)**:
   - Live telemetry bar: Available Margin, Utilized Margin, Net Realized P&L, Net Unrealized P&L.
   - Dhan API Credentials Card: View Dhan Client ID, Sandbox Access Token, Postback Webhook URL, and 1-Click Sandbox Reset.
   - 1-Click Order Execution Drawer: Buy / Sell, Intraday / Normal, Market / Limit / SL / SL-M with custom target & stoploss values.
   - Live Positions Table with real-time MTM and instant square-off confirmation modals.
   - Order Book and Trade Execution Log with filtering and search.
   - Live Interactive Option Chain drawer with strike selection.
4. **API Documentation & Sandbox Playground (`/docs`)**:
   - Complete Dhan API v2 interactive reference directly embedded.
   - Ready-to-copy code snippets in Python, cURL, Go, and Node.js.
   - Test order dispatcher right from the browser.

---

## 6. Project Structure

```
Anvil/
├── README.md                      # This documentation
├── docker-compose.yml             # Single-command multi-service deployment
├── .env.example                   # Environment configuration template
├── nginx/
│   └── nginx.conf                 # Unified gateway reverse proxy
├── backend/                       # Django Backend & Dhan REST Gateway
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── anvil/
│   │   ├── __init__.py
│   │   ├── settings.py            # DB, Redis, Auth & CORS settings
│   │   ├── urls.py                # Route dispatcher
│   │   └── wsgi.py
│   └── apps/
│       ├── core/                  # Constants (Indices, Lot sizes, Statuses, Error codes)
│       ├── authentication/        # Custom User, Gmail OTP & Google SSO
│       ├── accounts/              # Virtual broker accounts & fund limits
│       ├── dhan_v2/               # 100% Dhan v2 compatible REST views
│       └── fyers_feed/            # Fyers API v3 client & Redis sync worker
├── engine/                        # Go High-Speed Matching Engine
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── main.go                    # Entrypoint & router
│   ├── matching/                  # In-memory orderbook, SL/TP triggers, MTM
│   ├── redis_bridge/              # Redis pub/sub queue consumer
│   └── ws/                        # Market feed WebSocket server
└── frontend/                      # React SPA (Vite + CSS Design System)
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css              # Custom dark-theme glassmorphism design system
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Modal.jsx          # Confirmation dialogs
        │   ├── Toast.jsx          # Notification toasts
        │   ├── OrderModal.jsx     # Order placement widget
        │   └── OptionChainModal.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── AuthPage.jsx
        │   ├── Dashboard.jsx
        │   └── ApiDocsPage.jsx
        └── services/
            ├── api.js             # Unified Axios client
            └── constants.js       # Strict frontend constants
```

---

## 7. Quick Start with Docker

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+ recommended)
- [Docker Compose](https://docs.docker.com/compose/) (v2+ included with Docker Desktop)

### 1. Clone & Configure Environment
```bash
git clone https://github.com/appzfx13/Anvil.git
cd Anvil

# Copy example environment configuration
cp .env.example .env
```

### 2. Configure Fyers & Gmail Credentials in `.env`
Edit `.env` to configure your credentials:
```ini
# FYERS API v3 Credentials (for live market tick feed)
FYERS_APP_ID=YOUR_FYERS_APP_ID-100
FYERS_ACCESS_TOKEN=YOUR_FYERS_ACCESS_TOKEN

# Gmail SMTP for Email OTP Delivery
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-16-char-app-password
```
*(If Fyers access token is empty, ANVIL operates in High-Fidelity Synthetic Simulation mode automatically.)*

### 3. Launch with Docker Compose
```bash
docker compose up --build -d
```

### 4. Access Services (Unique 85xx Port Range)
ANVIL uses a dedicated non-colliding port block (**85xx**) to run concurrently alongside existing projects (e.g. Marmot):
- **Nginx Unified Gateway**: [`http://localhost:8500`](http://localhost:8500) (Accesses Frontend, Django API & Go Engine through a single gateway)
- **React Trading Terminal & Dashboard (Direct)**: [`http://localhost:8573`](http://localhost:8573)
- **Dhan v2 REST API Gateway (Direct)**: [`http://localhost:8588/v2/orders`](http://localhost:8588/v2/orders)
- **Django Admin & Management API (Direct)**: [`http://localhost:8501/admin`](http://localhost:8501/admin)
- **Market Feed WebSocket**: `ws://localhost:8588/v2/marketfeed/ws` (or `ws://localhost:8500/v2/marketfeed/ws`)
- **PostgreSQL Database**: `localhost:8532`
- **Redis Cache & Pub/Sub**: `localhost:8579`
- **Ngrok Web Inspection Dashboard**: [`http://localhost:8540`](http://localhost:8540) (When tunnel is active)

### 5. Exposing ANVIL via Ngrok Tunnel
To allow external trading bots, webhooks (e.g. TradingView, Marmot, external callers) to access ANVIL over public HTTPS:

**Method A: Using Docker Compose**
1. Add your Ngrok authtoken in `.env`:
   ```ini
   NGROK_AUTHTOKEN=your_token_from_dashboard
   ```
2. Start the tunnel container:
   ```bash
   docker compose up -d ngrok
   ```
3. View the public URL and live traffic inspection at [`http://localhost:8540`](http://localhost:8540).

**Method B: Using Local Host CLI**
```bash
ngrok http 8500
```
This directly forwards the public URL to ANVIL's unified Nginx gateway.

---

## 8. Python / Dhan SDK Integration Example

Using the official `dhanhq` Python library with ANVIL:

```python
from dhanhq import dhanhq

# Configure Dhan client with ANVIL's local endpoint
dhan = dhanhq(
    client_id="1000000001",
    access_token="dhn_sec_sandbox_token",
)
# Point API base to ANVIL
dhan.base_url = "http://localhost:8088"

# Place an Intraday Market Order on NIFTY
response = dhan.place_order(
    security_id="49081",
    exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.BUY,
    quantity=25,
    order_type=dhan.MARKET,
    product_type=dhan.INTRADAY,
    price=0,
    trigger_price=0,
    tag="anvil_quant_test"
)

print("ANVIL Execution Response:", response)
```

---

## 9. Design Philosophy

- **Simple is better than complex**: Clean code, zero bloat, deterministic execution.
- **Strictly Zero Fallback Magic**: No silent fallbacks, magic strings, or unhandled exceptions. Errors return Dhan-standard error structures with proper HTTP status codes.
- **Strict Constants**: All exchange codes, lot sizes, index intervals, and transaction types are centralized in dedicated constants files.

---

## 10. License
Distributed under the MIT License. See `LICENSE` for more information.
