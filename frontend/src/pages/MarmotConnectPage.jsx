import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Terminal,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  Send,
  Zap,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  Power
} from 'lucide-react';
import { api } from '../services/api';

export default function MarmotConnectPage({
  user,
  account,
  onRefreshAccount,
  addToast,
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Postback webhook state
  const [postbackUrl, setPostbackUrl] = useState('');
  const [savingPostback, setSavingPostback] = useState(false);
  const [testingPostback, setTestingPostback] = useState(false);
  const [lastProbeResult, setLastProbeResult] = useState(null);

  // Token exchange test state
  const [testingToken, setTestingToken] = useState(false);
  const [tokenTestSuccess, setTokenTestSuccess] = useState(null);

  // Regenerate credentials state
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Kill switch state
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  const brokerBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8500';
  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';
  const clientSecret = user?.client_secret || 'sec_anvil_live_sandbox_secret';
  const accessToken = user?.access_token || localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_token';
  const killSwitchActive = !!user?.is_kill_switch_active;

  // Load current postback webhook URL
  useEffect(() => {
    const loadPostback = async () => {
      try {
        const res = await api.account.getPostback();
        if (res?.postback_webhook_url) {
          setPostbackUrl(res.postback_webhook_url);
        }
      } catch (e) {
        console.error('Failed to load postback webhook config:', e);
      }
    };
    loadPostback();
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleSavePostback = async () => {
    if (!postbackUrl.trim()) {
      addToast('error', 'Please enter a valid webhook URL.');
      return;
    }
    setSavingPostback(true);
    try {
      await api.account.savePostback(postbackUrl.trim());
      addToast('success', 'Postback webhook URL saved successfully!');
    } catch (err) {
      addToast('error', err.message || 'Failed to save postback webhook URL.');
    } finally {
      setSavingPostback(false);
    }
  };

  const handleTestPostback = async () => {
    setTestingPostback(true);
    setLastProbeResult(null);
    try {
      const res = await api.account.testPostback();
      setLastProbeResult(res);
      if (res.success) {
        addToast('success', `Dhan postback delivered! Target HTTP ${res.http_status}`);
      } else {
        addToast('error', res.error || 'Postback delivery probe failed.');
      }
    } catch (err) {
      setLastProbeResult({ success: false, error: err.message });
      addToast('error', err.message || 'Postback test probe failed.');
    } finally {
      setTestingPostback(false);
    }
  };

  const handleTestTokenExchange = async () => {
    setTestingToken(true);
    setTokenTestSuccess(null);
    try {
      const res = await api.dhan.getToken(clientId, clientSecret);
      if (res.status === 'success') {
        setTokenTestSuccess(true);
        addToast('success', 'MARMOT Token Verified! Permanent Sandbox token is active.');
      } else {
        setTokenTestSuccess(false);
        addToast('error', res.remarks || 'Token exchange failed.');
      }
    } catch (err) {
      setTokenTestSuccess(false);
      addToast('error', err.message || 'Token verification failed.');
    } finally {
      setTestingToken(false);
    }
  };

  const handleRegenerateCredentials = async () => {
    if (!window.confirm('Regenerate Client Secret and Access Token? Any running MARMOT terminal will need the new credentials.')) {
      return;
    }
    setIsRegenerating(true);
    try {
      await api.auth.resetCredentials();
      addToast('success', 'Credentials regenerated successfully!');
      if (onRefreshAccount) onRefreshAccount();
    } catch (err) {
      addToast('error', err.message || 'Failed to regenerate credentials.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    const nextState = !killSwitchActive;
    if (nextState && !window.confirm('Engage Emergency Kill Switch? This will instantly reject all incoming orders from MARMOT and cancel all open pending orders.')) {
      return;
    }
    setKillSwitchLoading(true);
    try {
      const res = await api.account.toggleKillSwitch(nextState);
      if (res?.success) {
        addToast(nextState ? 'warning' : 'success', res.message || `Kill switch ${nextState ? 'ACTIVATED' : 'DEACTIVATED'}`);
        if (onRefreshAccount) onRefreshAccount();
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to toggle kill switch.');
    } finally {
      setKillSwitchLoading(false);
    }
  };



  return (
    <div id="marmot-connect-page" className="profile-page-shell">
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="profile-header-badge">
          <div className="profile-category-pill emerald">
            Integrations
          </div>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Marmot Bot & Dhan v2 Gateway</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="profile-page-title">
              Marmot Connect & Sandbox Gateway
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  background: 'rgba(52, 211, 153, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              >
                DHAN v2 COMPATIBLE
              </span>
            </h1>
            <p className="profile-page-subtitle">
              Direct client credentials, algorithmic trading keys, postback webhook dispatch, and live safety controls.
            </p>
          </div>

          {/* Top Actions: Kill Switch & Health Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              id="marmot-page-kill-switch-btn"
              onClick={handleToggleKillSwitch}
              disabled={killSwitchLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: killSwitchLoading ? 'not-allowed' : 'pointer',
                background: killSwitchActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                color: killSwitchActive ? '#ef4444' : '#f87171',
                border: killSwitchActive ? '1px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: killSwitchActive ? '0 0 16px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Power size={15} />
              <span>{killSwitchActive ? 'KILL SWITCH ENGAGED' : 'Kill Switch (Disarm)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kill Switch Active Warning Banner */}
      {killSwitchActive && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)',
          }}
        >
          <AlertTriangle size={22} color="#ef4444" />
          <div style={{ flex: 1, fontSize: '0.88rem', color: '#fca5a5' }}>
            <strong>EMERGENCY KILL SWITCH IS ACTIVE:</strong> All incoming order requests from MARMOT or Python bots are rejected immediately with Dhan status REJECTED.
          </div>
          <button
            onClick={handleToggleKillSwitch}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Deactivate Now
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1: CREDENTIALS OBSIDIAN CARD (Profile Theme Matching) */}
      {/* ========================================================================= */}
      <div className="profile-card">
        <div className="profile-card-glow emerald" />

        {/* Card Header */}
        <div className="profile-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={22} color="#34d399" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Marmot Bot Connection & API Credentials
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="regenerate-keys-btn"
              onClick={handleRegenerateCredentials}
              disabled={isRegenerating}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#f87171',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: isRegenerating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={13} className={isRegenerating ? 'spin' : ''} />
              <span>{isRegenerating ? 'Regenerating...' : 'Regenerate API Keys'}</span>
            </button>
          </div>
        </div>

        {/* Credentials Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {/* 1. Broker Base URL */}
          <div className="profile-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                1. BROKER GATEWAY BASE URL
              </span>
              <button
                onClick={() => copyToClipboard(brokerBaseUrl, 'base-url')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'base-url' ? '#10b981' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'base-url' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'base-url' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92rem', color: '#38bdf8', wordBreak: 'break-all', fontWeight: 700 }}>
              {brokerBaseUrl}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
              Set as target base URL for Marmot or DhanHQ client.
            </div>
          </div>

          {/* 2. Client ID */}
          <div className="profile-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                2. DHAN CLIENT ID / APP ID
              </span>
              <button
                onClick={() => copyToClipboard(clientId, 'client-id')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'client-id' ? '#10b981' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                }}
              >
                {copiedKey === 'client-id' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'client-id' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>
              {clientId}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
              Unique 10-digit sandbox trader identifier.
            </div>
          </div>

          {/* 3. Client Secret */}
          <div className="profile-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                3. CLIENT SECRET
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  title={showSecret ? 'Hide Secret' : 'Reveal Secret'}
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => copyToClipboard(clientSecret, 'secret')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedKey === 'secret' ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {copiedKey === 'secret' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'secret' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#fbbf24', wordBreak: 'break-all', fontWeight: 600 }}>
              {showSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
              Used for token exchange and payload HMAC verification.
            </div>
          </div>

          {/* 4. Access Token */}
          <div className="profile-tile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                4. DHAN ACCESS TOKEN
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  title={showToken ? 'Hide Token' : 'Reveal Token'}
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => copyToClipboard(accessToken, 'token')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: copiedKey === 'token' ? '#10b981' : '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                  }}
                >
                  {copiedKey === 'token' ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedKey === 'token' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#10b981', wordBreak: 'break-all', fontWeight: 600 }}>
              {showToken ? accessToken : '••••••••••••••••••••••••••••••••'}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '6px' }}>
              Permanent Sandbox wire bearer token.
            </div>
          </div>
        </div>

        {/* Action Row: Token Test */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            id="test-token-exchange-btn"
            onClick={handleTestTokenExchange}
            disabled={testingToken}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: testingToken ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Zap size={14} />
            <span>{testingToken ? 'Testing Token...' : 'Test Token Exchange Wire'}</span>
          </button>

          {tokenTestSuccess === true && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={15} /> Token Wire Active & Verified
            </span>
          )}
          {tokenTestSuccess === false && (
            <span style={{ fontSize: '0.8rem', color: '#f43f5e', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <AlertTriangle size={15} /> Verification Failed
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: POSTBACK WEBHOOK OBSIDIAN CARD (Profile Theme Matching) */}
      {/* ========================================================================= */}
      <div className="profile-card">
        <div className="profile-card-glow cyan" />

        {/* Card Header */}
        <div className="profile-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} color="#06b6d4" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Order Postback Webhook Dispatcher
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: 'rgba(6, 182, 212, 0.15)',
                    color: '#06b6d4',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                  }}
                >
                  REAL-TIME DISPATCH
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                Whenever orders are filled, modified, or cancelled, ANVIL dispatches instant HTTP POST payloads matching Dhan v2 Webhook specs.
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Input & Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            id="postback-webhook-input"
            type="url"
            value={postbackUrl}
            onChange={(e) => setPostbackUrl(e.target.value)}
            placeholder="https://your-bot-or-marmot.domain/api/dhan/webhook/"
            className="profile-input"
            style={{
              flex: 1,
              minWidth: '280px',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <button
            id="save-postback-btn"
            onClick={handleSavePostback}
            disabled={savingPostback}
            style={{
              padding: '12px 24px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: savingPostback ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {savingPostback ? 'Saving...' : 'Save Webhook'}
          </button>
          <button
            id="test-postback-probe-btn"
            onClick={handleTestPostback}
            disabled={testingPostback || !postbackUrl.trim()}
            style={{
              padding: '12px 20px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: (testingPostback || !postbackUrl.trim()) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={14} />
            <span>{testingPostback ? 'Probing...' : 'Send Test Ping'}</span>
          </button>
        </div>

        {/* Test Probe Result */}
        {lastProbeResult && (
          <div
            style={{
              marginTop: '16px',
              padding: '14px 18px',
              borderRadius: '10px',
              fontSize: '0.84rem',
              background: lastProbeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: lastProbeResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: lastProbeResult.success ? '#10b981' : '#f43f5e',
            }}
          >
            {lastProbeResult.success ? (
              <div>
                <strong>Webhook Probe Succeeded:</strong> Target responded with HTTP {lastProbeResult.http_status}
              </div>
            ) : (
              <div>
                <strong>Webhook Probe Failed:</strong> {lastProbeResult.error || 'Connection refused or timeout'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
