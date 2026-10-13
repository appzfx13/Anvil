import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminTradesView({ addToast }) {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sideFilter, setSideFilter] = useState('ALL'); // ALL | BUY | SELL
  const [copiedId, setCopiedId] = useState('');

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getTrades();
      if (res && res.trades) {
        setTrades(res.trades);
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to fetch trades ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('success', `Copied ${text}`);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const filteredTrades = trades.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = (
      t.trading_symbol.toLowerCase().includes(q) ||
      t.dhan_client_id.toLowerCase().includes(q) ||
      (t.trader_name && t.trader_name.toLowerCase().includes(q)) ||
      t.trade_id.toLowerCase().includes(q)
    );
    const matchesSide = sideFilter === 'ALL' || t.transaction_type === sideFilter;
    return matchesSearch && matchesSide;
  });

  const totalBuyVolume = trades.filter(t => t.transaction_type === 'BUY').reduce((acc, t) => acc + (t.traded_qty * t.traded_price), 0);
  const totalSellVolume = trades.filter(t => t.transaction_type === 'SELL').reduce((acc, t) => acc + (t.traded_qty * t.traded_price), 0);

  return (
    <div className="profile-page-shell">
      {/* Profile Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="profile-header-badge">
          <div className="profile-category-pill emerald">WORKSPACE</div>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Order Executions & Fill Ledger</span>
          <span className="pill-badge badge-emerald" style={{ fontSize: '0.66rem', marginLeft: 'auto' }}>
            ● LIVE MATCHED FILLS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="profile-page-title">
              All Trades Ledger
            </h1>
            <p className="profile-page-subtitle">
              Comprehensive trade executions and exchange fill timestamps across all simulated trader accounts.
            </p>
          </div>

          <button
            onClick={fetchTrades}
            disabled={loading}
            className="profile-btn-ghost"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Trades</span>
          </button>
        </div>
      </div>

      {/* Summary KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
            TOTAL TRADES EXECUTED
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {trades.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px' }}>
            Instant virtual ledger settlement
          </div>
        </div>

        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
            BUY TURNOVER
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
            ₹{totalBuyVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
            Gross long premium filled
          </div>
        </div>

        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>
            SELL TURNOVER
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
            ₹{totalSellVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
            Gross short premium filled
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '340px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter by symbol, client ID, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="profile-input"
              style={{ paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.82rem' }}
            />
          </div>

          {/* Side Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'BUY', 'SELL'].map((side) => (
              <button
                key={side}
                onClick={() => setSideFilter(side)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: sideFilter === side ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                  background: sideFilter === side ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: sideFilter === side ? '#ffffff' : '#94a3b8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {side}
              </button>
            ))}
          </div>
        </div>

        {/* Trades Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="trading-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>TRADE ID</th>
                <th>TRADER</th>
                <th>INSTRUMENT</th>
                <th>SIDE</th>
                <th style={{ textAlign: 'right' }}>QUANTITY</th>
                <th style={{ textAlign: 'right' }}>FILL PRICE</th>
                <th style={{ textAlign: 'right' }}>TOTAL VALUE</th>
                <th>EXECUTION TIME</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No trades match the current filter.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => (
                  <tr key={t.id}>
                    {/* Trade ID */}
                    <td>
                      <button
                        onClick={() => copyToClipboard(t.trade_id, t.id + '_tid')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                        }}
                        title="Click to copy Trade ID"
                      >
                        <span>{t.trade_id}</span>
                        {copiedId === t.id + '_tid' ? <Check size={12} color="var(--bull-green)" /> : <Copy size={12} />}
                      </button>
                    </td>

                    {/* Trader */}
                    <td>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>{t.trader_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        ID: {t.dhan_client_id}
                      </div>
                    </td>

                    {/* Instrument Symbol */}
                    <td>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.86rem' }}>{t.trading_symbol}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Sec ID: {t.security_id}</div>
                    </td>

                    {/* Side */}
                    <td>
                      <span
                        className={t.transaction_type === 'BUY' ? 'badge-bull' : 'badge-bear'}
                        style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}
                      >
                        {t.transaction_type}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ffffff' }}>
                      {t.traded_qty}
                    </td>

                    {/* Fill Price */}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                      ₹{Number(t.traded_price).toFixed(2)}
                    </td>

                    {/* Total Value */}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
                      ₹{Number(t.traded_qty * t.traded_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Execution Time */}
                    <td>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {new Date(t.exchange_time).toLocaleTimeString('en-IN')}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(t.exchange_time).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
