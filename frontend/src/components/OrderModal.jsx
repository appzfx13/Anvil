import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Calculator, Check, AlertCircle } from 'lucide-react';
import { SUPPORTED_INDICES, ORDER_TYPES, PRODUCT_TYPES } from '../services/constants';

export default function OrderModal({
  isOpen,
  onClose,
  onSubmit,
  defaultIndex = 'NIFTY50',
  defaultSymbol = '',
  defaultStrike = null,
  defaultSide = 'BUY',
  availableBalance = 500000,
}) {
  const [selectedIdxKey, setSelectedIdxKey] = useState(defaultIndex);
  const [side, setSide] = useState(defaultSide);
  const [orderType, setOrderType] = useState('MARKET');
  const [productType, setProductType] = useState('INTRADAY');
  const [optionType, setOptionType] = useState('CE');
  const [customPrice, setCustomPrice] = useState('145.50');
  const [triggerPrice, setTriggerPrice] = useState('0.00');
  const [multiplier, setMultiplier] = useState(1);
  const [boProfit, setBoProfit] = useState('0.00');
  const [boStopLoss, setBoStopLoss] = useState('0.00');

  const currentIndex = SUPPORTED_INDICES.find((i) => i.key === selectedIdxKey) || SUPPORTED_INDICES[0];
  const lotSize = currentIndex.lotSize;
  const quantity = lotSize * multiplier;

  const currentStrike = defaultStrike || currentIndex.baseSpot;
  const tradingSymbol = defaultSymbol || `${currentIndex.key}26OCT${currentStrike}${optionType}`;

  // Estimate required margin
  const priceNum = parseFloat(customPrice) || 0;
  const requiredMargin = side === 'BUY'
    ? priceNum * quantity
    : (currentIndex.baseSpot * lotSize * 0.12) * multiplier;

  const isMarginSufficient = availableBalance >= requiredMargin;

  useEffect(() => {
    if (defaultSide) setSide(defaultSide);
    if (defaultIndex) setSelectedIdxKey(defaultIndex);
  }, [defaultSide, defaultIndex, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      dhanClientId: localStorage.getItem('anvil_client_id') || '1000000001',
      correlationId: `strat_${Date.now()}`,
      transactionType: side,
      exchangeSegment: currentIndex.exchange,
      productType: productType,
      orderType: orderType,
      validity: 'DAY',
      securityId: `${currentStrike}01`,
      tradingSymbol: tradingSymbol,
      quantity: quantity,
      price: orderType === 'MARKET' ? 0 : priceNum,
      triggerPrice: ['STOP_LOSS', 'STOP_LOSS_MARKET'].includes(orderType) ? parseFloat(triggerPrice) : 0,
      boProfitValue: parseFloat(boProfit) || 0,
      boStopLossValue: parseFloat(boStopLoss) || 0,
    };
    onSubmit(payload);
  };

  return (
    <div id="order-drawer-overlay" className="modal-overlay" onClick={onClose}>
      <div
        id="order-drawer-box"
        className="modal-box"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#ffffff' }}>Place Simulated Order</h3>
              <span className={side === 'BUY' ? 'badge-bull' : 'badge-bear'}>
                {side}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {tradingSymbol}
            </div>
          </div>
          <button
            id="order-drawer-close"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {/* Side Toggle: BUY / SELL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '18px' }}>
            <button
              type="button"
              id="order-side-buy-btn"
              onClick={() => setSide('BUY')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: side === 'BUY' ? 'var(--bull-green)' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: side === 'BUY' ? '0 4px 15px var(--bull-green-glow)' : 'none',
              }}
            >
              <ArrowUpRight size={16} /> BUY
            </button>
            <button
              type="button"
              id="order-side-sell-btn"
              onClick={() => setSide('SELL')}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: side === 'SELL' ? 'var(--bear-red)' : 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: side === 'SELL' ? '0 4px 15px var(--bear-red-glow)' : 'none',
              }}
            >
              <ArrowDownRight size={16} /> SELL
            </button>
          </div>

          {/* Index Selector & Option Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                UNDERLYING INDEX
              </label>
              <select
                id="order-index-select"
                value={selectedIdxKey}
                onChange={(e) => setSelectedIdxKey(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: '#ffffff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                }}
              >
                {SUPPORTED_INDICES.map((idx) => (
                  <option key={idx.key} value={idx.key}>
                    {idx.name} (Lot: {idx.lotSize})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                CALL / PUT
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => setOptionType('CE')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: optionType === 'CE' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                    borderColor: optionType === 'CE' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: optionType === 'CE' ? '#818cf8' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  CE
                </button>
                <button
                  type="button"
                  onClick={() => setOptionType('PE')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: optionType === 'PE' ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                    borderColor: optionType === 'PE' ? 'var(--bear-red)' : 'var(--border-subtle)',
                    color: optionType === 'PE' ? '#fb7185' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  PE
                </button>
              </div>
            </div>
          </div>

          {/* Product Type & Order Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                PRODUCT TYPE
              </label>
              <select
                id="order-product-type-select"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: '#ffffff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                }}
              >
                {PRODUCT_TYPES.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                ORDER TYPE
              </label>
              <select
                id="order-type-select"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: '#ffffff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                }}
              >
                {ORDER_TYPES.map((ot) => (
                  <option key={ot.id} value={ot.id}>{ot.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity with Lot Multiplier Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                QUANTITY (LOT: {lotSize})
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                {multiplier} Lot(s) = {quantity} Qty
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 5, 10, 20].map((m) => (
                <button
                  type="button"
                  key={m}
                  id={`multiplier-${m}x`}
                  onClick={() => setMultiplier(m)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: multiplier === m ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-surface)',
                    borderColor: multiplier === m ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: multiplier === m ? '#ffffff' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  {m}x
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                LIMIT PRICE (₹)
              </label>
              <input
                id="order-input-price"
                type="number"
                step="0.05"
                disabled={orderType === 'MARKET'}
                value={orderType === 'MARKET' ? '0.00' : customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                style={{
                  width: '100%',
                  background: orderType === 'MARKET' ? 'rgba(255,255,255,0.02)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: orderType === 'MARKET' ? 'var(--text-muted)' : '#ffffff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                TRIGGER PRICE (₹)
              </label>
              <input
                id="order-input-trigger-price"
                type="number"
                step="0.05"
                disabled={!['STOP_LOSS', 'STOP_LOSS_MARKET'].includes(orderType)}
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                style={{
                  width: '100%',
                  background: !['STOP_LOSS', 'STOP_LOSS_MARKET'].includes(orderType) ? 'rgba(255,255,255,0.02)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: '#ffffff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          </div>

          {/* Margin Estimation Telemetry Box */}
          <div
            id="order-margin-telemetry"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calculator size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Required Margin:</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  color: isMarginSufficient ? 'var(--bull-green)' : 'var(--bear-red)',
                }}
              >
                ₹{requiredMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {!isMarginSufficient && (
                <div style={{ fontSize: '0.7rem', color: 'var(--bear-red)' }}>
                  Insufficient Margin!
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="order-submit-btn"
              disabled={!isMarginSufficient}
              className={side === 'BUY' ? 'btn-bull' : 'btn-bear'}
              style={{
                flex: 2,
                opacity: isMarginSufficient ? 1 : 0.5,
                cursor: isMarginSufficient ? 'pointer' : 'not-allowed',
              }}
            >
              Confirm {side} Order ({quantity} Qty)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
