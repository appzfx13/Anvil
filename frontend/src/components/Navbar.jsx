import React from 'react';
import { Layers, Terminal, BookOpen, ShieldCheck, Wallet, UserCircle, LogOut } from 'lucide-react';

export default function Navbar({
  currentView,
  setCurrentView,
  user,
  account,
  ticks = {},
  hasFeedToken = false,
  onOpenDataFeed,
  onLogout,
  onOpenDeposit,
}) {
  return (
    <header
      id="main-navbar"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 500,
        background: 'rgba(9, 12, 21, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      {/* Top Brand & Nav Row */}
      <div
        className="navbar-container-responsive"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
        }}
      >
        {/* Brand */}
        <div
          id="nav-brand-logo"
          onClick={() => setCurrentView('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Layers size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                  letterSpacing: '0.05em',
                  color: '#ffffff',
                }}
              >
                ANVIL
              </span>
              <span className="badge-bull" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                DHAN v2
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              PRECISION DERIVATIVE SANDBOX
            </div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            id="nav-link-home"
            className="btn-secondary"
            onClick={() => setCurrentView('home')}
            style={{
              background: currentView === 'home' ? 'var(--bg-surface-elevated)' : 'transparent',
              borderColor: currentView === 'home' ? 'var(--accent-primary)' : 'transparent',
              fontSize: '0.88rem',
              padding: '8px 14px',
            }}
          >
            Home
          </button>
          {user && (
            <>
              <button
                id="nav-link-dashboard"
                className="btn-secondary"
                onClick={() => setCurrentView('dashboard')}
                style={{
                  background: currentView === 'dashboard' ? 'var(--bg-surface-elevated)' : 'transparent',
                  borderColor: currentView === 'dashboard' ? 'var(--accent-primary)' : 'transparent',
                  fontSize: '0.88rem',
                  padding: '8px 14px',
                }}
              >
                <Terminal size={16} />
                Terminal
              </button>
            </>
          )}
        </nav>

        {/* Right Action & Account Telemetry */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Feed Live Status Indicator */}
          <div
            id="fyers-feed-status-badge"
            className="badge-neutral"
            onClick={onOpenDataFeed}
            style={{
              background: hasFeedToken ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.12)',
              borderColor: hasFeedToken ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.35)',
              cursor: 'pointer',
            }}
            title="Click to view/configure Fyers API v3 Level-1 Data Feed"
          >
            <div className={hasFeedToken ? 'pulse-dot-green' : 'pulse-dot-amber'} />
            <span
              style={{
                color: hasFeedToken ? 'var(--bull-green)' : 'var(--warn-amber)',
                fontSize: '0.74rem',
                fontWeight: 600,
              }}
            >
              {hasFeedToken ? 'FYERS FEED LIVE' : 'DATA FEED OFFLINE'}
            </span>
          </div>

          {/* Virtual Margin Balance Pill */}
          {account && (
            <div
              id="user-balance-pill"
              onClick={onOpenDeposit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '6px 12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="Click to deposit/adjust virtual margin"
            >
              <Wallet size={16} color="var(--accent-cyan)" />
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>AVAIL MARGIN</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.86rem', color: '#38bdf8' }}>
                  ₹{Number(account.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Auth Button or User Menu */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                id="user-profile-summary"
                onClick={() => setCurrentView && setCurrentView('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
                title="View & Edit Profile"
              >
                <ShieldCheck size={16} color="var(--accent-primary)" />
                <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                  {user.dhan_client_id || '1000000001'}
                </div>
              </div>
              <button
                id="btn-logout"
                className="btn-secondary"
                onClick={onLogout}
                style={{ padding: '8px', border: 'none', background: 'transparent' }}
                title="Sign Out"
              >
                <LogOut size={16} color="var(--text-muted)" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                id="nav-btn-admin-login"
                className="btn-secondary"
                onClick={() => setCurrentView('admin_login')}
                style={{ padding: '8px 14px', fontSize: '0.84rem', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
              >
                Admin Portal
              </button>
              <button
                id="nav-btn-login"
                className="btn-primary"
                onClick={() => setCurrentView('auth')}
                style={{ padding: '8px 18px', fontSize: '0.88rem' }}
              >
                Trader Sign In / OTP
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Index Ticker Strip (5 Indices: NIFTY 50, BANK NIFTY, FINNIFTY, MIDCAP NIFTY, SENSEX) */}
      <div
        id="index-ticker-strip"
        style={{
          background: 'rgba(5, 7, 13, 0.7)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '6px 24px',
          overflowX: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          whiteSpace: 'nowrap',
        }}
      >
        {Object.entries(ticks).map(([key, t]) => {
          const isUp = (t.ch || 0) >= 0;
          return (
            <div
              key={key}
              id={`ticker-${key.toLowerCase()}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{t.index_name || key}:</span>
              <span style={{ color: '#ffffff', fontWeight: 700 }}>
                {Number(t.ltp || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className={isUp ? 'badge-bull' : 'badge-bear'} style={{ padding: '1px 5px', fontSize: '0.72rem' }}>
                {isUp ? '+' : ''}{Number(t.ch || 0).toFixed(2)} ({Number(t.chp || 0).toFixed(2)}%)
              </span>
            </div>
          );
        })}
      </div>
    </header>
  );
}
