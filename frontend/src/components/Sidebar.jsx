import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Layers,
  Receipt,
  Radio,
  KeyRound,
  BookOpen,
  Users,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Zap,
  Globe,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export default function Sidebar({
  currentView,
  onNavigate,
  user,
  onLogout,
  onSwitchUser,
  onOpenProfile,
  onOpenOptionChainModal,
  onOpenDataFeed,
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);

  const demoAccounts = [
    { email: 'admin@anvil.local', name: 'Super Admin', clientId: '1000000001', role: 'Admin' },
    { email: 'trader1@anvil.local', name: 'Vikram Quant', clientId: '1000000002', role: 'Trader 1' },
    { email: 'trader2@anvil.local', name: 'Aarav Algo', clientId: '1000000003', role: 'Trader 2' },
  ];

  const displayName = user?.full_name ? (user.full_name.includes(' ') ? user.full_name.split(' ')[0] : user.full_name) : (isAdmin ? 'Admin' : 'Trader');
  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (isAdmin ? 'A' : 'T');
  const displayEmail = user?.email || (isAdmin ? 'admin@antigravity.io' : 'trader@antigravity.io');
  const clientId = user?.dhan_client_id || '1000000001';

  return (
    <aside
      id="antigravity-sidebar-navigation"
      className="sidebar-nav"
      style={{
        width: 'var(--sidebar-width, 250px)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: '#06070b',
        borderRight: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      {/* Antigravity Brand Header */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '11px', cursor: 'pointer' }}
          onClick={() => onNavigate('dashboard')}
          title="ANVIL Quant Terminal"
        >
          {/* Glowing Cosmic Orb Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #00f5ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
              position: 'relative',
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.22rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#ffffff', fontFamily: 'var(--font-display)' }}>
                ANVIL
              </span>
            </div>
            <div style={{ fontSize: '0.62rem', color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontWeight: 600 }}>
              QUANT TERMINAL
            </div>
          </div>
        </div>

        {/* Status Tag */}
        <span
          style={{
            fontSize: '0.6rem',
            padding: '2px 7px',
            borderRadius: '999px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            background: isAdmin ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: isAdmin ? '#a5b4fc' : '#34d399',
            border: `1px solid ${isAdmin ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {isAdmin ? 'ADMIN' : 'TRADER'}
        </span>
      </div>

      {/* Clean Navigation Tree */}
      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* SECTION 1: WORKSPACE */}
        <div className="nav-section-title">
          <span>WORKSPACE</span>
        </div>

        {/* 1. Market Desk (Primary Trading Sandbox) */}
        <button
          id="nav-market-desk"
          className={`nav-link-btn ${currentView === 'dashboard' ? 'active-cyan' : ''}`}
          onClick={() => onNavigate('dashboard')}
          title="Live Quotes, Option Chain, Positions & Execution Sandbox"
        >
          <Activity size={16} color={currentView === 'dashboard' ? '#06b6d4' : '#94a3b8'} />
          <span style={{ flex: 1 }}>Market Desk</span>
          <span style={{ fontSize: '0.62rem', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
            LIVE
          </span>
        </button>

        {/* 2. Visual Terminal & Charts */}
        <button
          id="nav-visual-charts"
          className={`nav-link-btn ${currentView === 'charts' ? 'active-cyan' : ''}`}
          onClick={() => onNavigate('charts')}
          title="Interactive Candlestick Chart with Positions & Orders Overlays"
        >
          <TrendingUp size={16} color={currentView === 'charts' ? '#06b6d4' : '#94a3b8'} />
          <span style={{ flex: 1 }}>Charts & Terminal</span>
          <span style={{ fontSize: '0.62rem', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
            VISUAL
          </span>
        </button>

        {/* 3. Option Chain (Dedicated Full-Page Matrix) */}
        <button
          id="nav-option-chain"
          className={`nav-link-btn ${currentView === 'optionchain' ? 'active' : ''}`}
          onClick={() => onNavigate('optionchain')}
          title="Full-Page 31-Strike Call/Put Greeks Matrix"
        >
          <Layers size={16} color={currentView === 'optionchain' ? '#818cf8' : '#94a3b8'} />
          <span style={{ flex: 1 }}>Option Chain</span>
          <span style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
            31 STRIKES
          </span>
        </button>

        {/* 4. Orders & Trades */}
        <button
          id="nav-orders-trades"
          className={`nav-link-btn ${currentView === 'trades' ? 'active' : ''}`}
          onClick={() => onNavigate('trades')}
          title="Execution Ledger & Trade History"
        >
          <Receipt size={16} color={currentView === 'trades' ? '#818cf8' : '#94a3b8'} />
          <span style={{ flex: 1 }}>Orders & Trades</span>
        </button>

        {/* SECTION 2: INTEGRATIONS */}
        <div className="nav-section-title" style={{ marginTop: '10px' }}>
          <span>INTEGRATIONS</span>
        </div>

        {/* 5. Market Data Feed */}
        <button
          id="nav-market-feed"
          className={`nav-link-btn ${currentView === 'feed' ? 'active' : ''}`}
          onClick={() => onNavigate('feed')}
          title="Fyers API v3 WebSocket & Token Configuration (Dedicated Page)"
        >
          <Radio size={16} color="#f59e0b" />
          <span style={{ flex: 1 }}>Market Feed</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              FYERS v3
            </span>
          </div>
        </button>

        {/* 6. Marmot Connect */}
        <button
          id="nav-marmot-connect"
          className={`nav-link-btn ${currentView === 'marmot' ? 'active' : ''}`}
          onClick={() => onNavigate('marmot')}
          title="Dhan v2 Credentials & Safety Kill Switch (Dedicated Page)"
        >
          <KeyRound size={16} color="#34d399" />
          <span style={{ flex: 1 }}>Marmot Connect</span>
          <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
            DHAN v2
          </span>
        </button>

        {/* SECTION 3: CONTROL PLANE (Admins Only) */}
        {isAdmin && (
          <>
            <div className="nav-section-title" style={{ marginTop: '10px' }}>
              <span>CONTROL PLANE</span>
            </div>

            {/* 8. Traders Directory */}
            <button
              id="nav-traders-directory"
              className={`nav-link-btn ${currentView === 'traders' ? 'active' : ''}`}
              onClick={() => onNavigate('traders')}
              title="Multi-Trader Accounts, Balance Adjustments & Risk Controls"
            >
              <Users size={16} color={currentView === 'traders' ? '#818cf8' : '#94a3b8'} />
              <span style={{ flex: 1 }}>Traders Directory</span>
              <span style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                ADMIN
              </span>
            </button>

            {/* 9. Admin Gateway */}
            <button
              id="nav-admin-gateway"
              className={`nav-link-btn ${currentView === 'admin_login' ? 'active' : ''}`}
              onClick={() => onNavigate('admin_login')}
              title="Dedicated Admin Portal Login Screen"
            >
              <ShieldCheck size={16} color={currentView === 'admin_login' ? '#38bdf8' : '#94a3b8'} />
              <span style={{ flex: 1, color: currentView === 'admin_login' ? '#38bdf8' : '#8e9bb0' }}>Admin Gateway</span>
              <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                AUTH
              </span>
            </button>
          </>
        )}
      </div>

      {/* Account Switcher Modal (If open) */}
      {showUserDropdown && (
        <div
          style={{
            position: 'absolute',
            bottom: '78px',
            left: '12px',
            right: '12px',
            background: '#0d1017',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 -12px 36px rgba(0, 0, 0, 0.85)',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', padding: '6px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            SWITCH SANDBOX ACCOUNT
          </div>
          {demoAccounts.map((acc) => (
            <button
              key={acc.clientId}
              onClick={() => {
                setShowUserDropdown(false);
                if (onSwitchUser) onSwitchUser(acc.email);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: user?.dhan_client_id === acc.clientId ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color: user?.dhan_client_id === acc.clientId ? '#ffffff' : '#94a3b8',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: user?.dhan_client_id === acc.clientId ? '#ffffff' : '#cbd5e1' }}>{acc.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{acc.clientId}</div>
              </div>
              <span
                style={{
                  fontSize: '0.62rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: acc.role === 'Admin' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                  color: acc.role === 'Admin' ? '#818cf8' : '#34d399',
                  fontWeight: 700,
                }}
              >
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Antigravity Glassmorphic User Profile Card */}
      <div
        id="sidebar-user-card"
        style={{
          margin: '12px',
          padding: '10px 12px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(14, 18, 27, 0.65)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
        }}
      >
        {/* Profile trigger */}
        <div
          onClick={() => {
            if (onNavigate) onNavigate('profile');
            else if (onOpenProfile) onOpenProfile();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
            cursor: 'pointer',
            flex: 1,
          }}
          title="Click to view Marmot profile & Dhan credentials"
        >
          {/* Cosmic Avatar with Gradient Glow */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>

          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#ffffff',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '0.67rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                fontFamily: 'var(--font-mono)',
              }}
            >
              ID: {clientId}
            </div>
          </div>
        </div>

        {/* Account Switcher Trigger */}
        <button
          onClick={() => setShowUserDropdown(!showUserDropdown)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Switch Account"
        >
          <ChevronDown size={14} />
        </button>

        {/* Sign Out Action */}
        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f43f5e',
            padding: '5px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Sign Out"
        >
          <LogOut size={15} color="#f43f5e" />
        </button>
      </div>
    </aside>
  );
}
