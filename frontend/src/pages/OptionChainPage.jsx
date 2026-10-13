import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  PlusCircle,
  Sliders,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Radio
} from 'lucide-react';
import { api } from '../services/api';
import { SUPPORTED_INDICES } from '../services/constants';
import OrderModal from '../components/OrderModal';

export default function OptionChainPage({
  user,
  account,
  ticks = {},
  optionChainWsData = {},
  addToast,
  onRefreshAccount,
}) {
  const [selectedIndex, setSelectedIndex] = useState('NIFTY50');
  const [chainData, setChainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [lastWsUpdate, setLastWsUpdate] = useState(null);
  const [prevPrices, setPrevPrices] = useState({});

  // OrderModal state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderModalParams, setOrderModalParams] = useState({
    index: 'NIFTY50',
    symbol: '',
    strike: null,
    side: 'BUY',
  });

  // 1. Direct WebSocket Listener for live option chain and high-frequency ticks
  useEffect(() => {
    let ws = null;
    let isMounted = true;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/v2/marketfeed/ws`;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Check for Option Chain payload (either typed or direct Fyers option chain packet)
          if (data && (data.type === 'OPTION_CHAIN' || data.strikes)) {
            const incomingSymbol = data.index || data.index_symbol;
            if (!incomingSymbol || incomingSymbol === selectedIndex) {
              if (isMounted) {
                setChainData(data);
                setLoading(false);
                setLastWsUpdate(Date.now());
              }
            }
          }
        } catch (e) {}
      };
    } catch (err) {
      console.warn('Dedicated WS connection in OptionChainPage failed:', err);
    }

    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [selectedIndex]);

  // 2. Sync with parent WebSocket stream (optionChainWsData prop)
  useEffect(() => {
    if (optionChainWsData && optionChainWsData[selectedIndex]) {
      setChainData(optionChainWsData[selectedIndex]);
      setLoading(false);
      setLastWsUpdate(Date.now());
    }
  }, [optionChainWsData, selectedIndex]);

  // 3. Robust REST Fetch with Silent Polling Fallback
  const fetchChain = async (idxKey, isSilent = false) => {
    if (!isSilent && !chainData) {
      setLoading(true);
    }
    try {
      const data = await api.dhan.getOptionChain(idxKey);
      if (data && data.strikes && data.strikes.length > 0) {
        setChainData(data);
        setLastWsUpdate(Date.now());
      }
    } catch (err) {
      console.error('Failed to load option chain:', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchChain(selectedIndex, false);
    const interval = setInterval(() => {
      // Silent polling every 2.5s so table never freezes or flashes loading spinners
      fetchChain(selectedIndex, true);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedIndex]);

  // 4. Auto-populate dynamic expiry date from Fyers live metadata
  useEffect(() => {
    if (chainData?.expiry_data && chainData.expiry_data.length > 0) {
      const hasSelected = chainData.expiry_data.some((e) => e.date === selectedExpiry);
      if (!hasSelected || !selectedExpiry) {
        setSelectedExpiry(chainData.expiry_data[0].date);
      }
    }
  }, [chainData]);

  // Handle Order Placement
  const handlePlaceOrder = async (orderPayload) => {
    try {
      const res = await api.dhan.placeOrder(orderPayload);
      setIsOrderModalOpen(false);
      addToast('success', `Order placed: #${res.orderId} [${res.orderStatus}]`);
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Order failed.');
    }
  };

  // 5. Dynamic Spot Price & ATM Strike Calculation
  // Priority: live WebSocket tick LTP > chainData.spot_price > fallback
  const currentTick = ticks[selectedIndex];
  const spotPrice = currentTick?.ltp || chainData?.spot_price || 22500.0;
  const spotCh = currentTick?.ch !== undefined ? currentTick.ch : (chainData?.ch || 0);
  const spotChp = currentTick?.chp !== undefined ? currentTick.chp : (chainData?.chp || 0);

  const strikes = chainData?.strikes || [];

  // Dynamically find closest strike to live spotPrice
  const atmStrike = strikes.length > 0
    ? strikes.reduce((prev, curr) =>
        Math.abs(curr.strike_price - spotPrice) < Math.abs(prev.strike_price - spotPrice) ? curr : prev
      ).strike_price
    : (chainData?.atm_strike || 22500);

  // Summary Metrics
  const totalCallOi = strikes.reduce((acc, s) => acc + (s.call?.oi || 0), 0);
  const totalPutOi = strikes.reduce((acc, s) => acc + (s.put?.oi || 0), 0);
  const pcr = totalCallOi > 0 ? (totalPutOi / totalCallOi).toFixed(2) : '1.00';

  return (
    <div id="option-chain-full-page" className="optionchain-container-responsive" style={{ color: '#f8fafc' }}>
      
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Option Chain Matrix
            </h1>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.66rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={10} className="spin" style={{ animationDuration: '3s' }} />
              ● LIVE STREAMING
            </span>
            <span className="pill-badge badge-purple" style={{ fontSize: '0.66rem' }}>
              {strikes.length > 0 ? `${strikes.length} STRIKES ACTIVE` : 'CONNECTING FEED...'}
            </span>
            {lastWsUpdate && (
              <span style={{ fontSize: '0.68rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                ⚡ Ticks active
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Real-time Fyers API v3 derivatives grid with live open interest, dynamic ATM strike detection, and 1-click execution.
          </p>
        </div>

        {/* Index Tabs & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Index Buttons */}
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {SUPPORTED_INDICES.map((idx) => (
              <button
                key={idx.key}
                onClick={() => {
                  setSelectedIndex(idx.key);
                  setChainData(null);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: selectedIndex === idx.key ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  color: selectedIndex === idx.key ? '#06b6d4' : '#94a3b8',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{idx.name}</span>
                {selectedIndex === idx.key && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4' }} />
                )}
              </button>
            ))}
          </div>

          {/* Expiry Selector (Dynamically populated from Fyers expiry_data) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '6px 12px' }}>
            <Calendar size={14} color="#94a3b8" />
            <select
              value={selectedExpiry}
              onChange={(e) => setSelectedExpiry(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {chainData?.expiry_data && chainData.expiry_data.length > 0 ? (
                chainData.expiry_data.map((exp, idx) => (
                  <option key={exp.expiry || idx} value={exp.date} style={{ background: '#0b0e15' }}>
                    {exp.date} ({exp.expiry_flag === 'W' ? 'Weekly' : 'Monthly'})
                  </option>
                ))
              ) : (
                <option value={selectedExpiry || 'CURRENT'} style={{ background: '#0b0e15' }}>
                  {selectedExpiry || 'Current Expiry'}
                </option>
              )}
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchChain(selectedIndex, false)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Spot & Market Metrics Ribbon */}
      <div
        className="glass-panel"
        style={{
          padding: '14px 20px',
          background: 'rgba(11, 14, 21, 0.95)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          borderLeft: '4px solid #06b6d4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>UNDERLYING INDEX:</span>
          <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            ₹{Number(spotPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: spotCh >= 0 ? '#10b981' : '#f43f5e' }}>
            {spotCh >= 0 ? '+' : ''}{Number(spotCh || 0).toFixed(2)} ({spotChp >= 0 ? '+' : ''}{Number(spotChp || 0).toFixed(2)}%)
          </span>
          <span className="pill-badge" style={{ background: '#eab308', color: '#000000', fontWeight: 800, fontSize: '0.72rem' }}>
            ATM STRIKE: {atmStrike}
          </span>
          {chainData?.indiavix_data && chainData.indiavix_data.ltp > 0 && (
            <span className="pill-badge badge-blue" style={{ fontSize: '0.72rem' }}>
              INDIA VIX: {chainData.indiavix_data.ltp} ({chainData.indiavix_data.ltpch >= 0 ? '+' : ''}{chainData.indiavix_data.ltpch}%)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>
            PCR: <strong style={{ color: Number(pcr) >= 1 ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>{pcr}</strong>
          </div>
          <div>
            Total Call OI: <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{totalCallOi.toLocaleString('en-IN')}</strong>
          </div>
          <div>
            Total Put OI: <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{totalPutOi.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      {/* Full Multi-Strike Dual Matrix Table */}
      <div className="glass-panel-elevated" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="trading-table" style={{ width: '100%', fontSize: '0.78rem' }}>
            <thead>
              {/* Category Header */}
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <th colSpan="3" style={{ textAlign: 'center', color: '#10b981', borderRight: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px' }}>
                  CALLS (CE) • BULLISH FLOW
                </th>
                <th style={{ textAlign: 'center', color: '#ffffff', background: 'rgba(255, 255, 255, 0.04)', padding: '10px' }}>
                  STRIKE PRICE
                </th>
                <th colSpan="3" style={{ textAlign: 'center', color: '#f43f5e', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', padding: '10px' }}>
                  PUTS (PE) • BEARISH FLOW
                </th>
              </tr>
              {/* Columns Header */}
              <tr style={{ fontSize: '0.7rem' }}>
                <th style={{ width: '18%' }}>OI (CONTRACTS)</th>
                <th style={{ width: '12%', textAlign: 'right' }}>CHG (PTS)</th>
                <th style={{ width: '18%', textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>LTP & ACTION</th>
                <th style={{ width: '8%', textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)' }}>STRIKE</th>
                <th style={{ width: '18%', textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>ACTION & LTP</th>
                <th style={{ width: '12%', textAlign: 'left' }}>CHG (PTS)</th>
                <th style={{ width: '18%', textAlign: 'right' }}>OI (CONTRACTS)</th>
              </tr>
            </thead>
            <tbody>
              {strikes.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#64748b' }}>
                    <RefreshCw size={20} className="spin" style={{ margin: '0 auto 10px' }} />
                    Loading real-time Fyers option chain matrix...
                  </td>
                </tr>
              ) : (
                strikes.map((row) => {
                  const isAtm = row.strike_price === atmStrike;
                  const isItmCall = row.strike_price < spotPrice;
                  const isItmPut = row.strike_price > spotPrice;
                  const call = row.call || {};
                  const put = row.put || {};

                  return (
                    <tr
                      key={row.strike_price}
                      style={{
                        background: isAtm
                          ? 'rgba(234, 179, 8, 0.12)'
                          : isItmCall
                          ? 'rgba(16, 185, 129, 0.03)'
                          : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* Call OI */}
                      <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {call.oi ? call.oi.toLocaleString('en-IN') : '—'}
                      </td>

                      {/* Call Change */}
                      <td style={{ textAlign: 'right', color: call.ch >= 0 ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                        {call.ch >= 0 ? '+' : ''}{Number(call.ch || 0).toFixed(2)}
                      </td>

                      {/* Call LTP & Action Buttons */}
                      <td style={{ textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                            ₹{Number(call.ltp || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() => {
                              setOrderModalParams({
                                index: selectedIndex,
                                symbol: call.trading_symbol,
                                strike: row.strike_price,
                                side: 'BUY',
                              });
                              setIsOrderModalOpen(true);
                            }}
                            style={{
                              background: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              color: '#10b981',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            BUY
                          </button>
                        </div>
                      </td>

                      {/* STRIKE PRICE CENTER */}
                      <td
                        style={{
                          textAlign: 'center',
                          fontWeight: 800,
                          color: isAtm ? '#eab308' : '#ffffff',
                          background: isAtm ? 'rgba(234, 179, 8, 0.22)' : 'rgba(255, 255, 255, 0.03)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.86rem',
                          borderLeft: isAtm ? '2px solid #eab308' : 'none',
                          borderRight: isAtm ? '2px solid #eab308' : 'none',
                        }}
                      >
                        {row.strike_price}
                        {isAtm && (
                          <span style={{ display: 'block', fontSize: '0.6rem', color: '#eab308', fontWeight: 900 }}>
                            ● ATM
                          </span>
                        )}
                      </td>

                      {/* Put Action Buttons & LTP */}
                      <td style={{ textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setOrderModalParams({
                                index: selectedIndex,
                                symbol: put.trading_symbol,
                                strike: row.strike_price,
                                side: 'BUY',
                              });
                              setIsOrderModalOpen(true);
                            }}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              color: '#f43f5e',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            BUY
                          </button>
                          <span style={{ fontWeight: 800, color: '#f43f5e', fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}>
                            ₹{Number(put.ltp || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Put Change */}
                      <td style={{ textAlign: 'left', color: put.ch >= 0 ? '#10b981' : '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                        {put.ch >= 0 ? '+' : ''}{Number(put.ch || 0).toFixed(2)}
                      </td>

                      {/* Put OI */}
                      <td style={{ textAlign: 'right', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        {put.oi ? put.oi.toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Execution Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={handlePlaceOrder}
        defaultIndex={orderModalParams.index}
        defaultSymbol={orderModalParams.symbol}
        defaultStrike={orderModalParams.strike}
        defaultSide={orderModalParams.side}
        availableBalance={account?.available_balance || 500000}
      />
    </div>
  );
}
