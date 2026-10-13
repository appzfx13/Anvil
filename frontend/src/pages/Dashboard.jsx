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
  XCircle,
  Radio,
  Zap,
  Sliders,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  Activity,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import OrderModal from '../components/OrderModal';
import OptionChainModal from '../components/OptionChainModal';
import DataFeedModal from '../components/DataFeedModal';
import TokenSuccessModal from '../components/TokenSuccessModal';

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
  const [positionsFilter, setPositionsFilter] = useState('open'); // open | closed | all
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);

  // Live Clock
  const [currentTime, setCurrentTime] = useState('');

  // Kill Switch state
  const [killSwitchActive, setKillSwitchActive] = useState(user?.kill_switch_active || false);
  const [isKillSwitchModalOpen, setIsKillSwitchModalOpen] = useState(false);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  // Inlined Option Chain State
  const [chainIndex, setChainIndex] = useState('NIFTY50');
  const [chainData, setChainData] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);

  // Modals state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOptionChainModalOpen, setIsOptionChainModalOpen] = useState(false);
  const [isAdjustFundsOpen, setIsAdjustFundsOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isCancelOrderConfirmOpen, setIsCancelOrderConfirmOpen] = useState(false);
  const [selectedOrderToCancel, setSelectedOrderToCancel] = useState(null);
  const [isDataFeedModalOpen, setIsDataFeedModalOpen] = useState(false);
  const [isTokenSuccessModalOpen, setIsTokenSuccessModalOpen] = useState(false);
  const [siteConfig, setSiteConfig] = useState(null);
  const [hasFeedToken, setHasFeedToken] = useState(false);

  // Selected contract state for OrderModal
  const [orderModalParams, setOrderModalParams] = useState({
    index: 'NIFTY50',
    symbol: '',
    strike: null,
    side: 'BUY',
  });

  const [fundAdjustmentAmount, setFundAdjustmentAmount] = useState('100000');
  const [copiedKey, setCopiedKey] = useState('');

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

  // Fetch Option Chain
  const fetchOptionChain = async (idxKey) => {
    setChainLoading(true);
    try {
      const res = await api.dhan.getOptionChain(idxKey);
      if (res) {
        setChainData(res);
      }
    } catch (err) {
      console.error('Failed to load inlined option chain:', err);
    } finally {
      setChainLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionChain(chainIndex);
    const chainInterval = setInterval(() => {
      fetchOptionChain(chainIndex);
    }, 4000);
    return () => clearInterval(chainInterval);
  }, [chainIndex]);

  // Check Site Configuration Table for Fyers Data Feed Token
  const checkFeedConfig = async () => {
    try {
      const cfg = await api.fyers.getConfig();
      if (cfg) {
        setSiteConfig(cfg);
        setHasFeedToken(cfg.has_token);
      }
    } catch (e) {}
  };

  // Fetch telemetry data
  const fetchData = async () => {
    try {
      const [posData, ordData, trdData, ksData] = await Promise.all([
        api.dhan.getPositions().catch(() => []),
        api.dhan.getOrders().catch(() => []),
        api.dhan.getTrades().catch(() => []),
        api.dhan.getKillSwitch().catch(() => ({ killSwitchActive: false })),
      ]);
      setPositions(posData);
      setOrders(ordData);
      setTrades(trdData);
      if (ksData && typeof ksData.killSwitchActive === 'boolean') {
        setKillSwitchActive(ksData.killSwitchActive);
      }
    } catch (err) {
      console.error('Failed to update telemetry:', err);
    }
  };

  useEffect(() => {
    checkFeedConfig();
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute Net P&L metrics
  const netRealized = positions.reduce((acc, p) => acc + (p.realizedProfit || 0), 0);
  const netUnrealized = positions.reduce((acc, p) => acc + (p.unrealizedProfit || 0), 0);
  const totalPnl = netRealized + netUnrealized;
  const pendingCount = orders.filter((o) => o.orderStatus === 'PENDING').length;
  const tradedCount = orders.filter((o) => o.orderStatus === 'TRADED').length;

  const filteredPositions = positions.filter((p) => {
    if (positionsFilter === 'open') return p.netQty !== 0;
    if (positionsFilter === 'closed') return p.netQty === 0;
    return true;
  });

  // Handle Order Placement
  const handlePlaceOrder = async (orderPayload) => {
    if (killSwitchActive) {
      addToast('error', 'Trading is locked: Kill Switch is active on your account.');
      return;
    }
    try {
      const res = await api.dhan.placeOrder(orderPayload);
      setIsOrderModalOpen(false);
      addToast('success', `Order ${res.orderId} executed [${res.orderStatus}]`);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Order execution failed.');
    }
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

  // Handle Reset Ledger
  const handleResetLedger = async () => {
    try {
      await api.account.resetLedger();
      addToast('success', 'Sandbox session reset to initial SOD limit (₹5,00,000).');
      setIsResetConfirmOpen(false);
      fetchData();
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Reset failed.');
    }
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
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8500';

  // Nifty Spot Data
  const niftySpot = ticks['NIFTY50']?.ltp || 22504.65;
  const niftyCh = ticks['NIFTY50']?.ch || 141.20;
  const niftyChp = ticks['NIFTY50']?.chp || 0.62;

  return (
    <div id="sandbox-terminal-page" style={{ padding: '24px 32px', color: '#f8fafc' }}>
      {/* 1. Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Sandbox Terminal
            </h1>
            <span className="pill-badge badge-cyan">● SANDBOX TERMINAL</span>
            <span className="pill-badge badge-emerald">LIVE SIMULATION (FYERS FEED)</span>
            <span className="pill-badge badge-cyan">PAPER TRADING • ZERO RISK</span>
            <span className="pill-badge badge-purple">1S BACKUP SCHEDULER: ARMED</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Risk-free live market strategy simulation powered by real-time Fyers tick data and virtual ledger execution.
          </p>
        </div>

        {/* Top Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="pill-badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.74rem' }}>
            ● Trade Eligible
          </div>

          <button
            id="header-configure-anvil-btn"
            onClick={onOpenMarmotConfig}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              color: '#fbbf24',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Sliders size={14} /> Configure ANVIL
          </button>

          <button
            id="header-clear-session-btn"
            onClick={() => setIsResetConfirmOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#f43f5e',
              borderRadius: '8px',
              padding: '7px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear Session
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              borderRadius: '8px',
              padding: '7px 12px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Deployments <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* 2. Clock & Telemetry Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {/* Clock Card */}
        <div className="glass-panel" style={{ padding: '16px 18px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} color="#10b981" />
              </div>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
                {currentTime || '11:07:15'} <span style={{ fontSize: '0.85rem' }}>IST</span>
              </span>
            </div>
            <span className="pill-badge badge-amber" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>1s</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '8px' }}>
            13 Oct 2026 • NSE/BSE Exchange Zone
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>Market Open</span>
            <span style={{ color: '#94a3b8' }}>Square-off: 15:15 IST</span>
          </div>
        </div>

        {/* NIFTY 50 Spot Card */}
        <div className="glass-panel" style={{ padding: '16px 18px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>NIFTY 50 - NSE</span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>LIVE TICK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              ₹{niftySpot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 600 }}>
              +{niftyChp.toFixed(2)}%
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
            Range: H: 22,760.45 • L: 22,481.10
          </div>
          <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
            + {niftyCh.toFixed(2)} (pts)
          </div>
        </div>

        {/* Macro AI Regime Card */}
        <div className="glass-panel" style={{ padding: '16px 18px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>MACRO AI REGIME</span>
            <span className="pill-badge badge-amber" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>gemini-2.5-flash-lite</span>
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            RANGEBOUND CONSOLIDATION
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3, marginBottom: '6px' }}>
            Nifty is oscillating within a tight 24,900-25,200 band as IV remains compressed, suggesting a lack of dire...
          </div>
          <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
            Conviction: +0.72
          </div>
        </div>

        {/* Institutional Flow Bias Card */}
        <div className="glass-panel" style={{ padding: '16px 18px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>INSTITUTIONAL FLOW BIAS</span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>FII / DII Flow</span>
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            NET INSTITUTIONAL DISTRIBUTION
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3, marginBottom: '6px' }}>
            FIIs continue to trim index long exposure while DIIs provide selective support, leading to a net selling bias...
          </div>
          <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 600 }}>
            Bias Score: -0.42
          </div>
        </div>

        {/* Global & Event Risk Card */}
        <div className="glass-panel" style={{ padding: '16px 18px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>GLOBAL & EVENT RISK</span>
            <span className="pill-badge badge-rose" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>ELEVATED RISK</span>
          </div>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '4px' }}>
            NEUTRAL GLOBAL CUES
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3, marginBottom: '6px' }}>
            Mixed signals from US bond yields and stagnant Asian markets provide no clear directional catalyst for th...
          </div>
          <div style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>
            Score: +0.06 • Guard Active
          </div>
        </div>
      </div>

      {/* 3. Live Feed Sandbox Engine Gateway Status Bar */}
      <div className="gateway-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.92rem' }}>Live Feed Sandbox Engine (ANVIL)</span>
              <span className="pill-badge badge-emerald" style={{ fontSize: '0.64rem' }}>LIVE FYERS STREAM</span>
              <span className="pill-badge badge-cyan" style={{ fontSize: '0.64rem' }}>ANVIL GATEWAY (1, ISOLATED)</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
              Gateway: <span style={{ color: '#94a3b8' }}>{baseUrl}</span> • Client ID: <span style={{ color: '#ffffff' }}>{clientId}</span> • Balance: <span style={{ color: '#10b981' }}>₹{Number(account?.available_balance || 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> • Engine Latency: <span style={{ color: '#38bdf8' }}>0ms</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onOpenMarmotConfig}
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#10b981',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Configure ANVIL
          </button>

          <button
            onClick={() => {
              fetchData();
              if (onRefreshAccount) onRefreshAccount();
              addToast('success', 'Virtual balance synced with Dhan wire ledger.');
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sync Balance
          </button>

          <span className="pill-badge badge-cyan" style={{ fontSize: '0.68rem', padding: '4px 8px' }}>
            Zero Real-Money Risk
          </span>
        </div>
      </div>

      {/* 4. Primary Telemetry Cards (4-Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '14px' }}>
        {/* Card 1: ANVIL Sandbox Online */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.04em' }}>
              ● ANVIL Sandbox Online
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
              ANVIL • ID: {clientId}
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            Realtime Stream • {positions.length} Open
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <span style={{ color: '#38bdf8', cursor: 'pointer' }} onClick={() => addToast('info', 'Active account: ' + clientId)}>
              Accounts →
            </span>
            <span style={{ color: '#94a3b8', cursor: 'pointer' }} onClick={onOpenMarmotConfig}>
              ⚙ Configure
            </span>
          </div>
        </div>

        {/* Card 2: Live Net P&L */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              Live Net P&L
            </span>
            <span className="pill-badge badge-emerald" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
              Live Synced
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
            Intraday Realtime Return
          </div>
          <div
            style={{
              fontSize: '1.55rem',
              fontWeight: 800,
              color: totalPnl >= 0 ? '#10b981' : '#f43f5e',
              fontFamily: 'var(--font-mono)',
              marginBottom: '6px',
            }}
          >
            {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ color: '#10b981' }}>✓ {positions.length} Active Pos</span>
            <span>{orders.length} Orders</span>
          </div>
        </div>

        {/* Card 3: Available Margin */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
              Available Margin
            </span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
            Power Fund: + Cash: ₹{Number(account?.available_balance || 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
            ₹{Number(account?.available_balance || 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span style={{ color: '#38bdf8' }}>✓ Armed & Synced</span>
            <span>Trading Power</span>
          </div>
        </div>

        {/* Card 4: Account Guardian */}
        <div className="glass-panel" style={{ padding: '18px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: '#f43f5e', fontWeight: 700, letterSpacing: '0.04em' }}>
              ● Account Guardian
            </span>
            <span className="pill-badge badge-rose" style={{ fontSize: '0.64rem', padding: '1px 6px' }}>
              2-Tier Active
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '2px' }}>
            Gate: Enabled
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: killSwitchActive ? '#f43f5e' : '#ffffff' }}>
              {killSwitchActive ? 'Circuit Breaker Active' : 'Normal Arm'}
            </span>
            <button
              onClick={() => setIsKillSwitchModalOpen(true)}
              style={{
                background: killSwitchActive ? '#10b981' : '#f43f5e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {killSwitchActive ? 'Unlock' : '⚡ Kill'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
            <span>Circuit Gate Protected</span>
            <span style={{ color: '#10b981' }}>L1/L2 Active</span>
          </div>
        </div>
      </div>

      {/* 5. Secondary Metrics (4-Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        {/* Realized P&L */}
        <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(11, 14, 21, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Realized P&L</span>
            <span className="pill-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.62rem' }}>0 Closed</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Booked & Settled Performance</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: netRealized >= 0 ? '#10b981' : '#f43f5e', margin: '4px 0' }}>
            {netRealized >= 0 ? '+' : ''}₹{netRealized.toFixed(2)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>✓ Settled</span>
            <span style={{ color: '#10b981' }}>Confirmed</span>
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(11, 14, 21, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Unrealized P&L</span>
            <span className="pill-badge" style={{ background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', fontSize: '0.62rem' }}>{positions.length} Open</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Mark-to-Market Realtime Float</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: netUnrealized >= 0 ? '#10b981' : '#f43f5e', margin: '4px 0' }}>
            {netUnrealized >= 0 ? '+' : ''}₹{netUnrealized.toFixed(2)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>~ MTM Float</span>
            <span style={{ color: '#38bdf8' }}>0 Running</span>
          </div>
        </div>

        {/* Margin Utilized */}
        <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(11, 14, 21, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Margin Utilized</span>
            <span className="pill-badge badge-amber" style={{ fontSize: '0.62rem' }}>Active Exposure</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Collateral ₹0.00</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff', margin: '4px 0' }}>
            ₹{Number(account?.utilized_margin || 0).toFixed(2)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>Capital in Use</span>
            <span style={{ color: '#94a3b8' }}>Exposure Ratio: 0%</span>
          </div>
        </div>

        {/* Day Orders */}
        <div className="glass-panel" style={{ padding: '14px 18px', background: 'rgba(11, 14, 21, 0.7)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>Day Orders</span>
            <span className="pill-badge badge-cyan" style={{ fontSize: '0.62rem' }}>{orders.length} Fills</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Pending: {pendingCount}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#ffffff', margin: '4px 0' }}>
            {orders.length} Orders
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
            <span>✓ Traded: {tradedCount}</span>
            <span style={{ color: '#f43f5e' }}>Pending: {pendingCount}</span>
          </div>
        </div>
      </div>

      {/* 6. Open & Running Positions Table (Screenshot 1 Bottom) */}
      <div className="glass-panel-elevated" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        {/* Table Header Bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#10b981" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.94rem', color: '#ffffff' }}>Open & Running Positions</span>
                <span className="pill-badge badge-emerald" style={{ fontSize: '0.64rem' }}>{positions.length} ACTIVE POSITIONS</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Real-time MTM telemetry, live contract prices, and instant risk exit controls
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>FILTER POSITIONS:</span>
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {['open', 'closed', 'all'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPositionsFilter(tab)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: positionsFilter === tab ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: positionsFilter === tab ? '#ffffff' : '#94a3b8',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              id="open-manual-order-btn"
              onClick={() => {
                setOrderModalParams({ index: 'NIFTY50', symbol: '', strike: null, side: 'BUY' });
                setIsOrderModalOpen(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <PlusCircle size={14} /> Place Trade
            </button>
          </div>
        </div>

        {/* Positions Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="trading-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>INSTRUMENT</th>
                <th>SIDE</th>
                <th>PRODUCT</th>
                <th style={{ textAlign: 'right' }}>NET QTY</th>
                <th style={{ textAlign: 'right' }}>BUY AVG</th>
                <th style={{ textAlign: 'right' }}>SELL AVG</th>
                <th style={{ textAlign: 'right' }}>REALIZED</th>
                <th style={{ textAlign: 'right' }}>UNREALIZED MTM</th>
                <th style={{ textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '0.84rem' }}>
                    No running positions currently active in sandbox ledger. Select a strike below to execute.
                  </td>
                </tr>
              ) : (
                filteredPositions.map((p, idx) => {
                  const isLong = p.netQty > 0;
                  const pnl = p.unrealizedProfit || 0;
                  return (
                    <tr key={idx} id={`pos-row-${p.securityId}`}>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>{p.tradingSymbol}</td>
                      <td>
                        <span className={isLong ? 'pill-badge badge-emerald' : 'pill-badge badge-rose'}>
                          {p.positionType}
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
                      <td style={{ textAlign: 'right' }}>
                        {p.netQty !== 0 && (
                          <button
                            id={`squareoff-pos-${p.securityId}`}
                            onClick={() => handleSquareOffPosition(p)}
                            style={{
                              background: 'rgba(244, 63, 94, 0.15)',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              color: '#f43f5e',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
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

        {/* Positions Summary Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20px', fontSize: '0.76rem', color: '#94a3b8', background: 'rgba(0, 0, 0, 0.2)' }}>
          <span>Realized: <strong style={{ color: netRealized >= 0 ? '#10b981' : '#f43f5e' }}>₹{netRealized.toFixed(2)}</strong></span>
          <span>Unrealized: <strong style={{ color: netUnrealized >= 0 ? '#10b981' : '#f43f5e' }}>₹{netUnrealized.toFixed(2)}</strong></span>
          <span>Net P&L: <strong style={{ color: totalPnl >= 0 ? '#10b981' : '#f43f5e' }}>{totalPnl >= 0 ? '+' : ''}₹{totalPnl.toFixed(2)}</strong></span>
          <RefreshCw size={13} style={{ cursor: 'pointer' }} onClick={fetchData} />
        </div>
      </div>

      {/* 7. Active Strategy Banner (Screenshot 2 Top) */}
      <div
        className="glass-panel"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderLeft: '4px solid #10b981',
          background: 'rgba(11, 14, 21, 0.95)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ffffff' }}>
            Live NIFTY ICT Liquidity Sweep + CHoCH Retest #BT-0024
          </span>
          <span className="pill-badge badge-cyan" style={{ fontSize: '0.62rem' }}>NIFTY</span>
          <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem' }}>SANDBOX</span>
          <span className="pill-badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0', fontSize: '0.62rem' }}>
            MOMENTUM_STOCK_CROSSOVER
          </span>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>#1000000001</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="pill-badge badge-emerald" style={{ fontSize: '0.64rem' }}>ARMED (ON)</span>
          <button style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', borderRadius: '4px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
            Pause
          </button>
          <button style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: '#f43f5e', borderRadius: '4px', padding: '3px 8px', fontSize: '0.72rem', cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      </div>

      {/* 8. Embedded Live Option Chain Matrix (Screenshot 2 Center) */}
      <div className="glass-panel-elevated" style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
        {/* Option Chain Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={15} color="#818cf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#ffffff' }}>
                  {chainIndex === 'NIFTY50' ? 'NIFTY 50' : chainIndex} Option Chain
                </span>
                <span className="pill-badge badge-emerald" style={{ fontSize: '0.64rem' }}>FYERS LIVE</span>
                <span className="pill-badge badge-cyan" style={{ fontSize: '0.64rem' }}>1s TICK STREAM</span>
                <span className="pill-badge badge-amber" style={{ fontSize: '0.64rem' }}>EXPIRY: 15 OCT 2026</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                15 Strikes Active Window • Real-time ATM Postmap • 100% Live Exchange Contracts
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>BACKUP INDEX:</span>
            <select
              value={chainIndex}
              onChange={(e) => setChainIndex(e.target.value)}
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                outline: 'none',
              }}
            >
              <option value="NIFTY50">Nifty 50</option>
              <option value="BANKNIFTY">Bank Nifty</option>
              <option value="FINNIFTY">Fin Nifty</option>
            </select>

            <button
              onClick={() => fetchOptionChain(chainIndex)}
              disabled={chainLoading}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={13} className={chainLoading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Spot Banner Strip */}
        <div style={{ padding: '8px 20px', background: 'rgba(0, 0, 0, 0.35)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span>SPOT - {chainIndex}: <strong style={{ color: '#ffffff', fontFamily: 'var(--font-mono)' }}>₹{chainData?.spot_price?.toFixed(2) || niftySpot.toFixed(2)}</strong> <span style={{ color: '#10b981' }}>+140.70</span></span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>DAY RANGE: H: 22,631.15  L: 22,481.10</span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>PCR: <strong style={{ color: '#10b981' }}>1.2</strong></span>
            <span style={{ color: '#64748b' }}>•</span>
            <span style={{ color: '#94a3b8' }}>VIX: <strong style={{ color: '#fbbf24' }}>14.54</strong></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="pill-badge" style={{ background: '#eab308', color: '#000', fontWeight: 800, fontSize: '0.68rem' }}>
              ATM: {chainData?.atm_strike || 22500}
            </span>
          </div>
        </div>

        {/* Dual Call/Put Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="trading-table" style={{ width: '100%', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                <th colSpan="2" style={{ textAlign: 'center', color: '#10b981', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  CALLS (CE) • BULLISH
                </th>
                <th style={{ textAlign: 'center', color: '#f8fafc', background: 'rgba(255, 255, 255, 0.03)' }}>
                  STRIKE
                </th>
                <th colSpan="2" style={{ textAlign: 'center', color: '#f43f5e', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  PUTS (PE) • BEARISH
                </th>
              </tr>
              <tr style={{ fontSize: '0.7rem' }}>
                <th style={{ width: '22%' }}>OI (CONTRACTS)</th>
                <th style={{ width: '23%', textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>LTP & CHG</th>
                <th style={{ width: '10%', textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)' }}>STRIKE PRICE</th>
                <th style={{ width: '23%', textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>LTP & CHG</th>
                <th style={{ width: '22%', textAlign: 'right' }}>OI (CONTRACTS)</th>
              </tr>
            </thead>
            <tbody>
              {chainData?.strikes?.slice(0, 15).map((row) => {
                const isAtm = row.is_atm;
                const call = row.call;
                const put = row.put;
                return (
                  <tr
                    key={row.strike_price}
                    style={{
                      background: isAtm ? 'rgba(234, 179, 8, 0.08)' : 'transparent',
                      outline: isAtm ? '1px solid #eab308' : 'none',
                    }}
                  >
                    {/* Call OI */}
                    <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {call.oi ? call.oi.toLocaleString('en-IN') : '—'}
                    </td>

                    {/* Call LTP & Buy Button */}
                    <td style={{ textAlign: 'right', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                          ₹{call.ltp?.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: call.ch >= 0 ? '#10b981' : '#f43f5e' }}>
                          {call.ch >= 0 ? '+' : ''}{call.ch?.toFixed(1)}
                        </span>
                        <button
                          onClick={() => {
                            setOrderModalParams({
                              index: chainIndex,
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
                            padding: '2px 6px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          BUY
                        </button>
                      </div>
                    </td>

                    {/* Strike Price */}
                    <td
                      style={{
                        textAlign: 'center',
                        fontWeight: 800,
                        color: isAtm ? '#eab308' : '#ffffff',
                        background: isAtm ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {row.strike_price} {isAtm && <span style={{ fontSize: '0.6rem', color: '#eab308' }}>ATM</span>}
                    </td>

                    {/* Put LTP & Buy Button */}
                    <td style={{ textAlign: 'left', borderLeft: '1px solid rgba(255, 255, 255, 0.08)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setOrderModalParams({
                              index: chainIndex,
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
                            padding: '2px 6px',
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          BUY
                        </button>
                        <span style={{ fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                          ₹{put.ltp?.toFixed(2)}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: put.ch >= 0 ? '#10b981' : '#f43f5e' }}>
                          {put.ch >= 0 ? '+' : ''}{put.ch?.toFixed(1)}
                        </span>
                      </div>
                    </td>

                    {/* Put OI */}
                    <td style={{ textAlign: 'right', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {put.oi ? put.oi.toLocaleString('en-IN') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 9. Charts Row (Screenshot 2 Bottom: Intraday Equity Curve + Distribution Graph) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Intraday Equity Curve */}
        <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#10b981" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Intraday Equity Curve</span>
            </div>
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#10b981', fontSize: '0.95rem' }}>
              +₹{totalPnl.toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
            Real-time P&L progression (09:15 - 15:30 IST) • {trades.length > 0 ? `${trades.length} fills recorded` : 'No Trades Today'}
          </div>

          {/* SVG Chart */}
          <div style={{ width: '100%', height: '140px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.08)" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
              {/* Baseline Curve */}
              <path
                d="M 0 60 Q 150 55, 300 62 T 500 60"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
              <path
                d="M 0 60 Q 150 55, 300 62 T 500 60 L 500 120 L 0 120 Z"
                fill="url(#equityGrad)"
              />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b', marginTop: '4px' }}>
              <span>09:15</span>
              <span>11:30</span>
              <span>13:45</span>
              <span>15:30</span>
            </div>
          </div>
        </div>

        {/* Position P&L Distribution Graph */}
        <div className="glass-panel" style={{ padding: '16px 20px', background: 'rgba(11, 14, 21, 0.95)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#38bdf8" />
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Position P&L Distribution Graph</span>
              <span className="pill-badge badge-emerald" style={{ fontSize: '0.6rem' }}>LIVE MTM</span>
            </div>
            <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8', fontSize: '0.95rem' }}>
              +₹0.00
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '14px' }}>
            Contract-level Mark-to-Market & Realized P&L distribution across active and settled instruments
          </div>

          <div style={{ width: '100%', height: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', gap: '20px', fontSize: '0.74rem', color: '#94a3b8' }}>
              <span>ACTIVE CONTRACTS: <strong style={{ color: '#ffffff' }}>{positions.length} OPEN</strong></span>
              <span>SETTLED: <strong style={{ color: '#ffffff' }}>0 CLOSED</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '14px', marginTop: '10px', fontSize: '0.7rem' }}>
              <span className="pill-badge badge-emerald" style={{ fontSize: '0.62rem' }}>Profit: Green</span>
              <span className="pill-badge badge-rose" style={{ fontSize: '0.62rem' }}>Loss: Red</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* 1. Order Placement Modal */}
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

      {/* 2. Reset Ledger Modal */}
      <Modal
        isOpen={isResetConfirmOpen}
        title="Reset Virtual Sandbox Ledger?"
        message="This will reset your account balance back to the initial Start-of-Day limit (₹5,00,000) and clear all active positions and orders. Are you sure?"
        confirmText="Confirm Reset"
        isDanger={true}
        onConfirm={handleResetLedger}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* 3. Emergency Kill Switch Modal */}
      <Modal
        isOpen={isKillSwitchModalOpen}
        title={killSwitchActive ? "Deactivate Kill Switch & Unlock Trading?" : "🚨 Activate Emergency Kill Switch?"}
        message={
          killSwitchActive
            ? "Are you sure you want to deactivate the Kill Switch? This will unlock order placement for MARMOT and this terminal."
            : "⚠️ CRITICAL WARNING: Activating the Kill Switch will immediately:\n1. Cancel ALL pending orders in your order book.\n2. Square off ALL open derivative positions at prevailing market price.\n3. Lock your account against any new incoming orders from MARMOT or this terminal.\n\nDo you want to proceed?"
        }
        confirmText={killSwitchActive ? (killSwitchLoading ? "Unlocking..." : "Unlock Trading") : (killSwitchLoading ? "Activating..." : "ACTIVATE KILL SWITCH")}
        isDanger={!killSwitchActive}
        onConfirm={handleToggleKillSwitch}
        onCancel={() => setIsKillSwitchModalOpen(false)}
      />
    </div>
  );
}
