import React, { useState } from 'react';
import {
  Search,
  Bell,
  Maximize2,
  Minimize2,
  Zap,
  Moon,
  ChevronDown,
  LayoutGrid,
  Sliders,
  ShieldAlert,
  RotateCcw,
  Users,
  Radio,
  FileText
} from 'lucide-react';

export default function TopHeader({
  user,
  account,
  siteConfig,
  onOpenDataFeed,
  onOpenProfile,
  onNavigate,
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);
  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : (isAdmin ? 'S' : 'T');
  const roleTitle = isAdmin ? 'Super Admin' : (user?.full_name || 'Sandbox Trader');

  return (
    <header id="anvil-top-header-bar" className="top-header">
      {/* Left: Quick Actions ([K] shortcut button + Admin Actions) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.78rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
          }}
          title="Command Palette Quick Toggle"
        >
          K
        </button>

        {/* Admin Actions Dropdown Button (Amber pill matching screenshot) */}
        <div style={{ position: 'relative' }}>
          <button
            id="top-admin-actions-btn"
            onClick={() => setShowAdminMenu(!showAdminMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.45)',
              color: '#fbbf24',
              borderRadius: '7px',
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.1)',
            }}
          >
            <Zap size={14} color="#fbbf24" fill="#fbbf24" />
            <span>Admin Actions</span>
            <ChevronDown size={13} />
          </button>

          {showAdminMenu && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                width: '230px',
                background: '#111520',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '6px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.75)',
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  if (onOpenProfile) onOpenProfile();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#f8fafc',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Sliders size={14} color="#fbbf24" />
                <span>Configure Profile & Keys</span>
              </button>

              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  if (onOpenDataFeed) onOpenDataFeed();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'transparent',
                  color: '#f8fafc',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <Radio size={14} color="#10b981" />
                <span>Fyers Data Feed OAuth</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      setShowAdminMenu(false);
                      if (onNavigate) onNavigate('traders');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#f8fafc',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Users size={14} color="#38bdf8" />
                    <span>Traders Management</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false);
                      if (onNavigate) onNavigate('trades');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#f8fafc',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <FileText size={14} color="#c084fc" />
                    <span>Trade Controls & Orders</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center: Global Search Command Palette (Matching screenshot) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, maxWidth: '540px', margin: '0 20px' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
          <input
            id="global-search-console-input"
            type="text"
            placeholder="Search admin console, users, configs (Ctrl+K)..."
            style={{
              width: '100%',
              padding: '7px 42px 7px 34px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none',
              fontFamily: 'var(--font-body)',
            }}
          />
          <span
            style={{
              position: 'absolute',
              right: '10px',
              fontSize: '0.65rem',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 5px',
              borderRadius: '4px',
              color: '#94a3b8',
            }}
          >
            Ctrl+K
          </span>
        </div>
      </div>

      {/* Right: Theme Toggle, Fullscreen, Notification Bell, User Chip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Moon / Theme Toggle */}
        <button
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '7px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Dark Mode (Active)"
        >
          <Moon size={15} />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '7px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Notification Bell */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            padding: '7px',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Bell size={15} />
          <div
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
        </div>

        {/* User Chip with Profile Trigger (Matching Screenshot: Purple icon + Name + Chevron) */}
        <div
          id="top-header-profile-chip"
          onClick={() => {
            if (onNavigate) onNavigate('profile');
            else if (onOpenProfile) onOpenProfile();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
          }}
          title="Click to view & edit Profile"
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
              color: '#ffffff',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(124, 58, 237, 0.35)',
            }}
          >
            {userInitial}
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
            {roleTitle}
          </span>
          <ChevronDown size={13} color="#94a3b8" />
        </div>
      </div>
    </header>
  );
}
