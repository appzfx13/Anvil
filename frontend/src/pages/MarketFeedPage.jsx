import React, { useState, useEffect } from 'react';
import {
  Radio,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Globe,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';

export default function MarketFeedPage({
  user,
  ticks = {},
  addToast,
}) {
  const [appId, setAppId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [feedStatus, setFeedStatus] = useState('DISCONNECTED');
  const [hasToken, setHasToken] = useState(false);
  const [lastError, setLastError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Origin callback URL
  const defaultCallback = typeof window !== 'undefined'
    ? `${window.location.origin}/api/fyers/callback/`
    : 'http://localhost:8500/api/fyers/callback/';

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.fyers.getConfig();
      if (res) {
        setAppId(res.app_id || '');
        setSecretKey(res.secret_key || '');
        setAccessToken(res.has_token ? '••••••••••••••••••••••••••••••••' : '');
        setRedirectUri(res.redirect_uri || defaultCallback);
        setFeedStatus(res.feed_status || 'DISCONNECTED');
        setHasToken(res.has_token || false);
        setLastError(res.last_error || '');
      }
    } catch (err) {
      addToast('error', 'Failed to load broker data feed configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();

    // Check query params if redirected back from Fyers
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('fyers_auth');
    if (authStatus === 'success') {
      addToast('success', 'Fyers Broker Data Feed authenticated successfully! Real-time ticks active.');
      loadConfig();
    } else if (authStatus === 'error') {
      const msg = urlParams.get('msg') || 'Fyers authentication was declined.';
      addToast('error', `Fyers Auth Error: ${msg}`);
      setLastError(msg);
    }
  }, []);

  const handleCopyRedirect = () => {
    const urlToCopy = redirectUri || defaultCallback;
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    addToast('success', 'Redirect URL copied! Paste it in your Fyers Developer Dashboard.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!appId.trim()) {
      addToast('error', 'Fyers App ID is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        app_id: appId.trim(),
        secret_key: secretKey.trim(),
        redirect_uri: redirectUri.trim() || defaultCallback,
      };

      if (accessToken && !accessToken.includes('••••')) {
        payload.access_token = accessToken.trim();
      }

      const res = await api.fyers.saveConfig(payload);
      addToast('success', 'Broker configuration saved to Site Configuration table.');
      setHasToken(res.has_token);
      setFeedStatus(res.feed_status);
      setLastError(res.last_error || '');
    } catch (err) {
      addToast('error', err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartFyersAuth = async () => {
    if (!appId.trim()) {
      addToast('error', 'Please enter and save your Fyers App ID first.');
      return;
    }

    try {
      // Auto-save first
      await api.fyers.saveConfig({
        app_id: appId.trim(),
        secret_key: secretKey.trim(),
        redirect_uri: redirectUri.trim() || defaultCallback,
      });

      const res = await api.fyers.getAuthUrl(redirectUri.trim() || defaultCallback);
      if (res && res.auth_url) {
        addToast('info', 'Redirecting to Fyers Login Portal...');
        window.location.href = res.auth_url;
      } else {
        addToast('error', 'Failed to generate Fyers authentication URL.');
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to initialize Fyers authentication.');
    }
  };

  const handleTestFeed = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.fyers.testFeed();
      setTestResult(res);
      if (res.status === 'OK') {
        addToast('success', `Feed Connected: NIFTY 50 @ ₹${res.nifty_ltp}`);
        setFeedStatus('CONNECTED');
        setHasToken(true);
      } else {
        addToast('error', `Feed Test: ${res.message || 'Connection failed'}`);
      }
    } catch (err) {
      addToast('error', err.message || 'Feed connection test failed.');
      setTestResult({ status: 'ERROR', message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div id="market-feed-page" className="profile-page-shell">
      
      {/* Profile-Consistent Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="profile-header-badge">
          <div className="profile-category-pill cyan">INTEGRATIONS</div>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Fyers API v3 Streaming Feed</span>
          <span
            className={hasToken ? 'pill-badge badge-emerald' : 'pill-badge badge-amber'}
            style={{ fontSize: '0.66rem', fontWeight: 700, marginLeft: 'auto' }}
          >
            {hasToken ? '● FYERS v3 ACTIVE' : '○ TOKEN REQUIRED'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="profile-page-title">
              Market Data Feed Configuration
            </h1>
            <p className="profile-page-subtitle">
              Connect Fyers API v3 WebSocket streaming & Level-1 quotes for real-time market data across all ANVIL terminals.
            </p>
          </div>

          {/* Top Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleTestFeed}
              disabled={testing}
              className="profile-btn-ghost"
            >
              <RefreshCw size={14} className={testing ? 'spin' : ''} />
              <span>{testing ? 'Testing Feed...' : 'Test Feed Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Banner */}
      <div className="profile-card" style={{ padding: '22px 26px', marginBottom: '24px' }}>
        <div className={`profile-card-glow ${hasToken ? 'emerald' : 'amber'}`} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: hasToken ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${hasToken ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={22} color={hasToken ? '#10b981' : '#f59e0b'} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>
                  {hasToken ? 'Fyers WebSocket Stream Live' : 'Fyers Data Feed Not Authenticated'}
                </span>
                <span className={hasToken ? 'pill-badge badge-emerald' : 'pill-badge badge-amber'} style={{ fontSize: '0.66rem' }}>
                  {feedStatus}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
                {hasToken
                  ? 'Level-1 real quotes streaming for NIFTY 50, BANK NIFTY, FIN NIFTY, and full option chains.'
                  : 'Click "Authenticate with Fyers" below to log in and authorize live market feed.'}
              </div>
            </div>
          </div>

          {/* Right CTA */}
          <button
            onClick={handleStartFyersAuth}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              color: '#000000',
              fontWeight: 800,
              borderRadius: '10px',
              padding: '11px 20px',
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <ExternalLink size={15} />
            <span>{hasToken ? 'Re-Authenticate with Fyers' : 'Authenticate with Fyers'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Credentials Form (Left) + Callback & Docs (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) 380px', gap: '24px', marginBottom: '24px' }}>
        
        {/* Form: App ID, Secret Key, Token */}
        <div className="profile-card" style={{ marginBottom: 0 }}>
          <div className="profile-card-glow cyan" />
          <div className="profile-card-header">
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="#06b6d4" />
                <span>Fyers API v3 App Credentials</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                Created in your Fyers API dashboard (myapi.fyers.in). Stored securely in database.
              </p>
            </div>
            <span className="profile-category-pill cyan">LEVEL-1 QUOTES</span>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative', zIndex: 1 }}>
            {/* App ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>
                FYERS APP ID <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="e.g. A1B2C3D4-100"
                className="profile-input"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Secret Key */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>
                  SECRET KEY <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showSecret ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <input
                type={showSecret ? 'text' : 'password'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="profile-input"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Manual Access Token (Optional) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 700 }}>
                ACCESS TOKEN (MANUAL OVERRIDE OR AUTO-GENERATED)
              </label>
              <input
                type="text"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={hasToken ? '••••••••••••••••••••••••••••••••' : 'Paste manual token or click Authenticate'}
                className="profile-input"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={saving}
                className="profile-btn-primary"
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}
              >
                {saving ? <RefreshCw size={15} className="spin" /> : <Check size={15} />}
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Callback URL & Setup Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Redirect URI Card */}
          <div className="profile-card" style={{ padding: '22px', marginBottom: 0 }}>
            <div className="profile-card-header" style={{ marginBottom: '14px', paddingBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={16} color="#06b6d4" />
                  <span>OAuth 2.0 Redirect Callback URL</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '12px' }}>
              Paste this exact URL into the "Redirect URI" field in your Fyers App dashboard:
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '10px 12px' }}>
              <span style={{ flex: 1, fontSize: '0.78rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                {redirectUri || defaultCallback}
              </span>
              <button
                type="button"
                onClick={handleCopyRedirect}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                title="Copy Redirect URL"
              >
                {copied ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
              </button>
            </div>
          </div>

          {/* Setup Steps */}
          <div className="profile-card" style={{ padding: '22px', marginBottom: 0 }}>
            <div className="profile-card-header" style={{ marginBottom: '14px', paddingBottom: '14px' }}>
              <div style={{ fontSize: '0.96rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#10b981" />
                <span>Setup in 3 Steps</span>
              </div>
            </div>
            <ol style={{ paddingLeft: '18px', margin: 0, fontSize: '0.8rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <li>
                Open <strong>myapi.fyers.in</strong> and copy your <strong>App ID</strong> & <strong>Secret Key</strong>.
              </li>
              <li>
                Ensure the <strong>Redirect URI</strong> matches the callback URL shown above.
              </li>
              <li>
                Click <strong>Authenticate with Fyers</strong> to login with your Fyers credentials. The session token is stored automatically!
              </li>
            </ol>
          </div>

          {/* Test Result Info */}
          {testResult && (
            <div
              className="profile-card"
              style={{
                padding: '16px 20px',
                marginBottom: 0,
                background: testResult.status === 'OK' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                border: `1px solid ${testResult.status === 'OK' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: testResult.status === 'OK' ? '#10b981' : '#f43f5e', marginBottom: '4px' }}>
                {testResult.status === 'OK' ? '✓ Feed Connection Successful' : '✗ Feed Connection Failed'}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
                {testResult.message || `Connected to Fyers. NIFTY 50 quote: ₹${testResult.nifty_ltp}`}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
