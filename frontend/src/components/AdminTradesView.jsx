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
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff' }}>All Trades Ledger</h1>
            <span className="badge-emerald" style={{ fontSize: '0.7rem' }}>LIVE MATCHED FILLS</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Comprehensive trade executions and exchange fill timestamps across all simulated trader accounts.
          </p>
        </div>

        <button
          onClick={fetchTrades}
          disabled={loading}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Trades
        </button>
      </div>

      {/* Summary KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>TOTAL TRADES EXECUTED</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{trades.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--bull-green)', marginTop: '2px' }}>Instant virtual ledger settlement</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>BUY TURNOVER</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--bull-green)' }}>
            ₹{totalBuyVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Gross long premium filled</div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>SELL TURNOVER</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--bear-red)' }}>
            ₹{totalSellVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Gross short premium filled</div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="glass-panel-elevated" style={{ borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.02)' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter by symbol, client ID, or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Side Filter Pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['ALL', 'BUY', 'SELL'].map((side) => (
              <button
                key={side}
                onClick={() => setSideFilter(side)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: sideFilter === side ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.08)',
                  background: sideFilter === side ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                  color: sideFilter === side ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
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
