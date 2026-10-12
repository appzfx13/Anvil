import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  PlusCircle,
  RotateCcw,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Play,
  Key,
  Shield,
  Clock,
  XCircle
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import OrderModal from '../components/OrderModal';
import OptionChainModal from '../components/OptionChainModal';

export default function Dashboard({
  user,
  account,
  ticks = {},
  onRefreshAccount,
  addToast,
}) {
  const [activeTab, setActiveTab] = useState('positions'); // positions | orders | trades
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOptionChainOpen, setIsOptionChainOpen] = useState(false);
  const [isAdjustFundsOpen, setIsAdjustFundsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCancelOrderConfirmOpen, setIsCancelOrderConfirmOpen] = useState(false);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);

  // Selected contract state for OrderModal
  const [orderModalParams, setOrderModalParams] = useState({
    index: 'NIFTY50',
    symbol: '',
    strike: null,
    side: 'BUY',
  });

  // Funds adjustment input
  const [fundAdjustmentAmount, setFundAdjustmentAmount] = useState('100000');

  // Copy state indicator
  const [copiedKey, setCopiedKey] = useState('');

  // Fetch telemetry data
  const fetchData = async () => {
    try {
      const [posData, ordData, trdData] = await Promise.all([
        api.dhan.getPositions().catch(() => []),
        api.dhan.getOrders().catch(() => []),
        api.dhan.getTrades().catch(() => []),
      ]);
      setPositions(posData);
      setOrders(ordData);
      setTrades(trdData);
    } catch (err) {
      console.error('Failed to update dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute Net P&L metrics
  const netRealized = positions.reduce((acc, p) => acc + (p.realizedProfit || 0), 0);
  const netUnrealized = positions.reduce((acc, p) => acc + (p.unrealizedProfit || 0), 0);
  const totalPnl = netRealized + netUnrealized;

  // Handle Order Placement
  const handlePlaceOrder = async (orderPayload) => {
    try {
      const res = await api.dhan.placeOrder(orderPayload);
      setIsOrderModalOpen(false);
      addToast('success', `Order ${res.orderId} executed [${res.orderStatus}]`);
      fetchData();
      onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Order execution failed.');
    }
  };

  // Handle Order Cancellation
  const handleConfirmCancelOrder = async () => {
    if (!selectedOrderToCancel) return;
    try {
      await api.dhan.cancelOrder(selectedOrderToCancel.orderId);
      addToast('success', `Order ${selectedOrderToCancel.orderId} cancelled.`);
      setIsCancelOrderConfirmOpen(false);
      fetchData();
      onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Failed to cancel order.');
    }
  };

  // Handle Funds Adjustment
  const handleAdjustFunds = async () => {
    const amt = parseFloat(fundAdjustmentAmount);
    if (!amt || isNaN(amt)) {
      addToast('error', 'Enter a valid amount.');
      return;
    }
    try {
      await api.account.adjustFunds(amt, 'Virtual Margin Deposit');
      addToast('success', `Added ₹${amt.toLocaleString('en-IN')} to virtual ledger.`);
      setIsAdjustFundsOpen(false);
      onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Margin adjustment failed.');
    }
  };

  // Handle Reset Ledger
  const handleResetLedger = async () => {
    try {
      await api.account.resetLedger();
      addToast('success', 'Sandbox session reset to initial SOD limit.');
      setIsResetConfirmOpen(false);
      fetchData();
      onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Reset failed.');
    }
  };

  // Copy helper
  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Square off position helper
  const handleSquareOffPosition = (pos) => {
    const oppSide = pos.netQty > 0 ? 'SELL' : 'BUY';
    setOrderModalParams({
      index: pos.tradingSymbol.startsWith('BANK') ? 'BANKNIFTY' : 'NIFTY50',
      symbol: pos.tradingSymbol,
      strike: null,
      side: oppSide,
    });
    setIsOrderModalOpen(true);
  };

  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';
  const token = user?.access_token || localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_demo_token_2026';

  return (
    <div id="dashboard-container" style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px' }}>
      {/* 1. Header Metrics & Credentials Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Margin Telemetry Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVAILABLE MARGIN</span>
            <Wallet size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
            ₹{Number(account?.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>Utilized: ₹{Number(account?.utilized_margin || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span>SOD: ₹{Number(account?.sod_limit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Real-time MTM P&L Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>NET MTM REAL-TIME P&L</span>
            {totalPnl >= 0 ? <TrendingUp size={16} color="var(--bull-green)" /> : <TrendingDown size={16} color="var(--bear-red)" />}
          </div>
          <div
            style={{
              fontSize: '1.8rem',
              fontWeight: 800,
              color: totalPnl >= 0 ? 'var(--bull-green)' : 'var(--bear-red)',
              fontFamily: 'var(--font-mono)',
              marginBottom: '8px',
            }}
          >
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            <span>Realized: ₹{netRealized.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span>Unrealized: ₹{netUnrealized.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Dhan API Credentials Card */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>DHAN v2 WIRE CREDENTIALS</span>
            <Key size={16} color="var(--accent-primary)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--text-muted)' }}>client-id:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>{clientId}</span>
              <button
                id="copy-client-id-btn"
                onClick={() => copyToClipboard(clientId, 'client-id')}
                style={{ background: 'transparent', border: 'none', color: copiedKey === 'client-id' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
              >
                {copiedKey === 'client-id' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: 'var(--text-muted)' }}>access-token:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#ffffff' }}>{token.substring(0, 14)}...</span>
              <button
                id="copy-access-token-btn"
                onClick={() => copyToClipboard(token, 'access-token')}
                style={{ background: 'transparent', border: 'none', color: copiedKey === 'access-token' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
              >
                {copiedKey === 'access-token' ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary Action Bar */}
      <div
        id="dashboard-action-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            id="tab-positions-btn"
            onClick={() => setActiveTab('positions')}
            className="btn-secondary"
            style={{
              background: activeTab === 'positions' ? 'var(--bg-surface-elevated)' : 'transparent',
              borderColor: activeTab === 'positions' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: activeTab === 'positions' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            Positions ({positions.length})
          </button>
          <button
            id="tab-orders-btn"
            onClick={() => setActiveTab('orders')}
            className="btn-secondary"
            style={{
              background: activeTab === 'orders' ? 'var(--bg-surface-elevated)' : 'transparent',
              borderColor: activeTab === 'orders' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: activeTab === 'orders' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            Order Book ({orders.length})
          </button>
          <button
            id="tab-trades-btn"
            onClick={() => setActiveTab('trades')}
            className="btn-secondary"
            style={{
              background: activeTab === 'trades' ? 'var(--bg-surface-elevated)' : 'transparent',
              borderColor: activeTab === 'trades' ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: activeTab === 'trades' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            Trade Book ({trades.length})
          </button>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="open-option-chain-btn"
            className="btn-secondary"
            onClick={() => setIsOptionChainOpen(true)}
            style={{ padding: '8px 14px', fontSize: '0.86rem' }}
          >
            <Layers size={16} /> Option Chain
          </button>

          <button
            id="open-order-modal-btn"
            className="btn-primary"
            onClick={() => {
              setOrderModalParams({ index: 'NIFTY50', symbol: '', strike: null, side: 'BUY' });
              setIsOrderModalOpen(true);
            }}
            style={{ padding: '8px 18px', fontSize: '0.86rem' }}
          >
            <PlusCircle size={16} /> Place Order
          </button>

          <button
            id="deposit-funds-btn"
            className="btn-secondary"
            onClick={() => setIsAdjustFundsOpen(true)}
            style={{ padding: '8px 12px', fontSize: '0.86rem' }}
            title="Deposit Virtual Funds"
          >
            Deposit ₹
          </button>

          <button
            id="reset-sandbox-btn"
            className="btn-secondary"
            onClick={() => setIsResetConfirmOpen(true)}
            style={{ padding: '8px 12px', fontSize: '0.86rem', color: 'var(--warn-amber)' }}
            title="Reset Sandbox Ledger"
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>
      </div>

      {/* 3. Tabbed Content */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {/* Positions View */}
        {activeTab === 'positions' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table">
              <thead>
                <tr>
                  <th>INSTRUMENT</th>
                  <th>SIDE</th>
                  <th>PRODUCT</th>
                  <th>NET QTY</th>
                  <th>BUY AVG</th>
                  <th>SELL AVG</th>
                  <th>REALIZED</th>
                  <th>UNREALIZED MTM</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No open positions. Place an order or click "Option Chain" to start.
                    </td>
                  </tr>
                ) : (
                  positions.map((p, idx) => {
                    const isLong = p.netQty > 0;
                    const pnl = p.unrealizedProfit || 0;
                    return (
                      <tr key={idx} id={`pos-row-${p.securityId}`}>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{p.tradingSymbol}</td>
                        <td>
                          <span className={isLong ? 'badge-bull' : (p.netQty < 0 ? 'badge-bear' : 'badge-neutral')}>
                            {p.positionType}
                          </span>
                        </td>
                        <td>{p.productType}</td>
                        <td style={{ fontWeight: 700 }}>{p.netQty}</td>
                        <td>₹{p.buyAvg?.toFixed(2)}</td>
                        <td>₹{p.sellAvg?.toFixed(2)}</td>
                        <td style={{ color: p.realizedProfit >= 0 ? 'var(--bull-green)' : 'var(--bear-red)' }}>
                          ₹{p.realizedProfit?.toFixed(2)}
                        </td>
                        <td style={{ fontWeight: 700, color: pnl >= 0 ? 'var(--bull-green)' : 'var(--bear-red)' }}>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {p.netQty !== 0 && (
                            <button
                              id={`square-off-btn-${p.securityId}`}
                              className="btn-secondary"
                              onClick={() => handleSquareOffPosition(p)}
                              style={{ padding: '4px 10px', fontSize: '0.76rem', color: 'var(--bear-red)' }}
                            >
                              Square Off
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Order Book View */}
        {activeTab === 'orders' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table">
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>TIME</th>
                  <th>SYMBOL</th>
                  <th>SIDE</th>
                  <th>TYPE</th>
                  <th>QTY</th>
                  <th>PRICE</th>
                  <th>AVG PRICE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No orders placed today.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const isTraded = o.orderStatus === 'TRADED';
                    const isPending = o.orderStatus === 'PENDING';
                    const isRejected = o.orderStatus === 'REJECTED';
                    return (
                      <tr key={o.orderId} id={`order-row-${o.orderId}`}>
                        <td style={{ color: 'var(--accent-cyan)' }}>{o.orderId}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{o.createTime?.split(' ')[1] || o.createTime}</td>
                        <td style={{ fontWeight: 600, color: '#ffffff' }}>{o.tradingSymbol}</td>
                        <td>
                          <span className={o.transactionType === 'BUY' ? 'badge-bull' : 'badge-bear'}>
                            {o.transactionType}
                          </span>
                        </td>
                        <td>{o.orderType}</td>
                        <td>{o.quantity}</td>
                        <td>₹{o.price?.toFixed(2)}</td>
                        <td>₹{o.averagePrice?.toFixed(2)}</td>
                        <td>
                          <span
                            className={
                              isTraded ? 'badge-bull' : (isPending ? 'badge-neutral' : (isRejected ? 'badge-bear' : 'badge-neutral'))
                            }
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isPending && (
                            <button
                              id={`cancel-order-btn-${o.orderId}`}
                              className="btn-secondary"
                              onClick={() => {
                                setSelectedOrderToCancel(o);
                                setIsCancelOrderConfirmOpen(true);
                              }}
                              style={{ padding: '4px 8px', fontSize: '0.76rem', color: 'var(--bear-red)' }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Trade Book View */}
        {activeTab === 'trades' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table">
              <thead>
                <tr>
                  <th>TRADE ID</th>
                  <th>ORDER ID</th>
                  <th>TIME</th>
                  <th>SYMBOL</th>
                  <th>SIDE</th>
                  <th>TRADED QTY</th>
                  <th>TRADED PRICE</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No trades executed yet.
                    </td>
                  </tr>
                ) : (
                  trades.map((t) => (
                    <tr key={t.tradeId} id={`trade-row-${t.tradeId}`}>
                      <td style={{ color: 'var(--bull-green)' }}>{t.tradeId}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.orderId}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{t.exchangeTime}</td>
                      <td style={{ fontWeight: 600, color: '#ffffff' }}>{t.tradingSymbol}</td>
                      <td>
                        <span className={t.transactionType === 'BUY' ? 'badge-bull' : 'badge-bear'}>
                          {t.transactionType}
                        </span>
                      </td>
                      <td>{t.tradedQuantity}</td>
                      <td style={{ fontWeight: 700, color: '#38bdf8' }}>₹{t.tradedPrice?.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Modals */}
      {/* Order Placement Modal */}
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

      {/* Option Chain Modal */}
      <OptionChainModal
        isOpen={isOptionChainOpen}
        onClose={() => setIsOptionChainOpen(false)}
        onSelectContract={(contract) => {
          setIsOptionChainOpen(false);
          setOrderModalParams({
            index: contract.indexKey,
            symbol: contract.symbol,
            strike: contract.strike,
            side: contract.side,
          });
          setIsOrderModalOpen(true);
        }}
      />

      {/* Deposit Virtual Funds Modal */}
      <Modal
        isOpen={isAdjustFundsOpen}
        title="Deposit Virtual Funds"
        confirmText="Add Margin"
        onConfirm={handleAdjustFunds}
        onCancel={() => setIsAdjustFundsOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            AMOUNT TO DEPOSIT (INR)
          </label>
          <input
            id="deposit-amount-input"
            type="number"
            step="10000"
            value={fundAdjustmentAmount}
            onChange={(e) => setFundAdjustmentAmount(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
            }}
          />
        </div>
      </Modal>

      {/* Reset Sandbox Confirm Modal */}
      <Modal
        isOpen={isResetConfirmOpen}
        title="Reset Virtual Sandbox Ledger?"
        message="This will reset your account balance back to the initial Start-of-Day limit (₹5,00,000) and clear all active positions and orders. Are you sure?"
        confirmText="Confirm Reset"
        isDanger={true}
        onConfirm={handleResetLedger}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Cancel Order Confirm Modal */}
      <Modal
        isOpen={isCancelOrderConfirmOpen}
        title={`Cancel Order ${selectedOrderToCancel?.orderId}?`}
        message={`Are you sure you want to cancel the pending ${selectedOrderToCancel?.transactionType} order for ${selectedOrderToCancel?.quantity}x ${selectedOrderToCancel?.tradingSymbol}?`}
        confirmText="Cancel Order"
        isDanger={true}
        onConfirm={handleConfirmCancelOrder}
        onCancel={() => setIsCancelOrderConfirmOpen(false)}
      />
    </div>
  );
}
