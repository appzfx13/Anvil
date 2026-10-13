import React, { useState } from 'react';
import {
  LayoutDashboard,
  Terminal,
  Layers,
  Activity,
  Users,
  Receipt,
  BookOpen,
  Settings,
  Radio,
  KeyRound,
  ShieldAlert,
  LogOut,
  ChevronDown,
  UserCheck,
  Zap,
  Globe,
  Sliders,
  Bookmark,
  FileText,
  PieChart,
  Cpu,
  Database,
  Calendar,
  Sparkles,
  SlidersHorizontal,
  Server,
  Share2,
  Workflow,
  Shield,
  Bot,
  Cloud,
  Gamepad2,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({
  currentView,
  onNavigate,
  user,
  onLogout,
  onSwitchUser,
  onOpenProfile,
}) {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);

  const demoAccounts = [
    { email: 'admin@anvil.local', name: 'Super Admin', clientId: '1000000001', role: 'Admin' },
    { email: 'trader1@anvil.local', name: 'Vikram Quant', clientId: '1000000002', role: 'Trader 1' },
    { email: 'trader2@anvil.local', name: 'Aarav Algo', clientId: '1000000003', role: 'Trader 2' },
  ];

  const displayName = user?.full_name ? (user.full_name.includes(' ') ? user.full_name.split(' ')[0] : user.full_name) : (isAdmin ? 'Super' : 'Trader');
  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (isAdmin ? 'S' : 'T');
  const displayEmail = user?.email || (isAdmin ? 'admin@marmot.local' : 'trader@anvil.local');
  const truncatedEmail = displayEmail.length > 15 ? displayEmail.substring(0, 12) + '...' : displayEmail;

  return (
    <aside id="anvil-sidebar-navigation" className="sidebar-nav">
      {/* Brand Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer' }}
          onClick={() => onNavigate('live_dashboard')}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <Zap size={17} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
            MARMOT
          </span>
        </div>

        <span
          className="badge-cyan"
          style={{
            fontSize: '0.65rem',
            padding: '2px 8px',
            borderRadius: '999px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(6, 182, 212, 0.3)',
          }}
        >
          {isAdmin ? 'ADMIN' : 'TRADER'}
        </span>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {/* SECTION 1: DASHBOARDS & TRADING */}
        <div className="nav-section-title">DASHBOARDS & TRADING</div>

        {/* Dashboard - Live (Screenshot item 1) */}
        <button
          id="nav-dashboard-live"
          className={`nav-link-btn ${currentView === 'live_dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('live_dashboard')}
          title="Live Dashboard"
          style={{
            background: currentView === 'live_dashboard' ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
            borderLeft: currentView === 'live_dashboard' ? '3px solid #00e676' : '3px solid transparent',
            color: currentView === 'live_dashboard' ? '#ffffff' : '#94a3b8',
          }}
        >
          <Zap size={15} color="#00e676" />
          <span style={{ flex: 1, fontWeight: currentView === 'live_dashboard' ? 700 : 500 }}>
            Dashboard - Live
          </span>
        </button>

        {/* Sandbox Terminal (Screenshot item 2) */}
        <button
          id="nav-sandbox-terminal"
          className={`nav-link-btn ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
          style={{
            background: currentView === 'dashboard' ? 'rgba(0, 210, 255, 0.12)' : 'transparent',
            borderLeft: currentView === 'dashboard' ? '3px solid #00d2ff' : '3px solid transparent',
            color: currentView === 'dashboard' ? '#ffffff' : '#94a3b8',
          }}
        >
          <Shield size={15} color="#00d2ff" />
          <span style={{ flex: 1, fontWeight: currentView === 'dashboard' ? 700 : 500 }}>
            Sandbox Terminal
          </span>
        </button>

        {/* Saved Sessions (Screenshot item 3) */}
        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <Bookmark size={15} color="#00d2ff" />
          <span>Saved Sessions</span>
        </button>

        {/* Trading Journal (Screenshot item 4) */}
        <button
          id="nav-trading-journal"
          className={`nav-link-btn ${currentView === 'trades' ? 'active' : ''}`}
          onClick={() => onNavigate('trades')}
        >
          <FileText size={15} color="#00d2ff" />
          <span>Trading Journal</span>
        </button>

        {/* Executive Overview (Screenshot item 5) */}
        <button
          className="nav-link-btn"
          onClick={() => onNavigate('live_dashboard')}
        >
          <PieChart size={15} color="#00d2ff" />
          <span>Executive Overview</span>
        </button>

        {/* SECTION 2: STRATEGY & RESEARCH */}
        <div className="nav-section-title" style={{ marginTop: '12px' }}>STRATEGY & RESEARCH</div>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('live_dashboard')}
        >
          <Workflow size={15} color="#f1f5f9" />
          <span>Strategy Hub</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('live_dashboard')}
        >
          <Cpu size={15} color="#94a3b8" />
          <span>Backtest Engine</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('live_dashboard')}
        >
          <SlidersHorizontal size={15} color="#94a3b8" />
          <span>Strategy Check</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('live_dashboard')}
        >
          <Sparkles size={15} color="#f59e0b" />
          <span>AI Dashboard</span>
        </button>

        {/* SECTION 3: MARKET DATA & TELEMETRY */}
        <div className="nav-section-title" style={{ marginTop: '12px' }}>MARKET DATA & TELEMETRY</div>

        <button
          className={`nav-link-btn ${currentView === 'feed_config' ? 'active' : ''}`}
          onClick={() => onNavigate('feed_config')}
        >
          <Radio size={15} color="#f59e0b" />
          <span style={{ flex: 1 }}>Live Data Feed</span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <Cloud size={15} color="#94a3b8" />
          <span>Market Backups</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <Calendar size={15} color="#00d2ff" />
          <span>Daily 1S Datasets</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <Bot size={15} color="#f59e0b" />
          <span>AI Macro Assist</span>
        </button>

        {/* SECTION 4: SYSTEM & ADMINISTRATION */}
        <div className="nav-section-title" style={{ marginTop: '12px' }}>SYSTEM & ADMINISTRATION</div>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <Terminal size={15} color="#10b981" />
          <span>Live Terminal</span>
        </button>

        <button
          className="nav-link-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <ShieldAlert size={15} color="#f59e0b" />
          <span>Sandbox Terminal</span>
        </button>

        {/* Admin Navigation Menus */}
        {isAdmin && (
          <>
            <button
              id="nav-admin-traders"
              className={`nav-link-btn ${currentView === 'traders' ? 'active' : ''}`}
              onClick={() => onNavigate('traders')}
            >
              <Users size={15} color="#38bdf8" />
              <span style={{ flex: 1 }}>Traders</span>
              <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px' }}>
                ADMIN
              </span>
            </button>

            <button
              id="nav-admin-trades"
              className={`nav-link-btn ${currentView === 'trades' ? 'active' : ''}`}
              onClick={() => onNavigate('trades')}
            >
              <Receipt size={15} color="#c084fc" />
              <span>Trade Controls</span>
            </button>

            <button
              className="nav-link-btn"
              onClick={() => onNavigate('traders')}
            >
              <Sliders size={15} color="#eab308" />
              <span>Broker Masters</span>
            </button>

            <button
              className="nav-link-btn"
              onClick={() => onNavigate('trades')}
            >
              <Share2 size={15} color="#ec4899" />
              <span>Postback Logs</span>
            </button>

            <button
              className="nav-link-btn"
              onClick={() => onNavigate('docs')}
            >
              <Globe size={15} color="#3b82f6" />
              <span>Endpoints & Webhooks</span>
            </button>

            <button
              id="nav-admin-portal-login"
              className={`nav-link-btn ${currentView === 'admin_login' ? 'active' : ''}`}
              onClick={() => onNavigate('admin_login')}
            >
              <ShieldCheck size={15} color="#38bdf8" />
              <span style={{ flex: 1, color: '#38bdf8' }}>Admin Login Portal</span>
              <span style={{ fontSize: '0.62rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '1px 5px', borderRadius: '4px' }}>
                AUTH
              </span>
            </button>
          </>
        )}
      </div>

      {/* Demo Account Switcher Dropdown (If toggled) */}
      {showUserDropdown && (
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            left: '10px',
            right: '10px',
            background: '#111520',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.75)',
            zIndex: 100,
          }}
        >
          <div style={{ fontSize: '0.67rem', fontWeight: 700, color: '#94a3b8', padding: '6px 8px', letterSpacing: '0.04em' }}>
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
                padding: '7px 8px',
                borderRadius: '6px',
                border: 'none',
                background: user?.dhan_client_id === acc.clientId ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                color: user?.dhan_client_id === acc.clientId ? '#10b981' : '#e2e8f0',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{acc.clientId}</div>
              </div>
              <span className={acc.role === 'Admin' ? 'badge-cyan' : 'badge-emerald'} style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                {acc.role}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Bottom Profile Card (Matching Screenshot exactly: Purple Avatar, Name, Email, Red Logout) */}
      <div
        id="sidebar-bottom-user-card"
        style={{
          padding: '10px 14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.07)',
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        {/* User Profile trigger area */}
        <div
          id="sidebar-user-profile-trigger"
          onClick={() => {
            if (onOpenProfile) {
              onOpenProfile();
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflow: 'hidden',
            cursor: 'pointer',
            flex: 1,
          }}
          title="Click to view & edit Profile"
        >
          {/* Purple Square Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(124, 58, 237, 0.4)',
              flexShrink: 0,
            }}
          >
            {userInitial}
          </div>

          {/* Name & Email */}
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.82rem',
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
                fontSize: '0.68rem',
                color: '#64748b',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {truncatedEmail}
            </div>
          </div>
        </div>

        {/* Red Logout Button */}
        <button
          id="sidebar-logout-btn"
          onClick={onLogout}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            padding: '6px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Sign Out"
        >
          <LogOut size={16} color="#ef4444" />
        </button>
      </div>
    </aside>
  );
}
