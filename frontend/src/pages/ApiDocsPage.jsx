import React, { useState } from 'react';
import { BookOpen, Copy, Check, Play, Terminal, ExternalLink, Code2 } from 'lucide-react';
import { api } from '../services/api';

const ENDPOINTS = [
  {
    id: 'post-token',
    method: 'POST',
    path: '/v2/token',
    category: 'Authentication',
    title: 'Marmot Permanent Token Exchange',
    description: 'Authenticates MARMOT terminal using App ID (Client ID) and Client Secret, returning a permanent Dhan sandbox access token for subsequent API calls.',
    requestBody: {
      client_id: '1000000001',
      client_secret: 'sec_anvil_live_sandbox_secret',
    },
    responseExample: {
      status: 'success',
      dhanClientId: '1000000001',
      accessToken: 'dhn_sec_sandbox_demo_token_2026',
      tokenType: 'Bearer',
      expiresIn: 315360000,
      killSwitchActive: false,
      message: 'Permanent sandbox token verified successfully',
    },
  },
  {
    id: 'post-killswitch',
    method: 'POST',
    path: '/v2/killswitch',
    category: 'Risk Management',
    title: 'Dhan Kill Switch (Emergency Cancel & Square Off)',
    description: 'Immediately cancels all pending orders, executes market square-offs for all open derivative positions, locks the account against new incoming orders, and fires Dhan postbacks.',
    requestBody: {
      killSwitchStatus: 'ACTIVATE',
    },
    responseExample: {
      status: 'success',
      dhanClientId: '1000000001',
      killSwitchStatus: 'ACTIVATED',
      killSwitchActive: true,
      cancelledOrdersCount: 2,
      squaredPositionsCount: 1,
      message: 'Kill switch activated. 2 pending orders cancelled, 1 open positions squared off. Trading locked.',
    },
  },
  {
    id: 'get-killswitch',
    method: 'GET',
    path: '/v2/killswitch',
    category: 'Risk Management',
    title: 'Query Kill Switch Status',
    description: 'Queries whether the Kill Switch is currently ACTIVATED or DEACTIVATED for the client account.',
    requestBody: null,
    responseExample: {
      dhanClientId: '1000000001',
      killSwitchStatus: 'ACTIVATED',
      killSwitchActive: true,
    },
  },
  {
    id: 'post-order',
    method: 'POST',
    path: '/v2/orders',
    category: 'Orders',
    title: 'Place New Order',
    description: 'Places a new simulated order. MARKET orders fill immediately, LIMIT/SL remain PENDING until tick price crosses.',
    requestBody: {
      dhanClientId: '1000000001',
      correlationId: 'quant_bot_leg1',
      transactionType: 'BUY',
      exchangeSegment: 'NSE_FNO',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      validity: 'DAY',
      securityId: '49081',
      tradingSymbol: 'NIFTY26OCT25200CE',
      quantity: 25,
      price: 0,
      triggerPrice: 0,
      boProfitValue: 0,
      boStopLossValue: 0,
    },
    responseExample: {
      orderId: 'DHN17893015880001',
      orderStatus: 'TRADED',
      orderTimestamp: '2026-10-12 16:30:00',
    },
  },
  {
    id: 'get-orders',
    method: 'GET',
    path: '/v2/orders',
    category: 'Orders',
    title: 'Retrieve Order Book',
    description: 'Fetches all orders placed by the authenticated client for the current trading day.',
    requestBody: null,
    responseExample: [
      {
        dhanClientId: '1000000001',
        orderId: 'DHN17893015880001',
        orderStatus: 'TRADED',
        transactionType: 'BUY',
        tradingSymbol: 'NIFTY26OCT25200CE',
        quantity: 25,
        price: 0.0,
        averagePrice: 145.5,
      },
    ],
  },
  {
    id: 'get-positions',
    method: 'GET',
    path: '/v2/positions',
    category: 'Portfolio',
    title: 'Get Open & Closed Positions',
    description: 'Retrieves all open and closed derivative positions with real-time unrealized MTM valuation computed against live Fyers ticks.',
    requestBody: null,
    responseExample: [
      {
        dhanClientId: '1000000001',
        tradingSymbol: 'NIFTY26OCT25200CE',
        positionType: 'LONG',
        buyAvg: 145.5,
        buyQty: 25,
        netQty: 25,
        realizedProfit: 0.0,
        unrealizedProfit: 215.0,
      },
    ],
  },
  {
    id: 'get-fundlimit',
    method: 'GET',
    path: '/v2/fundlimit',
    category: 'Funds',
    title: 'Get Account Funds & Margins',
    description: 'Fetches real-time virtual account ledger metrics, Start of Day limits, and utilized margins.',
    requestBody: null,
    responseExample: {
      dhanClientId: '1000000001',
      availabelBalance: 496362.5,
      sodLimit: 500000.0,
      collateralAmount: 0.0,
      utilizedAmount: 3637.5,
      withdrawableBalance: 496362.5,
    },
  },
  {
    id: 'get-optionchain',
    method: 'GET',
    path: '/v2/optionchain?index=NIFTY50',
    category: 'Marketfeed',
    title: 'Get Live Option Chain',
    description: 'Returns real-time option chain matrix with strike steps, lot sizes, CE/PE LTP, OI, and IV for 5 supported Indian indices.',
    requestBody: null,
    responseExample: {
      index_name: 'NIFTY 50',
      spot_price: 25214.5,
      atm_strike: 25200,
      lot_size: 25,
      strikes: 'Array(21)',
    },
  },
  {
    id: 'postback-webhook',
    method: 'POST',
    path: '/api/accounts/test-postback/',
    category: 'Webhooks',
    title: 'Dhan v2 Execution Postback Webhook',
    description: 'ANVIL dispatches this exact Dhan v2 webhook payload to your MARMOT webhook endpoint on every order execution state change.',
    requestBody: null,
    responseExample: {
      dhanClientId: '1000000001',
      orderId: 'DHN17918686965659771',
      correlationId: 'quant_bot_leg1',
      orderStatus: 'TRADED',
      transactionType: 'BUY',
      exchangeSegment: 'NSE_FNO',
      productType: 'INTRADAY',
      orderType: 'MARKET',
      validity: 'DAY',
      tradingSymbol: 'NIFTY26OCT25200CE',
      securityId: '49081',
      quantity: 25,
      price: 145.5,
      averagePrice: 145.5,
      filledQty: 25,
      exchangeOrderId: 'EXDHN17918686965659771',
      createTime: '2026-10-13 10:45:00',
      updateTime: '2026-10-13 10:45:00',
      eventType: 'ORDER_TRADED',
    },
  },
];

