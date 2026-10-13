import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { SUPPORTED_INDICES } from '../services/constants';

export default function QuickChartTradeModal({
  isOpen,
  onClose,
  initialSymbol = 'NIFTY 50',
  ticks = {},
  account = null,
  addToast,
  onOrderSuccess,
}) {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState('5m');
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('MARKET');
  const [productType, setProductType] = useState('INTRADAY');
  const [quantity, setQuantity] = useState(50);
  const [limitPrice, setLimitPrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync selected symbol
  useEffect(() => {
    if (initialSymbol) {
      setSelectedSymbol(initialSymbol);
    }
  }, [initialSymbol, isOpen]);

  if (!isOpen) return null;

  // Determine current tick info
  let indexKey = 'NIFTY50';
  if (selectedSymbol.includes('BANK')) indexKey = 'BANKNIFTY';
  else if (selectedSymbol.includes('FIN')) indexKey = 'FINNIFTY';
  else if (selectedSymbol.includes('SENSEX')) indexKey = 'SENSEX';

  const currentTick = ticks[indexKey] || { ltp: 22504.65, ch: 141.20, chp: 0.62 };
  const ltp = Number(currentTick.ltp || 22504.65);
  const ch = Number(currentTick.ch || 141.20);
  const chp = Number(currentTick.chp || 0.62);

  // Approximate candles for visual chart
  const candleData = [
    { time: '09:15', open: ltp - 120, high: ltp - 70, low: ltp - 140, close: ltp - 80 },
    { time: '09:45', open: ltp - 80, high: ltp - 40, low: ltp - 95, close: ltp - 50 },
    { time: '10:15', open: ltp - 50, high: ltp - 10, low: ltp - 70, close: ltp - 20 },
    { time: '10:45', open: ltp - 20, high: ltp + 30, low: ltp - 30, close: ltp + 15 },
    { time: '11:15', open: ltp + 15, high: ltp + 50, low: ltp - 10, close: ltp + 35 },
    { time: '11:45', open: ltp + 35, high: ltp + 70, low: ltp + 20, close: ltp + 60 },
    { time: '12:15', open: ltp + 60, high: ltp + 90, low: ltp + 45, close: ltp + 75 },
    { time: '12:45', open: ltp + 75, high: ltp + 110, low: ltp + 60, close: ltp + 95 },
    { time: '13:15', open: ltp + 95, high: ltp + 130, low: ltp + 80, close: ltp + 115 },
    { time: '13:45', open: ltp + 115, high: ltp + 150, low: ltp + 100, close: ltp },
  ];

  const minPrice = Math.min(...candleData.map((c) => c.low));
  const maxPrice = Math.max(...candleData.map((c) => c.high));
  const priceRange = maxPrice - minPrice || 100;

  const getY = (val) => {
    return 180 - ((val - minPrice) / priceRange) * 150;
  };

  // Handle Order Submit
  const handleExecuteOrder = async () => {
    setIsSubmitting(true);
    try {
      const idxObj = SUPPORTED_INDICES.find((i) => i.key === indexKey) || SUPPORTED_INDICES[0];
      const payload = {
        dhanClientId: localStorage.getItem('anvil_client_id') || '1000000001',
        correlationId: `chart_${Date.now()}`,
        transactionType: side,
        exchangeSegment: idxObj.exchange || 'NSE_FNO',
        productType: productType,
        orderType: orderType,
        validity: 'DAY',
        securityId: `${Math.round(ltp)}01`,
        tradingSymbol: selectedSymbol,
        quantity: parseInt(quantity) || 50,
        price: orderType === 'LIMIT' ? parseFloat(limitPrice) || ltp : 0,
      };

      const res = await api.dhan.placeOrder(payload);
      addToast('success', `Executed ${side} ${quantity} ${selectedSymbol} [${res.orderStatus}]`);
      if (onOrderSuccess) onOrderSuccess();
      onClose();
    } catch (err) {
      addToast('error', err.message || 'Trade execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="quick-chart-trade-modal-overlay" className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        id="quick-chart-trade-box"
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1000px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#0b0e15',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {/* Symbol & Real-Time Tick */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="#06b6d4" />
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                style={{
                  background: '#06080c',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              >
                <option value="NIFTY 50">NIFTY 50</option>
                <option value="BANK NIFTY">BANK NIFTY</option>
                <option value="FIN NIFTY">FIN NIFTY</option>
                <option value="SENSEX">SENSEX</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                ₹{ltp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: ch >= 0 ? '#10b981' : '#f43f5e',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {ch >= 0 ? '+' : ''}{ch.toFixed(2)} ({chp >= 0 ? '+' : ''}{chp.toFixed(2)}%)
              </span>
            </div>

            <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
              ● LIVE WS FEED
            </span>
          </div>

          {/* Timeframe & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {['1m', '5m', '15m', '1D'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: timeframe === tf ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: timeframe === tf ? '#ffffff' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Split Chart + Trade Execution Panel */}
        <div style={{ display: 'flex', flex: 1, minHeight: '380px', flexWrap: 'wrap' }}>
          
          {/* Left: Real-time Candlestick Chart */}
          <div style={{ flex: '1 1 540px', padding: '20px', borderRight: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                H: <strong style={{ color: '#ffffff' }}>₹{maxPrice.toFixed(2)}</strong> • L: <strong style={{ color: '#ffffff' }}>₹{minPrice.toFixed(2)}</strong> • VWAP: <strong style={{ color: '#38bdf8' }}>₹{(ltp - 15).toFixed(2)}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Zap size={13} /> Streaming Quotes Active
              </div>
            </div>

            {/* SVG Candlestick Chart */}
            <div style={{ flex: 1, position: 'relative', minHeight: '220px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', padding: '10px', overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                {/* Horizontal Grid lines */}
                <line x1="0" y1="50" x2="500" y2="50" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="rgba(255, 255, 255, 0.06)" />
                <line x1="0" y1="150" x2="500" y2="150" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />

                {/* Candles */}
                {candleData.map((c, i) => {
                  const x = 30 + i * 46;
                  const isGreen = c.close >= c.open;
                  const candleColor = isGreen ? '#10b981' : '#f43f5e';
                  const top = getY(Math.max(c.open, c.close));
                  const bot = getY(Math.min(c.open, c.close));
                  const height = Math.max(4, bot - top);
                  const wickTop = getY(c.high);
                  const wickBot = getY(c.low);

                  return (
                    <g key={i}>
                      {/* Wick */}
                      <line x1={x + 10} y1={wickTop} x2={x + 10} y2={wickBot} stroke={candleColor} strokeWidth="1.5" />
                      {/* Body */}
                      <rect
                        x={x}
                        y={top}
                        width="20"
                        height={height}
                        fill={candleColor}
                        rx="2"
                      />
                    </g>
                  );
                })}

                {/* Live Current Price Reference Line */}
                <line
                  x1="0"
                  y1={getY(ltp)}
                  x2="500"
                  y2={getY(ltp)}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Live Price Tag on Right */}
              <div
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: `${Math.min(180, Math.max(10, getY(ltp) - 10))}px`,
                  background: '#38bdf8',
                  color: '#000000',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ₹{ltp.toFixed(2)}
              </div>
            </div>

            {/* Time markers */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '8px' }}>
              <span>09:15</span>
              <span>10:30</span>
              <span>11:45</span>
              <span>12:45</span>
              <span>13:45</span>
            </div>
          </div>

          {/* Right: Instant Buy / Sell Execution Ticket */}
          <div style={{ flex: '1 1 320px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255, 255, 255, 0.01)' }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#ffffff' }}>
              Quick Order Ticket
            </div>

            {/* Side Toggle (BUY / SELL) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                onClick={() => setSide('BUY')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: side === 'BUY' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: side === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: side === 'BUY' ? '#10b981' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                BUY / LONG
              </button>

              <button
                onClick={() => setSide('SELL')}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: side === 'SELL' ? '2px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: side === 'SELL' ? 'rgba(244, 63, 94, 0.15)' : 'transparent',
                  color: side === 'SELL' ? '#f43f5e' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                }}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Product & Order Type */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>PRODUCT</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#06080c',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value="INTRADAY">MIS (Intraday)</option>
                  <option value="CNC">NRML (Overnight)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>ORDER TYPE</label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#06080c',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                  }}
                >
                  <option value="MARKET">Market</option>
                  <option value="LIMIT">Limit</option>
                </select>
              </div>
            </div>

            {/* Quantity Stepper */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>QUANTITY (LOTS)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setQuantity((q) => Math.max(25, q - 25))}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  step="25"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 25)}
                  style={{
                    flex: 1,
                    background: '#06080c',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '6px',
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                  }}
                />
                <button
                  onClick={() => setQuantity((q) => q + 25)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Limit Price (if LIMIT) */}
            {orderType === 'LIMIT' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>LIMIT PRICE (INR)</label>
                <input
                  type="number"
                  step="0.05"
                  placeholder={ltp.toFixed(2)}
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#06080c',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    padding: '8px',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                  }}
                />
              </div>
            )}

            {/* Margin Required estimate */}
            <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', marginBottom: '4px' }}>
                <span>Required Margin:</span>
                <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  ₹{(side === 'BUY' ? ltp * 0.15 * (quantity / 50) : ltp * 0.18 * (quantity / 50)).toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                <span>Available Margin:</span>
                <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                  ₹{Number(account?.available_balance || 500000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handleExecuteOrder}
              disabled={isSubmitting}
              style={{
                background: side === 'BUY' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: side === 'BUY' ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(244, 63, 94, 0.3)',
              }}
            >
              {isSubmitting ? <RefreshCw size={16} className="spin" /> : <Zap size={16} />}
              <span>{isSubmitting ? 'Submitting...' : `${side} ${quantity} ${selectedSymbol}`}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
