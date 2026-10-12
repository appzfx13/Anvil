import React, { useState, useEffect } from 'react';
import { X, RefreshCw, TrendingUp, Layers } from 'lucide-react';
import { SUPPORTED_INDICES } from '../services/constants';
import { api } from '../services/api';

export default function OptionChainModal({
  isOpen,
  onClose,
  onSelectContract,
}) {
  const [selectedIndex, setSelectedIndex] = useState('NIFTY50');
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchChain = async (idxKey) => {
    setLoading(true);
    try {
      const data = await api.dhan.getOptionChain(idxKey);
      setChainData(data);
    } catch (err) {
      console.error('Failed to load option chain:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChain(selectedIndex);
    }
  }, [isOpen, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div id="option-chain-modal-overlay" className="modal-overlay" onClick={onClose}>
      <div
        id="option-chain-box"
        className="modal-box"
        style={{ maxWidth: '1080px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Layers size={22} color="var(--accent-primary)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>Live Indian Option Chain</h3>
                <span className="badge-bull" style={{ fontSize: '0.72rem' }}>FYERS FEED</span>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Real-time Call/Put matrix with Greeks & 1-click execution
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="refresh-chain-btn"
              onClick={() => fetchChain(selectedIndex)}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <button
              id="close-chain-btn"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Index Selector Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(5, 7, 13, 0.5)',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {SUPPORTED_INDICES.map((idx) => (
              <button
                key={idx.key}
                id={`oc-tab-${idx.key.toLowerCase()}`}
                onClick={() => setSelectedIndex(idx.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedIndex === idx.key ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  background: selectedIndex === idx.key ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
                  color: selectedIndex === idx.key ? '#ffffff' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {idx.name}
              </button>
            ))}
          </div>

          {chainData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Spot: </span>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  ₹{Number(chainData.spot_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="badge-neutral" style={{ padding: '2px 8px' }}>
                Lot: {chainData.lot_size} | Step: {chainData.strike_step}
              </div>
            </div>
          )}
        </div>

        {/* Option Chain Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          <table className="trading-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th colSpan="4" style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', color: 'var(--bull-green)' }}>
                  CALLS (CE)
                </th>
                <th style={{ textAlign: 'center', background: 'rgba(99, 102, 241, 0.15)', color: '#ffffff' }}>
                  STRIKE
                </th>
                <th colSpan="4" style={{ textAlign: 'center', background: 'rgba(244, 63, 94, 0.08)', color: 'var(--bear-red)' }}>
                  PUTS (PE)
                </th>
              </tr>
              <tr>
                <th>OI</th>
                <th>Vol</th>
                <th>IV %</th>
                <th style={{ textAlign: 'right' }}>CE LTP</th>
                <th style={{ textAlign: 'center' }}>Strike Price</th>
                <th>PE LTP</th>
                <th>IV %</th>
                <th>Vol</th>
                <th style={{ textAlign: 'right' }}>OI</th>
              </tr>
            </thead>
            <tbody>
              {chainData?.strikes?.map((row) => (
                <tr
                  key={row.strike_price}
                  style={{
                    background: row.is_atm ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    borderLeft: row.is_atm ? '3px solid var(--accent-primary)' : 'none',
                  }}
                >
                  {/* Call Columns */}
                  <td style={{ color: 'var(--text-muted)' }}>{row.call.oi?.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.call.volume?.toLocaleString('en-IN')}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.call.iv}%</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      id={`buy-ce-${row.strike_price}`}
                      onClick={() => onSelectContract({
                        indexKey: chainData.index_symbol,
                        symbol: row.call.trading_symbol,
                        strike: row.strike_price,
                        side: 'BUY',
                        price: row.call.ltp,
                      })}
                      className="btn-bull"
                      style={{ padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                      title="Click to place Buy Call order"
                    >
                      ₹{row.call.ltp}
                    </button>
                  </td>

                  {/* Strike Price Center Column */}
                  <td style={{ textAlign: 'center', fontWeight: row.is_atm ? 800 : 600, color: row.is_atm ? '#ffffff' : 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>{row.strike_price}</span>
                      {row.is_atm && (
                        <span className="badge-bull" style={{ fontSize: '0.65rem', padding: '1px 4px' }}>
                          ATM
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Put Columns */}
                  <td>
                    <button
                      id={`buy-pe-${row.strike_price}`}
                      onClick={() => onSelectContract({
                        indexKey: chainData.index_symbol,
                        symbol: row.put.trading_symbol,
                        strike: row.strike_price,
                        side: 'BUY',
                        price: row.put.ltp,
                      })}
                      className="btn-bear"
                      style={{ padding: '3px 8px', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                      title="Click to place Buy Put order"
                    >
                      ₹{row.put.ltp}
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.put.iv}%</td>
                  <td style={{ color: 'var(--text-muted)' }}>{row.put.volume?.toLocaleString('en-IN')}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{row.put.oi?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