export default function ApiDocsPage({ user, addToast }) {
  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [selectedLang, setSelectedLang] = useState('python'); // python | curl | go | js
  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';
  const token = user?.access_token || localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_demo_token_2026';

  const brokerUrl = window.location.origin;
  const clientSecret = user?.client_secret || 'sec_anvil_live_sandbox_secret';

  const generateSnippet = (ep) => {
    if (ep.id === 'post-token') {
      if (selectedLang === 'python') {
        return `import requests

# Exchange App ID (Client ID) & Client Secret for Permanent Token
res = requests.post(
    "${brokerUrl}/v2/token",
    json={
        "client_id": "${clientId}",
        "client_secret": "${clientSecret}"
    }
)
data = res.json()
print("Permanent Token:", data["accessToken"])
# Save data["accessToken"] to authenticate all subsequent Dhan API calls!`;
      }
      if (selectedLang === 'curl') {
        return `curl -X POST "${brokerUrl}/v2/token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "${clientId}",
    "client_secret": "${clientSecret}"
  }'`;
      }
      if (selectedLang === 'go') {
        return `// Exchange credentials in Go
payload := map[string]string{
    "client_id": "${clientId}",
    "client_secret": "${clientSecret}",
}
body, _ := json.Marshal(payload)
resp, err := http.Post("${brokerUrl}/v2/token", "application/json", bytes.NewBuffer(body))`;
      }
      return `fetch("${brokerUrl}/v2/token", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_id: "${clientId}",
    client_secret: "${clientSecret}"
  })
}).then(r => r.json()).then(data => console.log("Permanent Token:", data.accessToken));`;
    }

    if (ep.id === 'post-killswitch' || ep.id === 'get-killswitch') {
      if (selectedLang === 'python') {
        return `import requests

# 🚨 Dhan Kill Switch: Emergency Cancel & Square-Off
res = requests.${ep.method.toLowerCase()}(
    "${brokerUrl}${ep.path}",
    headers={
        "client-id": "${clientId}",
        "access-token": "${token}",
        "Content-Type": "application/json"
    }${ep.requestBody ? `,\n    json=${JSON.stringify(ep.requestBody, null, 4)}` : ''}
)
print("Kill Switch Status:", res.json())`;
      }
      if (selectedLang === 'curl') {
        return `curl -X ${ep.method} "${brokerUrl}${ep.path}" \\
  -H "client-id: ${clientId}" \\
  -H "access-token: ${token}" \\
  -H "Content-Type: application/json"${ep.requestBody ? ` \\
  -d '${JSON.stringify(ep.requestBody, null, 2)}'` : ''}`;
      }
      if (selectedLang === 'go') {
        return `req, _ := http.NewRequest("${ep.method}", "${brokerUrl}${ep.path}", nil)
req.Header.Set("client-id", "${clientId}")
req.Header.Set("access-token", "${token}")
resp, err := http.DefaultClient.Do(req)`;
      }
      return `fetch("${brokerUrl}${ep.path}", {
  method: "${ep.method}",
  headers: {
    "client-id": "${clientId}",
    "access-token": "${token}",
    "Content-Type": "application/json"
  }${ep.requestBody ? `,\n  body: JSON.stringify(${JSON.stringify(ep.requestBody, null, 2)})` : ''}
}).then(r => r.json()).then(console.log);`;
    }

    if (selectedLang === 'python') {
      return `from dhanhq import dhanhq

dhan = dhanhq(client_id="${clientId}", access_token="${token}")
dhan.base_url = "${brokerUrl}"

# ${ep.title}
${ep.method === 'POST' ? `res = dhan.place_order(
    security_id="${ep.requestBody?.securityId || '49081'}",
    exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.${ep.requestBody?.transactionType || 'BUY'},
    quantity=${ep.requestBody?.quantity || 25},
    order_type=dhan.MARKET,
    product_type=dhan.INTRADAY,
    price=0
)` : `res = dhan.get_${ep.category.toLowerCase()}()`}
print(res)`;
    }

    if (selectedLang === 'curl') {
      return `curl -X ${ep.method} "${brokerUrl}${ep.path}" \\
  -H "client-id: ${clientId}" \\
  -H "access-token: ${token}" \\
  -H "Content-Type: application/json"${ep.requestBody ? ` \\
  -d '${JSON.stringify(ep.requestBody, null, 2)}'` : ''}`;
    }

    if (selectedLang === 'go') {
      return `// Target ANVIL Gateway directly
req, _ := http.NewRequest("${ep.method}", "${brokerUrl}${ep.path}", nil)
req.Header.Set("client-id", "${clientId}")
req.Header.Set("access-token", "${token}")
resp, err := http.DefaultClient.Do(req)`;
    }

    return `fetch("${brokerUrl}${ep.path}", {
  method: "${ep.method}",
  headers: {
    "client-id": "${clientId}",
    "access-token": "${token}",
    "Content-Type": "application/json"
  }${ep.requestBody ? `,\n  body: JSON.stringify(${JSON.stringify(ep.requestBody, null, 2)})` : ''}
}).then(r => r.json()).then(console.log);`;
  };

  const handleTestEndpoint = async () => {
    setTesting(true);
    setTestResponse(null);
    try {
      let res;
      if (selectedEndpoint.id === 'post-token') {
        res = await api.dhan.getToken(clientId, clientSecret);
      } else if (selectedEndpoint.id === 'post-killswitch') {
        res = await api.dhan.activateKillSwitch();
      } else if (selectedEndpoint.id === 'get-killswitch') {
        res = await api.dhan.getKillSwitch();
      } else if (selectedEndpoint.id === 'postback-webhook') {
        res = await api.account.testPostback();
      } else if (selectedEndpoint.id === 'post-order') {
        res = await api.dhan.placeOrder(selectedEndpoint.requestBody);
      } else if (selectedEndpoint.id === 'get-orders') {
        res = await api.dhan.getOrders();
      } else if (selectedEndpoint.id === 'get-positions') {
        res = await api.dhan.getPositions();
      } else if (selectedEndpoint.id === 'get-fundlimit') {
        res = await api.dhan.getFundLimit();
      } else if (selectedEndpoint.id === 'get-optionchain') {
        res = await api.dhan.getOptionChain('NIFTY50');
      }
      setTestResponse(res);
      addToast('success', 'Endpoint responded successfully!');
    } catch (err) {
      setTestResponse({ error: err.message });
      addToast('error', err.message || 'Execution failed.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="api-docs-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '30px 24px 80px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '2.2rem', color: '#ffffff' }}>DhanHQ API v2 Interactive Reference</h1>
            <span className="badge-bull">OFFICIAL WIRE CONTRACT</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Reference documentation and live sandbox playground matching <a href="https://dhanhq.co/docs/v2/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>https://dhanhq.co/docs/v2/</a>
          </p>
        </div>
        <a
          href="https://dhanhq.co/docs/v2/"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
          style={{ padding: '10px 16px', fontSize: '0.88rem' }}
        >
          <ExternalLink size={16} /> Official DhanHQ Docs
        </a>
      </div>

      {/* Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left Endpoints List */}
        <div className="glass-panel" style={{ padding: '16px', height: 'fit-content' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, padding: '8px 12px', letterSpacing: '0.04em' }}>
            DHAN v2 ENDPOINTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ENDPOINTS.map((ep) => (
              <button
                key={ep.id}
                id={`endpoint-btn-${ep.id}`}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setTestResponse(null);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedEndpoint.id === ep.id ? 'var(--accent-primary)' : 'transparent',
                  background: selectedEndpoint.id === ep.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: ep.method === 'POST' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                    color: ep.method === 'POST' ? '#a5b4fc' : '#6ee7b7',
                  }}
                >
                  {ep.method}
                </span>
                <span style={{ fontSize: '0.84rem', color: selectedEndpoint.id === ep.id ? '#ffffff' : 'var(--text-secondary)', fontWeight: 500 }}>
                  {ep.title}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div>
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
            {/* Endpoint Method & Path */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: selectedEndpoint.method === 'POST' ? 'var(--accent-primary)' : 'var(--bull-green)',
                  color: '#ffffff',
                }}
              >
                {selectedEndpoint.method}
              </span>
              <span style={{ fontSize: '1.25rem', fontFamily: 'var(--font-mono)', color: '#ffffff', fontWeight: 600 }}>
                {selectedEndpoint.path}
              </span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '24px' }}>
              {selectedEndpoint.description}
            </p>

            {/* Language Switcher Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['python', 'curl', 'go', 'javascript'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: selectedLang === lang ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      background: selectedLang === lang ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                      color: selectedLang === lang ? '#ffffff' : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(generateSnippet(selectedEndpoint));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  {copied ? <Check size={14} color="var(--bull-green)" /> : <Copy size={14} />} Copy
                </button>
                <button
                  id="test-run-endpoint-btn"
                  className="btn-primary"
                  onClick={handleTestEndpoint}
                  disabled={testing}
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                >
                  <Play size={14} /> {testing ? 'Calling...' : 'Run in Sandbox'}
                </button>
              </div>
            </div>

            {/* Code Snippet Box */}
            <div className="code-container" style={{ marginBottom: '24px' }}>
              <pre style={{ margin: 0 }}>{generateSnippet(selectedEndpoint)}</pre>
            </div>

            {/* Live Response Box if Tested */}
            {testResponse && (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--bull-green)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Terminal size={14} /> LIVE SANDBOX EXECUTION OUTPUT (HTTP 200)
                </div>
                <div className="code-container" style={{ background: '#020617', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <pre style={{ margin: 0, color: '#6ee7b7' }}>{JSON.stringify(testResponse, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
