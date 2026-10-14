import React, { useState } from 'react';
import {
  Database,
  Activity,
  Layers,
  Receipt,
  Radio,
  KeyRound,
  Users,
  ShieldCheck,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
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
  isCollapsed = false,
  onToggleCollapse,
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
  const clientId = user?.dhan_client_id || '1000000001';

  return (
    <aside
      id="antigravity-sidebar-navigation"
      className={`sidebar-nav ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '72px' : 'var(--sidebar-width, 250px)',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        boxSizing: 'border-box',
        userSelect: 'none',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease, border-color 0.25s ease',
      }}
    >
      {/* Brand Header */}
      {isCollapsed ? (
        <div
          style={{
            padding: '16px 0 12px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            onClick={() => onNavigate('dashboard')}
            title="ANVIL Quant Terminal"
            style={{ cursor: 'pointer' }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #00f5ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
          </div>

          <button
            id="sidebar-collapse-toggle-btn"
            onClick={onToggleCollapse}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '5px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Expand Sidebar (Ctrl+B)"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div
          style={{
            padding: '18px 16px 14px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => onNavigate('dashboard')}
            title="ANVIL Quant Terminal"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #00f5ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(99, 102, 241, 0.45)',
              }}
            >
              <Sparkles size={16} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  ANVIL
                </span>
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', fontWeight: 600 }}>
                QUANT TERMINAL
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '0.6rem',
                padding: '2px 6px',
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

            <button
              id="sidebar-collapse-toggle-btn"
              onClick={onToggleCollapse}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '5px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
              title="Minimize Sidebar (Ctrl+B)"
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links Tree */}
      <div style={{ flex: 1, padding: '10px 0', overflowY: 'auto', overflowX: 'hidden' }}>
        
        {/* SECTION 1: WORKSPACE */}
        {isCollapsed ? (
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 14px' }} />
        ) : (
          <div className="nav-section-title">
            <span>WORKSPACE</span>
          </div>
        )}

        {/* 1. Market Desk */}
        <button
          id="nav-market-desk"
          className={`nav-link-btn ${currentView === 'dashboard' ? 'active-cyan' : ''}`}
          onClick={() => onNavigate('dashboard')}
          title="Market Desk - Live Quotes, Option Chain, Positions & Execution Sandbox"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <Activity size={17} color={currentView === 'dashboard' ? '#06b6d4' : '#94a3b8'} />
          {!isCollapsed && <span style={{ flex: 1 }}>Market Desk</span>}
          {!isCollapsed && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              LIVE
            </span>
          )}
        </button>

        {/* 2. Charts & Terminal */}
        <button
          id="nav-visual-charts"
          className={`nav-link-btn ${currentView === 'charts' ? 'active-cyan' : ''}`}
          onClick={() => onNavigate('charts')}
          title="Charts & Terminal - Interactive Candlestick Chart with Positions & Orders Overlays"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <TrendingUp size={17} color={currentView === 'charts' ? '#06b6d4' : '#94a3b8'} />
          {!isCollapsed && <span style={{ flex: 1 }}>Charts & Terminal</span>}
          {!isCollapsed && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              VISUAL
            </span>
          )}
        </button>

        {/* 3. Option Chain */}
        <button
          id="nav-option-chain"
          className={`nav-link-btn ${currentView === 'optionchain' ? 'active' : ''}`}
          onClick={() => onNavigate('optionchain')}
          title="Option Chain - Full-Page 31-Strike Call/Put Greeks Matrix"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <Layers size={17} color={currentView === 'optionchain' ? '#818cf8' : '#94a3b8'} />
          {!isCollapsed && <span style={{ flex: 1 }}>Option Chain</span>}
          {!isCollapsed && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              31 STRIKES
            </span>
          )}
        </button>

        {/* 4. Market Backups */}
        <button
          id="nav-market-backups"
          className={`nav-link-btn ${currentView === 'backups' ? 'active-cyan' : ''}`}
          onClick={() => onNavigate('backups')}
          title="Market Backups - Historical F&O Option Chains & Spot Parquet Compaction"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <Database size={17} color={currentView === 'backups' ? '#38bdf8' : '#94a3b8'} />
          {!isCollapsed && <span style={{ flex: 1 }}>Market Backups</span>}
          {!isCollapsed && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              PARQUET
            </span>
          )}
        </button>

        {/* 5. Orders & Trades */}
        <button
          id="nav-orders-trades"
          className={`nav-link-btn ${currentView === 'trades' ? 'active' : ''}`}
          onClick={() => onNavigate('trades')}
          title="Orders & Trades - Execution Ledger & Trade History"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <Receipt size={17} color={currentView === 'trades' ? '#818cf8' : '#94a3b8'} />
          {!isCollapsed && <span style={{ flex: 1 }}>Orders & Trades</span>}
        </button>

        {/* SECTION 2: INTEGRATIONS */}
        {isCollapsed ? (
          <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 14px' }} />
        ) : (
          <div className="nav-section-title" style={{ marginTop: '10px' }}>
            <span>INTEGRATIONS</span>
          </div>
        )}

        {/* 6. Market Data Feed */}
        <button
          id="nav-market-feed"
          className={`nav-link-btn ${currentView === 'feed' ? 'active' : ''}`}
          onClick={() => onNavigate('feed')}
          title="Market Feed - Fyers API v3 WebSocket & Token Configuration"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <Radio size={17} color="#f59e0b" />
          {!isCollapsed && <span style={{ flex: 1 }}>Market Feed</span>}
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '0.62rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                FYERS v3
              </span>
            </div>
          )}
        </button>

        {/* 7. Marmot Connect */}
        <button
          id="nav-marmot-connect"
          className={`nav-link-btn ${currentView === 'marmot' ? 'active' : ''}`}
          onClick={() => onNavigate('marmot')}
          title="Marmot Connect - Dhan v2 Credentials & Gateway"
          style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
        >
          <KeyRound size={17} color="#34d399" />
          {!isCollapsed && <span style={{ flex: 1 }}>Marmot Connect</span>}
          {!isCollapsed && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
              DHAN v2
            </span>
          )}
        </button>

        {/* SECTION 3: CONTROL PLANE (Admins Only) */}
        {isAdmin && (
          <>
            {isCollapsed ? (
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 14px' }} />
            ) : (
              <div className="nav-section-title" style={{ marginTop: '10px' }}>
                <span>CONTROL PLANE</span>
              </div>
            )}

            {/* 8. Traders Directory */}
            <button
              id="nav-traders-directory"
              className={`nav-link-btn ${currentView === 'traders' ? 'active' : ''}`}
              onClick={() => onNavigate('traders')}
              title="Traders Directory - Multi-Trader Accounts, Balance Adjustments & Risk Controls"
              style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
            >
              <Users size={17} color={currentView === 'traders' ? '#818cf8' : '#94a3b8'} />
              {!isCollapsed && <span style={{ flex: 1 }}>Traders Directory</span>}
              {!isCollapsed && (
                <span style={{ fontSize: '0.62rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                  ADMIN
                </span>
              )}
            </button>

            {/* 9. Admin Gateway */}
            <button
              id="nav-admin-gateway"
              className={`nav-link-btn ${currentView === 'admin_login' ? 'active' : ''}`}
              onClick={() => onNavigate('admin_login')}
              title="Admin Gateway - Dedicated Admin Portal Login Screen"
              style={isCollapsed ? { width: '44px', height: '44px', margin: '4px auto', padding: 0, justifyContent: 'center' } : {}}
            >
              <ShieldCheck size={17} color={currentView === 'admin_login' ? '#38bdf8' : '#94a3b8'} />
              {!isCollapsed && <span style={{ flex: 1, color: currentView === 'admin_login' ? '#38bdf8' : 'var(--text-secondary)' }}>Admin Gateway</span>}
              {!isCollapsed && (
                <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                  AUTH
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Account Switcher Modal (If open) */}
      {showUserDropdown && (
        <div
          style={{
            position: isCollapsed ? 'fixed' : 'absolute',
            bottom: isCollapsed ? '16px' : '78px',
            left: isCollapsed ? '76px' : '12px',
            right: isCollapsed ? 'auto' : '12px',
            width: isCollapsed ? '240px' : 'auto',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 -12px 36px rgba(0, 0, 0, 0.35)',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', padding: '6px 8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
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
                color: user?.dhan_client_id === acc.clientId ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: user?.dhan_client_id === acc.clientId ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{acc.name}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{acc.clientId}</div>
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

      {/* Glassmorphic User Profile Card */}
      {isCollapsed ? (
        <div
          id="sidebar-user-card"
          style={{
            margin: '8px',
            padding: '10px 0',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div
            onClick={() => {
              if (onNavigate) onNavigate('profile');
              else if (onOpenProfile) onOpenProfile();
            }}
            title={`${displayName} (ID: ${clientId}) - Click to view Profile`}
            style={{ cursor: 'pointer' }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)',
              }}
            >
              {userInitial}
            </div>
          </div>

          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '2px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Switch Account"
          >
            <ChevronDown size={14} />
          </button>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f43f5e',
              padding: '4px',
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
      ) : (
        <div
          id="sidebar-user-card"
          style={{
            margin: '12px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface-elevated)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          }}
        >
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
                  color: 'var(--text-primary)',
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
                  color: 'var(--text-muted)',
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

          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
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
      )}
    </aside>
  );
}
