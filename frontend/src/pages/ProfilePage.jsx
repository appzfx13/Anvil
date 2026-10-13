import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  Save,
  CheckCircle2,
  Terminal,
  Zap,
  Globe,
  Radio,
  FileCode,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function ProfilePage({
  user,
  account,
  onRefreshAccount,
  onUpdateUser,
  addToast,
  onNavigate,
}) {
  // Compute initial first and last name from user
  const getInitialNames = () => {
    if (!user) return { first: '', last: '' };
    if (user.first_name || user.last_name) {
      return {
        first: user.first_name || '',
        last: user.last_name || '',
      };
    }
    const full = (user.full_name || '').trim();
    if (!full) return { first: '', last: '' };
    const parts = full.split(' ');
    return {
      first: parts[0] || '',
      last: parts.slice(1).join(' ') || '',
    };
  };

  const initialNames = getInitialNames();
  const [firstName, setFirstName] = useState(initialNames.first);
  const [lastName, setLastName] = useState(initialNames.last);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Marmot Credentials State
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeSnippetTab, setActiveSnippetTab] = useState('env');

  // Keep local form in sync when user prop updates
  useEffect(() => {
    const updated = getInitialNames();
    setFirstName(updated.first);
    setLastName(updated.last);
  }, [user?.full_name, user?.first_name, user?.last_name]);

  const isAdmin = Boolean(user?.is_staff || user?.is_superuser);
  const userInitial = firstName ? firstName.charAt(0).toUpperCase() : (user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'T');
  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';
  const clientSecret = user?.client_secret || 'sec_anvil_live_sandbox_secret';
  const accessToken = user?.access_token || localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_token';

  const brokerBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/v2` : 'http://localhost:8500/v2';
  const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8500';
  const wsFeedUrl = `${wsProtocol}//${wsHost}/v2/marketfeed/ws`;

  const isFormDirty = firstName !== initialNames.first || lastName !== initialNames.last;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (addToast) addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Profile Update Submission
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!firstName.trim()) {
      if (addToast) addToast('error', 'First name cannot be empty.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await api.auth.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });

      if (res && res.user) {
        if (onUpdateUser) {
          onUpdateUser(res.user);
        }
        if (onRefreshAccount) {
          onRefreshAccount();
        }
        setSaveSuccess(true);
        if (addToast) {
          addToast('success', 'Profile updated successfully!');
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      if (addToast) {
        addToast('error', err.message || 'Failed to update profile.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetForm = () => {
    setFirstName(initialNames.first);
    setLastName(initialNames.last);
  };

  // Regenerate API Credentials
  const handleRegenerateKeys = async () => {
    if (!window.confirm('Are you sure you want to regenerate your Marmot API Access Token and Secret? Any running Marmot bot instances will need to be updated with the new credentials.')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await api.auth.resetCredentials();
      if (res && res.user && onUpdateUser) {
        onUpdateUser(res.user);
      }
      if (onRefreshAccount) {
        onRefreshAccount();
      }
      if (addToast) {
        addToast('success', 'Marmot API credentials regenerated successfully!');
      }
    } catch (err) {
      if (addToast) {
        addToast('error', err.message || 'Failed to regenerate credentials.');
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const envSnippet = `# Marmot Trading Bot Gateway Configuration (Anvil Sandbox)
DHAN_CLIENT_ID=${clientId}
DHAN_ACCESS_TOKEN=${accessToken}
DHAN_CLIENT_SECRET=${clientSecret}
DHAN_BASE_URL=${brokerBaseUrl}
ANVIL_FEED_WS_URL=${wsFeedUrl}`;

  const pythonSnippet = `from marmot import MarmotGateway

gateway = MarmotGateway(
    client_id="${clientId}",
    access_token="${accessToken}",
    client_secret="${clientSecret}",
    base_url="${brokerBaseUrl}",
    ws_feed_url="${wsFeedUrl}"
)
gateway.connect()`;

  const jsonSnippet = JSON.stringify({
    dhan_client_id: clientId,
    access_token: accessToken,
    client_secret: clientSecret,
    base_url: brokerBaseUrl,
    ws_feed_url: wsFeedUrl,
    broker_name: "ANVIL High-Speed Matching Engine",
    sandbox_mode: true
  }, null, 2);

  return (
    <div id="profile-page-container" style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#818cf8',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Account Settings
          </div>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Trader Profile & API Keys</span>
        </div>
        <h1
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            margin: '0 0 6px 0',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          User Profile & Marmot Gateway
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
          Manage your personal trader identity and access your dedicated Dhan-compatible API credentials for Marmot bot automated execution.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 (TOP): PROFILE FORM LAYOUT (First Name, Last Name, Email Locked) */}
      {/* ========================================================================= */}
      <div
        id="profile-form-layout-card"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.8) 0%, rgba(11, 15, 25, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '28px',
          marginBottom: '32px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle accent glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '280px',
            height: '280px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Section Header with Avatar & Status */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '26px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar Pill */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                color: '#ffffff',
                fontSize: '1.6rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(99, 102, 241, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              {userInitial}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : (user?.full_name || 'Sandbox Trader')}
                </h2>
                <span
                  style={{
                    padding: '3px 9px',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: isAdmin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: isAdmin ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                    color: isAdmin ? '#f87171' : '#34d399',
                  }}
                >
                  {isAdmin ? 'Super Admin' : 'Quant Trader'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                  Dhan Client ID: <strong style={{ color: '#e2e8f0' }}>{clientId}</strong>
                </span>
                <span style={{ color: '#475569' }}>•</span>
                <span style={{ fontSize: '0.82rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Virtual Ledger Active
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '10px',
                padding: '10px 16px',
                textAlign: 'right',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Available Margin
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                ₹{Number(account?.available_balance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSaveProfile}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            {/* 1. First Name (Editable) */}
            <div>
              <label
                htmlFor="profile-first-name"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '8px',
                }}
              >
                First Name <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                id="profile-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
              />
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '5px' }}>
                Your given name displayed on the terminal and order tickets.
              </div>
            </div>

            {/* 2. Last Name (Editable) */}
            <div>
              <label
                htmlFor="profile-last-name"
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: '8px',
                }}
              >
                Last Name
              </label>
              <input
                id="profile-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '9px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#6366f1')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)')}
              />
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '5px' }}>
                Your family or legal surname.
              </div>
            </div>

            {/* 3. Email Address (STRICTLY READ-ONLY / CANNOT BE EDITED) */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label
                  htmlFor="profile-email-readonly"
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  Email Address
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#f87171',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                    }}
                  >
                    <Lock size={10} /> Locked / Non-Editable
                  </span>
                </label>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="profile-email-readonly"
                  type="email"
                  value={user?.email || 'trader@anvil.local'}
                  disabled
                  readOnly
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 40px',
                    borderRadius: '9px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box',
                  }}
                  title="Email cannot be changed"
                />
                <Lock
                  size={16}
                  color="#64748b"
                  style={{
                    position: 'absolute',
                    left: '13px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '0.74rem',
                  color: '#94a3b8',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Shield size={12} color="#6366f1" />
                <span>
                  For compliance and audit-trail integrity, your login email is immutable and cannot be edited.
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '18px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isFormDirty ? (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <AlertTriangle size={13} />
                  Unsaved changes
                </span>
              ) : saveSuccess ? (
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <CheckCircle2 size={13} />
                  Profile updated successfully!
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  All changes saved
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isFormDirty && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#94a3b8',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
              )}

              <button
                id="btn-save-profile"
                type="submit"
                disabled={isSaving || !isFormDirty}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: isFormDirty
                    ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
                    : 'rgba(99, 102, 241, 0.25)',
                  border: 'none',
                  color: isFormDirty ? '#ffffff' : '#818cf8',
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  cursor: isFormDirty ? 'pointer' : 'default',
                  boxShadow: isFormDirty ? '0 4px 14px rgba(99, 102, 241, 0.4)' : 'none',
                  opacity: isSaving ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isSaving ? (
                  <>
                    <RefreshCw size={14} className="spin-slow" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Profile Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 (BOTTOM): SEPARATE LAYOUT FOR MARMOT API CREDENTIALS           */}
      {/* ========================================================================= */}
      <div
        id="marmot-api-credentials-card"
        style={{
          background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(9, 14, 26, 0.98) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 40px rgba(56, 189, 248, 0.05)',
          position: 'relative',
        }}
      >
        {/* Glow corner */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
              }}
            >
              <KeyRound size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  Marmot Bot Connection & API Credentials
                </h2>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                  }}
                >
                  DHAN v2 COMPATIBLE
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                Plug these credentials into your Marmot trading engine to stream real-time ticks and execute algorithmic orders directly into Anvil.
              </p>
            </div>
          </div>

          {/* Regenerate Action */}
          <button
            id="btn-regenerate-marmot-keys"
            onClick={handleRegenerateKeys}
            disabled={isRegenerating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Generate new Access Token and Client Secret"
          >
            <RotateCcw size={13} className={isRegenerating ? 'spin-slow' : ''} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate API Keys'}
          </button>
        </div>

        {/* Credentials Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* 1. Dhan Client ID */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DHAN_CLIENT_ID
              </span>
              <button
                onClick={() => copyToClipboard(clientId, 'client_id')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'client_id' ? '#10b981' : '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'client_id' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'client_id' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.05em',
              }}
            >
              {clientId}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Your unique sandbox trading account identifier
            </div>
          </div>

          {/* 2. Access Token */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DHAN_ACCESS_TOKEN
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => copyToClipboard(accessToken, 'access_token')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedKey === 'access_token' ? '#10b981' : '#38bdf8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {copiedKey === 'access_token' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'access_token' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#38bdf8',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {showToken ? accessToken : '••••••••••••••••••••••••••••••••'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Bearer authentication token for HTTP & Order API
            </div>
          </div>

          {/* 3. Client Secret */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DHAN_CLIENT_SECRET
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => copyToClipboard(clientSecret, 'client_secret')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedKey === 'client_secret' ? '#10b981' : '#38bdf8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {copiedKey === 'client_secret' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'client_secret' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#a855f7',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {showSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Cryptographic signature key for secure requests
            </div>
          </div>

          {/* 4. Dhan API Base URL */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                DHAN_BASE_URL (REST)
              </span>
              <button
                onClick={() => copyToClipboard(brokerBaseUrl, 'base_url')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'base_url' ? '#10b981' : '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'base_url' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'base_url' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#ffffff',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {brokerBaseUrl}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              HTTP endpoint for order placement, positions & margins
            </div>
          </div>

          {/* 5. WebSocket Feed Endpoint */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              padding: '14px 16px',
              gridColumn: '1 / -1',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ANVIL_FEED_WS_URL (WEBSOCKET)
              </span>
              <button
                onClick={() => copyToClipboard(wsFeedUrl, 'ws_url')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'ws_url' ? '#10b981' : '#38bdf8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'ws_url' ? <Check size={12} /> : <Copy size={12} />}
                {copiedKey === 'ws_url' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#34d399',
                fontFamily: 'var(--font-mono)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {wsFeedUrl}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
              Sub-millisecond market feed socket for real-time Dhan / Fyers quotes & depth
            </div>
          </div>
        </div>

        {/* 1-Click Marmot Configuration Block */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Snippet Header Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={15} color="#38bdf8" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ffffff' }}>
                Marmot Ready-To-Paste Config:
              </span>

              <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                {['env', 'python', 'json'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '5px',
                      border: 'none',
                      background: activeSnippetTab === tab ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: activeSnippetTab === tab ? '#38bdf8' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    .{tab}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const textToCopy =
                  activeSnippetTab === 'env'
                    ? envSnippet
                    : activeSnippetTab === 'python'
                    ? pythonSnippet
                    : jsonSnippet;
                copyToClipboard(textToCopy, 'full_snippet');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '6px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#38bdf8',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {copiedKey === 'full_snippet' ? <Check size={13} /> : <Copy size={13} />}
              {copiedKey === 'full_snippet' ? 'Copied Full Snippet!' : 'Copy Config Snippet'}
            </button>
          </div>

          {/* Snippet Code View */}
          <pre
            style={{
              margin: 0,
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              lineHeight: 1.6,
              overflowX: 'auto',
              background: '#040711',
            }}
          >
            {activeSnippetTab === 'env' && envSnippet}
            {activeSnippetTab === 'python' && pythonSnippet}
            {activeSnippetTab === 'json' && jsonSnippet}
          </pre>
        </div>

        {/* Quick Connection Help Callout */}
        <div
          style={{
            marginTop: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.05)',
            border: '1px solid rgba(56, 189, 248, 0.15)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <Sparkles size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffffff' }}>How Marmot executes trades:</strong> Simply copy the <code style={{ color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '4px' }}>.env</code> snippet above into your Marmot project's root folder or container environment. Marmot will automatically pass the <code style={{ color: '#38bdf8' }}>client-id</code> and <code style={{ color: '#38bdf8' }}>access-token</code> headers with each order, instantly routing trades into Anvil's ultra-low latency matching engine.
          </div>
        </div>
      </div>
    </div>
  );
}
