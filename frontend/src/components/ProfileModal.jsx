import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Zap,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  RotateCcw,
  PlusCircle,
  ExternalLink,
  Users,
  Settings,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { api } from '../services/api';

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  account,
  addToast,
  onRefreshSession,
  onSwitchUser,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'ledger' | 'marmot' | 'admin'
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [depositAmount, setDepositAmount] = useState('100000');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  if (!isOpen || !user) return null;

  const isAdmin = Boolean(user.is_staff || user.is_superuser);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8500';
  const clientId = user.dhan_client_id || '1000000001';
  const clientSecret = user.client_secret || 'sec_anvil_live_sandbox_secret';
  const accessToken = user.access_token || 'dhn_sec_sandbox_token';
  const availableBalance = Number(account?.available_balance ?? 500000);
  const utilizedMargin = Number(account?.utilized_margin ?? 0);
  const sodLimit = Number(account?.sod_limit ?? 500000);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // 1-Click Key Regeneration
  const handleRegenerateKeys = async () => {
    if (!window.confirm('Are you sure you want to regenerate your sandbox access token and secret? Connected bots must be updated with the new token.')) {
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await api.auth.resetCredentials();
      addToast('success', 'Sandbox Access Token and Client Secret regenerated!');
      if (onRefreshSession) onRefreshSession();
    } catch (err) {
      addToast('error', err.message || 'Failed to regenerate credentials.');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Add Virtual Funds
  const handleAddFunds = async (amtToAdd) => {
    const amt = parseFloat(amtToAdd || depositAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      addToast('error', 'Please enter a valid deposit amount.');
      return;
    }
    setIsDepositing(true);
    try {
      await api.account.adjustFunds(amt, 'Virtual Sandbox Top-up');
      addToast('success', `Added ₹${amt.toLocaleString('en-IN')} to virtual ledger.`);
      if (onRefreshSession) onRefreshSession();
    } catch (err) {
      addToast('error', err.message || 'Deposit failed.');
    } finally {
      setIsDepositing(false);
    }
  };

  // Reset Ledger
  const handleResetLedger = async () => {
    if (!window.confirm('Reset virtual ledger to the default ₹5,00,000.00 SOD balance?')) {
      return;
    }
    setIsResetting(true);
    try {
      await api.account.resetLedger();
      addToast('success', 'Virtual ledger balance reset to ₹5,00,000.00');
      if (onRefreshSession) onRefreshSession();
    } catch (err) {
      addToast('error', err.message || 'Failed to reset ledger.');
    } finally {
      setIsResetting(false);
    }
  };

  // Emergency Kill Switch Toggle
  const handleToggleKillSwitch = async () => {
    setKillSwitchLoading(true);
    try {
      if (user.kill_switch_active) {
        await api.dhan.deactivateKillSwitch();
        addToast('success', 'Emergency Circuit Breaker deactivated. Trading unlocked.');
      } else {
        await api.dhan.activateKillSwitch();
        addToast('error', 'EMERGENCY KILL SWITCH ACTIVATED! All pending orders cancelled.');
      }
      if (onRefreshSession) onRefreshSession();
    } catch (err) {
      addToast('error', err.message || 'Failed to toggle kill switch.');
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const marmotEnvSnippet = `# Marmot Trading Bot Configuration
DHAN_CLIENT_ID=${clientId}
DHAN_ACCESS_TOKEN=${accessToken}
DHAN_CLIENT_SECRET=${clientSecret}
DHAN_API_BASE_URL=${baseUrl}
DHAN_ENV=sandbox`;

  const pythonSnippet = `from dhanhq import dhanhq

# Initialize DhanHQ Client connected to ANVIL
dhan = dhanhq(
    client_id="${clientId}",
    access_token="${accessToken}"
)
dhan.base_url = "${baseUrl}"

# Query Sandbox Funds
funds = dhan.get_fund_limits()
print("Available Virtual Margin:", funds)`;

  return (
    <div id="profile-modal-overlay" className="modal-overlay" onClick={onClose}>
      <div
        id="profile-modal-box"
        className="modal-box"
        style={{
          maxWidth: '760px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          background: 'linear-gradient(180deg, #090c13 0%, #06080c 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(0, 210, 255, 0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Banner with Identity */}
        <div
          style={{
            padding: '24px 28px',
            background: 'linear-gradient(135deg, rgba(14, 20, 32, 0.95) 0%, rgba(9, 13, 22, 0.95) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: isAdmin
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: isAdmin
                  ? '0 0 20px rgba(124, 58, 237, 0.4)'
                  : '0 0 20px rgba(16, 185, 129, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : (isAdmin ? 'S' : 'T')}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {user.full_name || (isAdmin ? 'Super Admin' : 'Sandbox Trader')}
                </h3>
                <span
                  className={isAdmin ? 'badge-purple' : 'badge-emerald'}
                  style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}
                >
                  {isAdmin ? 'SUPER ADMIN' : 'PRO TRADER'}
                </span>
                <span className="badge-cyan" style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '999px' }}>
                  DHAN V2 WIRE
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.78rem', color: '#94a3b8' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>{user.email}</span>
                <span>•</span>
                <span>Client ID: <strong style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{clientId}</strong></span>
                <span>•</span>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Sandbox Verified
                </span>
              </div>
            </div>
          </div>

          <button
            id="close-profile-modal-btn"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '6px',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            padding: '0 24px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            gap: '8px',
          }}
        >
          <button
            onClick={() => setActiveTab('credentials')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'credentials' ? '2px solid #38bdf8' : '2px solid transparent',
              color: activeTab === 'credentials' ? '#ffffff' : '#94a3b8',
              fontWeight: activeTab === 'credentials' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <KeyRound size={14} color={activeTab === 'credentials' ? '#38bdf8' : '#94a3b8'} />
            <span>Broker Credentials</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'ledger' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'ledger' ? '#ffffff' : '#94a3b8',
              fontWeight: activeTab === 'ledger' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Wallet size={14} color={activeTab === 'ledger' ? '#10b981' : '#94a3b8'} />
            <span>Virtual Capital & Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('marmot')}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'marmot' ? '2px solid #fbbf24' : '2px solid transparent',
              color: activeTab === 'marmot' ? '#ffffff' : '#94a3b8',
              fontWeight: activeTab === 'marmot' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Terminal size={14} color={activeTab === 'marmot' ? '#fbbf24' : '#94a3b8'} />
            <span>Marmot Integration</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'admin' ? '2px solid #a855f7' : '2px solid transparent',
                color: activeTab === 'admin' ? '#ffffff' : '#94a3b8',
                fontWeight: activeTab === 'admin' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} color={activeTab === 'admin' ? '#a855f7' : '#94a3b8'} />
              <span>Admin Console</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* TAB 1: BROKER CREDENTIALS */}
          {activeTab === 'credentials' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Dhan v2 Wire Sandbox API Keys
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Use these credentials in your headers (`client-id` and `access-token`) to interact with ANVIL exactly like the live Dhan broker.
                </p>
              </div>

              {/* 1. Dhan Client ID */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                  DHAN CLIENT ID (APP ID)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={clientId}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(clientId, 'client_id')}
                    className="btn-secondary"
                    style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedKey === 'client_id' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedKey === 'client_id' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* 2. Client Secret */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                  CLIENT SECRET (PERMANENT SEED)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showSecret ? 'text' : 'password'}
                    readOnly
                    value={clientSecret}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="btn-secondary"
                    style={{ padding: '0 12px' }}
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(clientSecret, 'client_secret')}
                    className="btn-secondary"
                    style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedKey === 'client_secret' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedKey === 'client_secret' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Sandbox Access Token */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                  SANDBOX PERMANENT ACCESS TOKEN
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    readOnly
                    value={accessToken}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    className="btn-secondary"
                    style={{ padding: '0 12px' }}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(accessToken, 'access_token')}
                    className="btn-secondary"
                    style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedKey === 'access_token' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedKey === 'access_token' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* 4. API Base URL */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#94a3b8', marginBottom: '6px' }}>
                  ANVIL API BASE URL
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={baseUrl}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => copyToClipboard(baseUrl, 'base_url')}
                    className="btn-secondary"
                    style={{ padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {copiedKey === 'base_url' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    <span>{copiedKey === 'base_url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Key Regeneration Action */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.05)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    Regenerate Sandbox Keys
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Instantly generates a fresh access token and client secret if credentials were compromised.
                  </div>
                </div>

                <button
                  onClick={handleRegenerateKeys}
                  disabled={isRegenerating}
                  style={{
                    background: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#f43f5e',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={isRegenerating ? 'spin' : ''} />
                  <span>{isRegenerating ? 'Regenerating...' : 'Regenerate Keys'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: VIRTUAL CAPITAL & LEDGER */}
          {activeTab === 'ledger' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Virtual Margin & Risk Controls
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Manage virtual Indian Rupee margin balances for test executions without risking real capital.
                </p>
              </div>

              {/* 3 Telemetry Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>AVAILABLE MARGIN</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', margin: '6px 0 2px' }}>
                    ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Ready for option buying/selling</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>UTILIZED MARGIN</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: utilizedMargin > 0 ? '#fbbf24' : '#94a3b8', fontFamily: 'var(--font-mono)', margin: '6px 0 2px' }}>
                    ₹{utilizedMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Locked in active positions</div>
                </div>

                <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>SOD LIMIT (START OF DAY)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)', margin: '6px 0 2px' }}>
                    ₹{sodLimit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Default daily capital ceiling</div>
                </div>
              </div>

              {/* Add Virtual Funds Controls */}
              <div
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                  Top-Up Virtual Balance
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  {['50000', '100000', '500000', '1000000'].map((val) => (
                    <button
                      key={val}
                      onClick={() => handleAddFunds(val)}
                      disabled={isDepositing}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#10b981',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      +₹{Number(val).toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="10000"
                    placeholder="Enter custom amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => handleAddFunds()}
                    disabled={isDepositing}
                    className="btn-primary"
                    style={{ padding: '8px 18px', fontSize: '0.82rem' }}
                  >
                    {isDepositing ? 'Depositing...' : 'Add Funds'}
                  </button>
                </div>
              </div>

              {/* Reset Ledger Button */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    Reset Ledger to Default SOD
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                    Restores account balance to exactly ₹5,00,000.00 and clears unsettled margins.
                  </div>
                </div>

                <button
                  onClick={handleResetLedger}
                  disabled={isResetting}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={13} className={isResetting ? 'spin' : ''} />
                  <span>{isResetting ? 'Resetting...' : 'Reset to ₹5,00,000'}</span>
                </button>
              </div>

              {/* Emergency Kill Switch */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: user.kill_switch_active ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                  border: user.kill_switch_active ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShieldAlert size={22} color={user.kill_switch_active ? '#f43f5e' : '#fbbf24'} />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: user.kill_switch_active ? '#f43f5e' : '#ffffff' }}>
                      {user.kill_switch_active ? 'Circuit Breaker Active (TRADING BLOCKED)' : 'Emergency Kill Switch (ARMED)'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {user.kill_switch_active
                        ? 'New order placement is frozen for this client. Click unlock to resume.'
                        : 'Instantly halts all order routing and rejects incoming buy/sell requests.'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleKillSwitch}
                  disabled={killSwitchLoading}
                  style={{
                    background: user.kill_switch_active ? '#10b981' : '#f43f5e',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {killSwitchLoading ? 'Updating...' : (user.kill_switch_active ? 'Unlock Trading' : '⚡ Kill All Trades')}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: MARMOT INTEGRATION */}
          {activeTab === 'marmot' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Connect Marmot Algo Strategy Engine
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Paste this snippet directly into Marmot's `.env` configuration file to execute trades through ANVIL's Dhan v2 sandbox wire.
                </p>
              </div>

              {/* Marmot .env snippet */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 600 }}>MARMOT .ENV CONFIGURATION</span>
                  <button
                    onClick={() => copyToClipboard(marmotEnvSnippet, 'marmot_env')}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedKey === 'marmot_env' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedKey === 'marmot_env' ? 'Copied' : 'Copy .env block'}</span>
                  </button>
                </div>
                <pre
                  style={{
                    background: '#04060a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                  }}
                >
                  {marmotEnvSnippet}
                </pre>
              </div>

              {/* Python SDK snippet */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>PYTHON DHANHQ SDK (1-LINE PLUG)</span>
                  <button
                    onClick={() => copyToClipboard(pythonSnippet, 'python_code')}
                    style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedKey === 'python_code' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedKey === 'python_code' ? 'Copied' : 'Copy Python'}</span>
                  </button>
                </div>
                <pre
                  style={{
                    background: '#04060a',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#e2e8f0',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                    overflowX: 'auto',
                  }}
                >
                  {pythonSnippet}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: ADMIN MASTER CONSOLE */}
          {activeTab === 'admin' && isAdmin && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                  Super Admin Management Portal
                </h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Administrative telemetry, multi-trader controls, and broker infrastructure status.
                </p>
              </div>

              {/* Administrative Quick Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}>
                <button
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('traders');
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left',
                  }}
                >
                  <Users size={20} color="#38bdf8" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Traders Management</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Inspect, edit margins, freeze traders</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (onNavigate) onNavigate('trades');
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    background: 'rgba(168, 85, 247, 0.08)',
                    border: '1px solid rgba(168, 85, 247, 0.25)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left',
                  }}
                >
                  <Sliders size={20} color="#c084fc" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>Trade Controls & Postbacks</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>All orders, fills, and webhook logs</div>
                  </div>
                </button>
              </div>

              {/* Fast Account Switcher for Testing */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
                  Quick Sandbox Account Switcher
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { email: 'admin@anvil.local', name: 'Super Admin', clientId: '1000000001' },
                    { email: 'trader1@anvil.local', name: 'Vikram Quant', clientId: '1000000002' },
                    { email: 'trader2@anvil.local', name: 'Aarav Algo', clientId: '1000000003' },
                  ].map((acc) => (
                    <button
                      key={acc.clientId}
                      onClick={() => {
                        if (onSwitchUser) onSwitchUser(acc.email);
                        onClose();
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: user.dhan_client_id === acc.clientId ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: user.dhan_client_id === acc.clientId ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: user.dhan_client_id === acc.clientId ? '#10b981' : '#e2e8f0',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{acc.name}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{acc.clientId}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
