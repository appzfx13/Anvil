import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  PlusCircle,
  RotateCcw,
  RefreshCw,
  Clock,
  Radio,
  Zap,
  Sliders,
  Activity,
  Plus,
  PieChart,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Check,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import OrderModal from '../components/OrderModal';
import QuickChartTradeModal from '../components/QuickChartTradeModal';
import { SUPPORTED_INDICES } from '../services/constants';
import { formatTradingSymbol } from '../services/formatters';

export default function Dashboard({
  user,
  account,
  ticks = {},
  initialTab = 'positions',
  onRefreshAccount,
  addToast,
  onOpenMarmotConfig,
  onOpenDataFeed,
}) {
  // Navigation & Desk tabs: positions | orders | trades
  const [activeDeskTab, setActiveDeskTab] = useState(initialTab === 'optionchain' ? 'positions' : initialTab || 'positions');
  const [positionsFilter, setPositionsFilter] = useState('open'); // open | closed | all

  // Telemetry data
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Live IST Clock
  const [currentTime, setCurrentTime] = useState('');

  // Kill Switch state
  const [killSwitchActive, setKillSwitchActive] = useState(user?.kill_switch_active || false);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState(false);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [selectedChartSymbol, setSelectedChartSymbol] = useState('NIFTY 50');
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100000');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Selected contract state for OrderModal
  const [orderModalParams, setOrderModalParams] = useState({
    index: 'NIFTY50',
    symbol: '',
    strike: null,
    side: 'BUY',
  });

  // Update Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch telemetry data from wire
  const fetchData = async () => {
    try {
      const [posData, ordData, trdData, ksData] = await Promise.all([
        api.dhan.getPositions().catch(() => []),
        api.dhan.getOrders().catch(() => []),
        api.dhan.getTrades().catch(() => []),
        api.dhan.getKillSwitch().catch(() => ({ killSwitchActive: false })),
      ]);
      setPositions(posData || []);
      setOrders(ordData || []);
      setTrades(trdData || []);
      if (ksData && typeof ksData.killSwitchActive === 'boolean') {
        setKillSwitchActive(ksData.killSwitchActive);
      }
    } catch (err) {
      console.error('Failed to update telemetry:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Derived Performance & Brokerage Metrics
  const netRealized = positions.reduce((acc, p) => acc + (p.realizedProfit || 0), 0);
  const netUnrealized = positions.reduce((acc, p) => acc + (p.unrealizedProfit || 0), 0);
  const totalPnl = netRealized + netUnrealized;

  const pendingCount = orders.filter((o) => o.orderStatus === 'PENDING').length;
  const tradedCount = orders.filter((o) => o.orderStatus === 'TRADED').length;
  const rejectedCount = orders.filter((o) => o.orderStatus === 'REJECTED' || o.orderStatus === 'CANCELLED').length;

  // Estimated Brokerage (Flat ₹20 per executed order + ~₹4.50 taxes/STT)
  const estimatedBrokerage = tradedCount * 20;
  const estimatedTaxes = tradedCount > 0 ? Math.round(tradedCount * 4.5 * 100) / 100 : 0;
  const totalBrokerageCharges = estimatedBrokerage + estimatedTaxes;

  // Margins (respect 0 initial balance)
  const availableBal = Number(account?.available_balance ?? 0);
  const utilizedMargin = Number(account?.utilized_margin ?? 0);
  const totalCapital = Math.max(availableBal + utilizedMargin, Number(account?.sod_limit ?? 0), 1);
  const marginUtilizedPct = totalCapital > 0 ? Math.min(100, Math.round((utilizedMargin / totalCapital) * 100)) : 0;

  // Dynamic Intraday Equity Curve Points Calculation
  const equityPoints = useMemo(() => {
    // Zero / No trades case: Clean Flat baseline
    if ((!trades || trades.length === 0) && totalPnl === 0) {
      return {
        hasData: false,
        linePath: 'M 0 60 L 500 60',
        areaPath: '',
        lastX: 500,
        lastY: 60,
        color: '#64748b',
        maxAbs: 0,
      };
    }

    // When there are real trades or active non-zero MTM PnL
    const points = [{ x: 0, yVal: 0 }];
    let runningPnl = 0;

    if (trades && trades.length > 0) {
      // Sort trades chronologically
      const sortedTrades = [...trades].sort((a, b) => {
        const tA = new Date(a.exchangeTime || a.tradeTime || a.created_at || 0).getTime();
        const tB = new Date(b.exchangeTime || b.tradeTime || b.created_at || 0).getTime();
        return tA - tB;
      });

      const totalTrades = sortedTrades.length;
      sortedTrades.forEach((trd, idx) => {
        const tradePnl = Number(trd.realized_pnl || trd.realizedProfit || 0);
        runningPnl += tradePnl;
        const x = Math.round(((idx + 1) / (totalTrades + 1)) * 460) + 20;
        points.push({ x, yVal: runningPnl });
      });
    }

    // Add final point representing current MTM totalPnl at current time
    points.push({ x: 500, yVal: totalPnl });

    // Determine scale: max absolute deviation (minimum 100 for visual stability)
    const maxAbs = Math.max(...points.map((p) => Math.abs(p.yVal)), Math.abs(totalPnl), 100);

    // Map yVal to SVG canvas y (0 to 120, baseline = 60)
    // Positive PnL goes UP (y < 60), Negative PnL goes DOWN (y > 60)
    const svgCoords = points.map((p) => {
      const y = Math.round(60 - (p.yVal / maxAbs) * 45);
      return { x: p.x, y: Math.max(10, Math.min(110, y)) };
    });

    const linePath = svgCoords.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), '');
    const areaPath = `${linePath} L 500 120 L 0 120 Z`;
    const lastPt = svgCoords[svgCoords.length - 1];

    return {
      hasData: true,
      linePath,
      areaPath,
      lastX: lastPt.x,
      lastY: lastPt.y,
      color: totalPnl >= 0 ? '#10b981' : '#f43f5e',
      maxAbs,
    };
  }, [trades, totalPnl]);

  // Filtered Positions
  const filteredPositions = positions.filter((p) => {
    if (positionsFilter === 'open') return p.netQty !== 0;
    if (positionsFilter === 'closed') return p.netQty === 0;
    return true;
  });

  // Client Details
  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';

  // Handle Order Placement
  const handlePlaceOrder = async (orderPayload) => {
    if (killSwitchActive) {
      addToast('error', 'Trading is locked: Emergency Kill Switch is active on your account.');
      return;
    }
    try {
      const res = await api.dhan.placeOrder(orderPayload);
      setIsOrderModalOpen(false);
      addToast('success', `Order placed: #${res.orderId} [${res.orderStatus}]`);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Order execution failed.');
    }
  };

  // Handle Cancel Order
  const handleCancelOrder = async (orderId) => {
    try {
      await api.dhan.cancelOrder(orderId);
      addToast('success', `Order #${orderId} cancelled.`);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Failed to cancel order.');
    }
  };

  // Handle Square Off position
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

  // Handle Kill Switch Activation / Deactivation
  const handleToggleKillSwitch = async () => {
    setKillSwitchLoading(true);
    try {
      if (!killSwitchActive) {
        const res = await api.dhan.activateKillSwitch();
        setKillSwitchActive(true);
        addToast('error', `🚨 KILL SWITCH ACTIVATED! Cancelled ${res.cancelledOrdersCount || 0} orders, squared off ${res.squaredPositionsCount || 0} positions.`);
      } else {
        await api.dhan.deactivateKillSwitch();
        setKillSwitchActive(false);
        addToast('success', '🔓 Kill Switch Deactivated: Trading unlocked.');
      }
      setIsKillSwitchModalOpen(false);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Kill switch operation failed.');
    } finally {
      setKillSwitchLoading(false);
    }
  };

  // Handle Deposit
  const handleDepositConfirm = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      addToast('error', 'Enter a valid margin amount.');
      return;
    }
    try {
      await api.account.adjustFunds(amt, 'Virtual Margin Deposit');
      addToast('success', `Deposited ₹${amt.toLocaleString('en-IN')} to virtual ledger.`);
      setIsDepositModalOpen(false);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Deposit failed.');
    }
  };

  // Handle Reset Ledger
  const handleResetLedger = async () => {
    try {
      await api.account.resetLedger();
      addToast('success', 'Sandbox session, orders, trades, and positions completely reset to SOD baseline.');
      setIsResetConfirmOpen(false);
      setPositions([]);
      setOrders([]);
      setTrades([]);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Reset failed.');
    }
  };


  // Live Ticks Spot References
  const niftyTick = ticks['NIFTY50'] || { ltp: 22504.65, ch: 141.20, chp: 0.62 };
  const bankTick = ticks['BANKNIFTY'] || { ltp: 48250.80, ch: 320.10, chp: 0.67 };
  const finTick = ticks['FINNIFTY'] || { ltp: 21680.40, ch: 95.50, chp: 0.44 };
  const sensexTick = ticks['SENSEX'] || { ltp: 74119.30, ch: 450.20, chp: 0.61 };

  return (
    <div id="clean-broker-dashboard" className="desk-container-responsive" style={{ color: '#f8fafc' }}>
      
      {/* 1. Broker Top Header & Quick Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Market Desk
            </h1>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.66rem', fontWeight: 700 }}>
              ● LIVE SIMULATION
            </span>
            <span className="pill-badge badge-cyan" style={{ fontSize: '0.66rem', fontFamily: 'var(--font-mono)' }}>
              CLIENT: {clientId}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
            Real-time paper trading engine with institutional execution telemetry & Dhan v2 wire compatibility.
          </p>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Clock Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <Clock size={14} color="#10b981" />
            <span style={{ color: '#ffffff', fontWeight: 700 }}>{currentTime || '09:15:00'} IST</span>
            <span style={{ fontSize: '0.66rem', color: '#10b981' }}>• NSE/BSE LIVE</span>
          </div>

          {/* Quick Trade Action */}
          <button
            id="broker-quick-place-order-btn"
            onClick={() => {
              setOrderModalParams({ index: 'NIFTY50', symbol: '', strike: null, side: 'BUY' });
              setIsOrderModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <PlusCircle size={15} /> Place Trade
          </button>

          {/* Quick Chart Modal Trigger (Right corner) */}
          <button
            id="broker-quick-chart-modal-btn"
            onClick={() => {
              setSelectedChartSymbol('NIFTY 50');
              setIsChartModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.4)',
              color: '#06b6d4',
              borderRadius: '8px',
              padding: '7px 13px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Activity size={15} /> Chart & Trade
          </button>

          {/* Add Margin */}
          <button
            id="broker-add-margin-btn"
            onClick={() => setIsDepositModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '7px 13px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add Margin
          </button>

          {/* Emergency Kill Switch */}
          <button
            id="broker-kill-switch-btn"
            onClick={() => setIsKillSwitchModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: killSwitchActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${killSwitchActive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: killSwitchActive ? '#ef4444' : '#94a3b8',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {killSwitchActive ? <ShieldAlert size={15} color="#ef4444" /> : <ShieldCheck size={15} color="#94a3b8" />}
            <span>{killSwitchActive ? 'Kill Switch Active' : 'Kill Switch'}</span>
          </button>

          {/* Reset Session & Ledger */}
          <button
            id="broker-reset-ledger-btn"
            onClick={() => setIsResetConfirmOpen(true)}
            title="Reset sandbox ledger back to initial SOD limit (₹5,00,000) and square off all open positions"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '8px',
              padding: '7px 13px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Ledger</span>
          </button>
        </div>
      </div>


      {/* 2. Real-Time Index Market Watch Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* NIFTY 50 */}
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(11, 14, 21, 0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>NIFTY 50</span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>NSE SPOT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(niftyTick.ltp || 22504.65).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: niftyTick.ch >= 0 ? '#10b981' : '#f43f5e' }}>
              {niftyTick.ch >= 0 ? '+' : ''}{Number(niftyTick.ch || 0).toFixed(2)} ({niftyTick.chp >= 0 ? '+' : ''}{Number(niftyTick.chp || 0).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* BANK NIFTY */}
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(11, 14, 21, 0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>BANK NIFTY</span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>NSE SPOT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(bankTick.ltp || 48250.80).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: bankTick.ch >= 0 ? '#10b981' : '#f43f5e' }}>
              {bankTick.ch >= 0 ? '+' : ''}{Number(bankTick.ch || 0).toFixed(2)} ({bankTick.chp >= 0 ? '+' : ''}{Number(bankTick.chp || 0).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* FIN NIFTY */}
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(11, 14, 21, 0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>FIN NIFTY</span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>NSE SPOT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(finTick.ltp || 21680.40).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: finTick.ch >= 0 ? '#10b981' : '#f43f5e' }}>
              {finTick.ch >= 0 ? '+' : ''}{Number(finTick.ch || 0).toFixed(2)} ({finTick.chp >= 0 ? '+' : ''}{Number(finTick.chp || 0).toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* SENSEX */}
        <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(11, 14, 21, 0.85)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8' }}>BSE SENSEX</span>
            <span className="pill-badge badge-cyan" style={{ fontSize: '0.6rem', padding: '1px 5px' }}>BSE SPOT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              ₹{Number(sensexTick.ltp || 74119.30).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: sensexTick.ch >= 0 ? '#10b981' : '#f43f5e' }}>
              {sensexTick.ch >= 0 ? '+' : ''}{Number(sensexTick.ch || 0).toFixed(2)} ({sensexTick.chp >= 0 ? '+' : ''}{Number(sensexTick.chp || 0).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Primary KPI Performance Metric Cards (4 Clean Columns) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        {/* KPI 1: Realised Booked P&L */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              REALISED P&L (BOOKED)
            </span>
            <span
              className={netRealized >= 0 ? 'pill-badge badge-emerald' : 'pill-badge badge-rose'}
              style={{ fontSize: '0.62rem', padding: '1px 6px' }}
            >
              {netRealized >= 0 ? 'PROFIT' : 'LOSS'}
            </span>
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: netRealized >= 0 ? '#10b981' : '#f43f5e',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            {netRealized >= 0 ? '+' : ''}₹{netRealized.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Settled trades: <strong style={{ color: '#ffffff' }}>{trades.length}</strong></span>
            <span>Net status: <strong style={{ color: netRealized >= 0 ? '#10b981' : '#f43f5e' }}>{netRealized >= 0 ? 'Profitable' : 'Drawdown'}</strong></span>
          </div>
        </div>

        {/* KPI 2: Unrealised MTM Float */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)', borderLeft: '4px solid #06b6d4' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              UNREALISED P&L (MTM FLOAT)
            </span>
            <span className="pill-badge badge-cyan" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              LIVE TICKING
            </span>
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: netUnrealized >= 0 ? '#10b981' : '#f43f5e',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            {netUnrealized >= 0 ? '+' : ''}₹{netUnrealized.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Open contracts: <strong style={{ color: '#ffffff' }}>{filteredPositions.filter(p => p.netQty !== 0).length}</strong></span>
            <span>Total Day Net: <strong style={{ color: totalPnl >= 0 ? '#10b981' : '#f43f5e' }}>₹{totalPnl.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* KPI 3: Available Margin & Capital Ledger */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)', borderLeft: '4px solid #38bdf8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              AVAILABLE CAPITAL LEDGER
            </span>
            <span className="pill-badge badge-purple" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              BROKER SETTLED
            </span>
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: '#ffffff',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            ₹{availableBal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Blocked Margin: <strong style={{ color: '#f43f5e' }}>-₹{utilizedMargin.toFixed(2)}</strong></span>
            <span>SOD Capital: <strong style={{ color: '#94a3b8' }}>₹{Number(account?.sod_limit || 500000).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* KPI 4: Estimated Brokerage & Taxes */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)', borderLeft: '4px solid #fbbf24' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              ORDER BOOK & BROKERAGE
            </span>
            <span className="pill-badge badge-amber" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
              FLAT ₹20/ORDER
            </span>
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: '#fbbf24',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            {tradedCount} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>Fills</span> / ₹{totalBrokerageCharges.toFixed(2)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Brokerage: <strong style={{ color: '#ffffff' }}>₹{estimatedBrokerage.toFixed(2)}</strong></span>
            <span>STT & Taxes: <strong style={{ color: '#ffffff' }}>₹{estimatedTaxes.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* 4. Analytics & Interactive Visual Widgets (3 Columns: Equity Curve + Donut + Position Bar Graph) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Widget 1: Intraday Portfolio Equity Curve (Dynamic Graph) */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color={equityPoints.color} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                Equity Curve Progression
              </span>
            </div>
            <span
              style={{
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: totalPnl > 0 ? '#10b981' : totalPnl < 0 ? '#f43f5e' : '#94a3b8',
                fontSize: '0.92rem',
              }}
            >
              {totalPnl > 0 ? '+' : ''}₹{totalPnl.toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
            {equityPoints.hasData
              ? `Mark-to-market progression across trading hours • ${trades.length} fills recorded`
              : 'Flat baseline (₹0.00) • 0 fills recorded'}
          </div>

          {/* SVG Line Graph */}
          <div style={{ width: '100%', height: '140px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="equityGradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="equityGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke={equityPoints.hasData ? "rgba(255,255,255,0.08)" : "rgba(100,116,139,0.3)"} strokeDasharray={equityPoints.hasData ? undefined : "4 4"} />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

              {equityPoints.hasData ? (
                <>
                  {equityPoints.areaPath && (
                    <path
                      d={equityPoints.areaPath}
                      fill={totalPnl >= 0 ? "url(#equityGradGreen)" : "url(#equityGradRed)"}
                    />
                  )}
                  <path
                    d={equityPoints.linePath}
                    fill="none"
                    stroke={equityPoints.color}
                    strokeWidth="2.5"
                  />
                  <circle
                    cx={equityPoints.lastX}
                    cy={equityPoints.lastY}
                    r="4"
                    fill={equityPoints.color}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              ) : (
                /* Pure flat zero baseline when no trades / 0 PnL */
                <>
                  <line
                    x1="0"
                    y1="60"
                    x2="500"
                    y2="60"
                    stroke="#475569"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  <text
                    x="250"
                    y="52"
                    fill="#64748b"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="var(--font-mono)"
                  >
                    No Trading Activity (MTM: ₹0.00)
                  </text>
                  <circle cx="500" cy="60" r="3" fill="#64748b" />
                </>
              )}
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
              <span>09:15</span>
              <span>11:00</span>
              <span>12:30</span>
              <span>14:00</span>
              <span>15:30</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Margin & Capital Allocation (Donut Chart) */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={16} color="#06b6d4" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                Margin & Capital Allocation
              </span>
            </div>
            <span className="pill-badge badge-cyan" style={{ fontSize: '0.62rem' }}>
              EXPOSURE {marginUtilizedPct}%
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
            Free margin vs active derivative contract exposure
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px' }}>
            <div style={{ width: '120px', height: '120px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="120" height="120" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="12" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10b981"
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(1, (100 - marginUtilizedPct) * 2.387)} 238.7`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                {utilizedMargin > 0 && (
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="#06b6d4"
                    strokeWidth="12"
                    strokeDasharray={`${Math.max(1, marginUtilizedPct * 2.387)} 238.7`}
                    strokeDashoffset={`-${(100 - marginUtilizedPct) * 2.387}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                )}
              </svg>

              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 600 }}>FREE</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  {100 - marginUtilizedPct}%
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: '#94a3b8' }}>Free Cash:</span>
                <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  ₹{availableBal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06b6d4' }} />
                <span style={{ color: '#94a3b8' }}>Blocked:</span>
                <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                  ₹{utilizedMargin.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)' }} />
                <span style={{ color: '#64748b' }}>SOD Limit:</span>
                <strong style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  ₹{Number(account?.sod_limit || 500000).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 3: Position P&L Breakdown (Bar Graph) */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="#fbbf24" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#ffffff' }}>
                Position P&L Distribution
              </span>
            </div>
            <span className="pill-badge badge-amber" style={{ fontSize: '0.62rem' }}>
              {positions.filter((p) => p.netQty !== 0).length} CONTRACTS
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
            Active contract-wise floating MTM distribution (Bar Graph)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '120px', maxHeight: '140px', overflowY: 'auto' }}>
            {positions.filter((p) => p.netQty !== 0).length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '110px', color: '#64748b', fontSize: '0.76rem', gap: '6px' }}>
                <BarChart2 size={24} style={{ opacity: 0.3 }} />
                <span>No active positions opened yet.</span>
                <span style={{ fontSize: '0.68rem', color: '#06b6d4' }}>Place a trade to see contract P&L bars.</span>
              </div>
            ) : (
              positions.filter((p) => p.netQty !== 0).map((pos) => {
                const posPnl = (pos.realizedProfit || 0) + (pos.unrealizedProfit || 0);
                const isProfit = posPnl >= 0;
                const barWidth = Math.min(100, Math.max(12, Math.round((Math.abs(posPnl) / (Math.abs(totalPnl) || 1000)) * 100)));

                return (
                  <div key={pos.securityId} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        {formatTradingSymbol(pos.tradingSymbol)} ({pos.netQty > 0 ? `+${pos.netQty}` : pos.netQty})
                      </span>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: isProfit ? '#10b981' : '#f43f5e' }}>
                        {isProfit ? '+' : ''}₹{posPnl.toFixed(2)}
                      </span>
                    </div>
                    {/* Horizontal Bar Graphic */}
                    <div style={{ width: '100%', height: '7px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barWidth}%`,
                          height: '100%',
                          background: isProfit ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f43f5e, #e11d48)',
                          borderRadius: '4px',
                          boxShadow: isProfit ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(244, 63, 94, 0.4)',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. Clean Tabbed Trading Desk */}
      <div className="glass-panel-elevated" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        {/* Desk Tab Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setActiveDeskTab('positions')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeDeskTab === 'positions' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: activeDeskTab === 'positions' ? '#06b6d4' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Positions</span>
              <span
                style={{
                  fontSize: '0.64rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: activeDeskTab === 'positions' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeDeskTab === 'positions' ? '#06b6d4' : '#64748b',
                }}
              >
                {positions.filter((p) => p.netQty !== 0).length}
              </span>
            </button>

            <button
              onClick={() => setActiveDeskTab('orders')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeDeskTab === 'orders' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: activeDeskTab === 'orders' ? '#06b6d4' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Order Book</span>
              <span
                style={{
                  fontSize: '0.64rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: activeDeskTab === 'orders' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeDeskTab === 'orders' ? '#06b6d4' : '#64748b',
                }}
              >
                {orders.length}
              </span>
            </button>

            <button
              onClick={() => setActiveDeskTab('trades')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeDeskTab === 'trades' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: activeDeskTab === 'trades' ? '#06b6d4' : '#94a3b8',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Trade Book</span>
              <span
                style={{
                  fontSize: '0.64rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: activeDeskTab === 'trades' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                  color: activeDeskTab === 'trades' ? '#06b6d4' : '#64748b',
                }}
              >
                {trades.length}
              </span>
            </button>
          </div>

          {/* Right Corner Action: Chart & Quick Trade Trigger & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeDeskTab === 'positions' && (
              <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {['open', 'closed', 'all'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setPositionsFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      background: positionsFilter === filter ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      color: positionsFilter === filter ? '#ffffff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            )}

            {/* Right Corner Quick Chart & Trade Button */}
            <button
              id="desk-header-chart-trade-btn"
              onClick={() => {
                setSelectedChartSymbol('NIFTY 50');
                setIsChartModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#06b6d4',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Activity size={13} />
              <span>Chart & Trade</span>
            </button>

            <button
              onClick={fetchData}
              title="Refresh Telemetry"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '5px 8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Tab 1: POSITIONS TABLE */}
        {activeDeskTab === 'positions' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>INSTRUMENT</th>
                  <th>TYPE</th>
                  <th>PRODUCT</th>
                  <th style={{ textAlign: 'right' }}>NET QTY</th>
                  <th style={{ textAlign: 'right' }}>BUY AVG</th>
                  <th style={{ textAlign: 'right' }}>SELL AVG</th>
                  <th style={{ textAlign: 'right' }}>REALIZED</th>
                  <th style={{ textAlign: 'right' }}>UNREALIZED MTM</th>
                  <th style={{ textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Activity size={18} color="#64748b" />
                        </div>
                        <span style={{ fontSize: '0.86rem', color: '#94a3b8' }}>No running positions currently active.</span>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          Click <strong>+ Place Trade</strong> or use the <strong>Chart & Trade</strong> modal to open an order.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((p, idx) => {
                    const isLong = p.netQty > 0;
                    const pnl = p.unrealizedProfit || 0;
                    return (
                      <tr key={idx} id={`pos-row-${p.securityId}`}>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{formatTradingSymbol(p.tradingSymbol)}</td>
                        <td>
                          <span className={isLong ? 'pill-badge badge-emerald' : 'pill-badge badge-rose'}>
                            {p.positionType || (isLong ? 'BUY' : 'SELL')}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{p.productType}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.netQty}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{p.buyAvg?.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{p.sellAvg?.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: p.realizedProfit >= 0 ? '#10b981' : '#f43f5e' }}>
                          ₹{p.realizedProfit?.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: pnl >= 0 ? '#10b981' : '#f43f5e' }}>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {/* Chart modal trigger for this position */}
                            <button
                              onClick={() => {
                                setSelectedChartSymbol(p.tradingSymbol);
                                setIsChartModalOpen(true);
                              }}
                              title="Open real-time interactive chart"
                              style={{
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.35)',
                                color: '#06b6d4',
                                borderRadius: '4px',
                                padding: '3px 7px',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Activity size={11} /> Chart
                            </button>

                            {p.netQty !== 0 ? (
                              <button
                                id={`squareoff-pos-${p.securityId}`}
                                onClick={() => handleSquareOffPosition(p)}
                                style={{
                                  background: 'rgba(244, 63, 94, 0.15)',
                                  border: '1px solid rgba(244, 63, 94, 0.4)',
                                  color: '#f43f5e',
                                  borderRadius: '4px',
                                  padding: '3px 8px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Square Off
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Closed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Positions Table Summary Footer */}
            <div
              style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '24px',
                fontSize: '0.78rem',
                color: '#94a3b8',
                background: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <span>Realized: <strong style={{ color: netRealized >= 0 ? '#10b981' : '#f43f5e' }}>₹{netRealized.toFixed(2)}</strong></span>
              <span>Unrealized Float: <strong style={{ color: netUnrealized >= 0 ? '#10b981' : '#f43f5e' }}>₹{netUnrealized.toFixed(2)}</strong></span>
              <span>Net Day P&L: <strong style={{ color: totalPnl >= 0 ? '#10b981' : '#f43f5e' }}>{totalPnl >= 0 ? '+' : ''}₹{totalPnl.toFixed(2)}</strong></span>
            </div>
          </div>
        )}

        {/* Tab 2: ORDER BOOK TABLE */}
        {activeDeskTab === 'orders' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ORDER ID</th>
                  <th>INSTRUMENT</th>
                  <th>SIDE</th>
                  <th>TYPE</th>
                  <th style={{ textAlign: 'right' }}>QTY</th>
                  <th style={{ textAlign: 'right' }}>PRICE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No orders placed today.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord, idx) => {
                    const isTraded = ord.orderStatus === 'TRADED';
                    const isPending = ord.orderStatus === 'PENDING';
                    return (
                      <tr key={idx}>
                        <td style={{ color: '#64748b', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
                          {ord.createTime ? new Date(ord.createTime).toLocaleTimeString('en-IN') : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>#{ord.orderId}</td>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{formatTradingSymbol(ord.tradingSymbol)}</td>
                        <td>
                          <span className={ord.transactionType === 'BUY' ? 'pill-badge badge-emerald' : 'pill-badge badge-rose'}>
                            {ord.transactionType}
                          </span>
                        </td>
                        <td style={{ color: '#94a3b8' }}>{ord.orderType}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{ord.quantity}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{ord.price?.toFixed(2)}</td>
                        <td>
                          <span
                            className={
                              isTraded
                                ? 'pill-badge badge-emerald'
                                : isPending
                                ? 'pill-badge badge-amber'
                                : 'pill-badge badge-rose'
                            }
                          >
                            {ord.orderStatus}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isPending && (
                            <button
                              onClick={() => handleCancelOrder(ord.orderId)}
                              style={{
                                background: 'rgba(244, 63, 94, 0.15)',
                                border: '1px solid rgba(244, 63, 94, 0.4)',
                                color: '#f43f5e',
                                borderRadius: '4px',
                                padding: '3px 8px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                              }}
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

        {/* Tab 3: TRADE BOOK TABLE */}
        {activeDeskTab === 'trades' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="trading-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>TRADE ID</th>
                  <th>ORDER ID</th>
                  <th>INSTRUMENT</th>
                  <th>SIDE</th>
                  <th style={{ textAlign: 'right' }}>QTY</th>
                  <th style={{ textAlign: 'right' }}>EXEC PRICE</th>
                  <th style={{ textAlign: 'right' }}>TRADE VALUE</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No trade executions recorded yet today.
                    </td>
                  </tr>
                ) : (
                  trades.map((trd, idx) => {
                    const grossValue = (trd.tradedQuantity || 0) * (trd.tradedPrice || 0);
                    return (
                      <tr key={idx}>
                        <td style={{ color: '#64748b', fontSize: '0.74rem', fontFamily: 'var(--font-mono)' }}>
                          {trd.exchangeTime ? new Date(trd.exchangeTime).toLocaleTimeString('en-IN') : '—'}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>#{trd.tradeId}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>#{trd.orderId}</td>
                        <td style={{ fontWeight: 700, color: '#ffffff' }}>{formatTradingSymbol(trd.tradingSymbol)}</td>
                        <td>
                          <span className={trd.transactionType === 'BUY' ? 'pill-badge badge-emerald' : 'pill-badge badge-rose'}>
                            {trd.transactionType}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{trd.tradedQuantity}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{trd.tradedPrice?.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                          ₹{grossValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* 1. Quick Order Placement Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        onSubmit={handlePlaceOrder}
        defaultIndex={orderModalParams.index}
        defaultSymbol={orderModalParams.symbol}
        defaultStrike={orderModalParams.strike}
        defaultSide={orderModalParams.side}
        availableBalance={availableBal}
      />

      {/* 2. Interactive Real-Time Chart & Trade Modal */}
      <QuickChartTradeModal
        isOpen={isChartModalOpen}
        onClose={() => setIsChartModalOpen(false)}
        initialSymbol={selectedChartSymbol}
        ticks={ticks}
        account={account}
        addToast={addToast}
        onOrderSuccess={fetchData}
      />

      {/* 3. Margin Deposit Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        title="Add Virtual Trading Margin"
        confirmText="Confirm Deposit"
        onConfirm={handleDepositConfirm}
        onCancel={() => setIsDepositModalOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
            DEPOSIT AMOUNT (INR)
          </label>
          <input
            id="deposit-margin-input"
            type="number"
            step="10000"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            style={{
              width: '100%',
              background: '#06080c',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
            }}
          />
          <p style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
            Adds virtual funds directly to your sandbox ledger for risk-free algorithm simulation.
          </p>
        </div>
      </Modal>

      {/* 4. Emergency Kill Switch Modal */}
      <Modal
        isOpen={isKillSwitchModalOpen}
        title={killSwitchActive ? 'Deactivate Kill Switch & Unlock Trading?' : '🚨 Activate Emergency Kill Switch?'}
        message={
          killSwitchActive
            ? 'Deactivating the Kill Switch will restore order placement abilities for this terminal and MARMOT algorithms.'
            : '⚠️ CRITICAL SAFETY BREAKER:\nActivating will immediately:\n1. Cancel ALL active/pending orders.\n2. Square off ALL open derivative positions at market LTP.\n3. Lock this trading account against incoming orders.\n\nProceed?'
        }
        confirmText={killSwitchActive ? (killSwitchLoading ? 'Unlocking...' : 'Unlock Trading') : (killSwitchLoading ? 'Activating...' : 'ACTIVATE KILL SWITCH')}
        isDanger={!killSwitchActive}
        onConfirm={handleToggleKillSwitch}
        onCancel={() => setIsKillSwitchModalOpen(false)}
      />

      {/* 5. Reset Ledger Modal */}
      <Modal
        isOpen={isResetConfirmOpen}
        title="Reset Virtual Sandbox Ledger?"
        message="This will reset your account balance back to the start-of-day ₹5,00,000 baseline and clear all positions and orders. Are you sure?"
        confirmText="Confirm Reset"
        isDanger={true}
        onConfirm={handleResetLedger}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

    </div>
  );
}
