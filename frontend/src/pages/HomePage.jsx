import React from 'react';
import { ArrowRight, Terminal, BookOpen, Zap, Shield, Activity, Cpu, Server, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_INDICES } from '../services/constants';

export default function HomePage({ onNavigate }) {
  return (
    <div id="home-page-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '40px 24px 80px' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '60px 0 50px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '24px' }}>
          <Zap size={15} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.04em' }}>
            DHAN API v2 COMPATIBLE WIRE PROTOCOL &middot; REAL-TIME FYERS L1 FEED
          </span>
        </div>

        <h1 style={{ fontSize: '3.6rem', lineHeight: 1.15, fontWeight: 800, marginBottom: '20px' }}>
          Precision Indian Derivative <br />
          <span className="text-gradient">Execution Sandbox</span>
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '780px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          Run your algorithmic bots, quant strategies, and automated trade execution engines against real-time Indian F&O feeds with zero financial risk. Sub-50ms execution latency with instant virtual ledger settlement.
        </p>

        {/* Hero Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            id="hero-launch-terminal-btn"
            className="btn-primary"
            onClick={() => onNavigate('dashboard')}
            style={{ padding: '14px 28px', fontSize: '1.05rem' }}
          >
            <Terminal size={18} /> Launch Trading Terminal <ArrowRight size={16} />
          </button>
          <button
            id="hero-view-docs-btn"
            className="btn-secondary"
            onClick={() => onNavigate('docs')}
            style={{ padding: '14px 24px', fontSize: '1.05rem' }}
          >
            <BookOpen size={18} /> Dhan API v2 Reference
          </button>
        </div>
      </section>

      {/* 5 Supported Indices Grid */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#ffffff' }}>5 Benchmark Indian Indices Supported</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time strike intervals, official lot sizes, and Fyers symbol resolution
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {SUPPORTED_INDICES.map((idx) => (
            <div key={idx.key} className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>{idx.name}</span>
                <span className="badge-bull" style={{ fontSize: '0.7rem' }}>{idx.exchange}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>
                {idx.fyersSymbol}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lot Size: <strong style={{ color: '#fff' }}>{idx.lotSize}</strong></span>
                <span style={{ color: 'var(--text-secondary)' }}>Strike Step: <strong style={{ color: '#fff' }}>{idx.strikeInterval}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section style={{ marginBottom: '60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Activity size={22} color="var(--bull-green)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#ffffff' }}>Live FYERS API v3 Feeds</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Streams ticks, quotes, and full option chains directly from Fyers Level-1 market data sockets into Redis for sub-millisecond strategy ingestion.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Server size={22} color="var(--accent-primary)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#ffffff' }}>100% Dhan v2 Wire Contract</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Orders, Positions, Trades, Fund Limits, and Marketfeed WebSockets strictly match DhanHQ API v2 specs. Simply switch the base URL in your algorithm.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '28px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Cpu size={22} color="var(--accent-cyan)" />
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#ffffff' }}>Go High-Speed Matching Engine</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Engineered in Go for high-frequency concurrency, bracket order execution, auto SL/TP square-offs, and simulated exchange round-trip latency.
            </p>
          </div>
        </div>
      </section>

      {/* Drop-in Python DhanHQ Code Preview */}
      <section className="glass-panel-elevated" style={{ padding: '36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
              <CheckCircle2 size={16} /> ZERO CODE REWRITE REQUIRED
            </div>
            <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: '#ffffff' }}>
              Connect Any Dhan Strategy in 2 Lines
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px' }}>
              Using the official Python <code>dhanhq</code> library? Just set your client ID, access token, and repoint the <code>base_url</code> to ANVIL. All orders, bracket orders, and positions work out of the box.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={() => onNavigate('dashboard')} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                Try It Now
              </button>
              <button className="btn-secondary" onClick={() => onNavigate('docs')} style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
                View Postman & Endpoints
              </button>
            </div>
          </div>

          <div className="code-container">
            <div style={{ color: '#94a3b8', marginBottom: '8px', fontSize: '0.78rem' }}># algo_trading_strategy.py</div>
            <pre style={{ margin: 0, lineHeight: 1.6 }}>
{`from dhanhq import dhanhq

# 1. Connect to ANVIL Sandbox
dhan = dhanhq(
    client_id="1000000001",
    access_token="dhn_sec_sandbox_token",
)
dhan.base_url = "http://localhost:8088"

# 2. Place Intraday NIFTY Market Order
order = dhan.place_order(
    security_id="49081",
    exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.BUY,
    quantity=25,
    order_type=dhan.MARKET,
    product_type=dhan.INTRADAY,
    price=0,
    tag="algo_anvil_test"
)

print("Execution Fill:", order)`}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
