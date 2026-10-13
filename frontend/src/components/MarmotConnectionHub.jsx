import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Key,
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
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api';

export default function MarmotConnectionHub({
  user,
  siteConfig,
  onRefreshAccount,
  addToast,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
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

  // Regenerate state
  const [isRegenerating, setIsRegenerating] = useState(false);

  const brokerBaseUrl = window.location.origin;
  const clientId = user?.dhan_client_id || localStorage.getItem('anvil_client_id') || '1000000001';
  const clientSecret = user?.client_secret || 'sec_anvil_live_sandbox_secret';
  const accessToken = user?.access_token || localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_token';

  // Load current postback webhook URL
  useEffect(() => {
    const loadPostback = async () => {
      try {
        const res = await api.account.getPostback();
        if (res?.postback_webhook_url) {
          setPostbackUrl(res.postback_webhook_url);
        } else if (siteConfig?.postback_webhook_url) {
          setPostbackUrl(siteConfig.postback_webhook_url);
        }
      } catch (e) {
        console.error('Failed to load postback webhook config:', e);
      }
    };
    loadPostback();
  }, [siteConfig]);

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

  const isFeedActive = siteConfig?.feed_status === 'ACTIVE' || siteConfig?.has_token;

  return (
    <div id="marmot-connection-hub" className="marmot-hub-panel">
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Terminal size={22} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', color: '#ffffff', margin: 0, fontWeight: 700 }}>
                MARMOT SANDBOX TERMINAL GATEWAY
              </h3>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontWeight: 600,
                  background: isFeedActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: isFeedActive ? 'var(--bull-green)' : 'var(--warn-amber)',
                  border: isFeedActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isFeedActive ? '#10b981' : '#f59e0b',
                  }}
                />
                {isFeedActive ? 'FYERS FEED LIVE' : 'FEED DISCONNECTED'}
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
              Connect MARMOT via App ID & Client Secret to fetch permanent tokens, stream Fyers Level-1 ticks, and dispatch Dhan v2 postbacks.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
          {/* Credentials Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginBottom: '20px',
            }}
          >
            {/* Broker Base URL */}
            <div
              style={{
                background: 'rgba(10, 15, 29, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>BROKER BASE URL (DHAN v2 WIRE)</span>
                <button
                  id="copy-broker-base-url-btn"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(brokerBaseUrl, 'base-url'); }}
                  style={{ background: 'transparent', border: 'none', color: copiedKey === 'base-url' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {copiedKey === 'base-url' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                {brokerBaseUrl}
              </div>
            </div>

            {/* Client ID / App ID */}
            <div
              style={{
                background: 'rgba(10, 15, 29, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>APP ID / CLIENT ID</span>
                <button
                  id="copy-marmot-client-id-btn"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(clientId, 'marmot-client-id'); }}
                  style={{ background: 'transparent', border: 'none', color: copiedKey === 'marmot-client-id' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {copiedKey === 'marmot-client-id' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#ffffff', fontWeight: 600 }}>
                {clientId}
              </div>
            </div>

            {/* Client Secret */}
            <div
              style={{
                background: 'rgba(10, 15, 29, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>CLIENT SECRET</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    id="copy-marmot-client-secret-btn"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(clientSecret, 'marmot-secret'); }}
                    style={{ background: 'transparent', border: 'none', color: copiedKey === 'marmot-secret' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {copiedKey === 'marmot-secret' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#fb7185', wordBreak: 'break-all' }}>
                {showSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
              </div>
            </div>

            {/* Permanent Sandbox Access Token */}
            <div
              style={{
                background: 'rgba(10, 15, 29, 0.7)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>PERMANENT ACCESS TOKEN</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    id="copy-marmot-token-btn"
                    onClick={(e) => { e.stopPropagation(); copyToClipboard(accessToken, 'marmot-token'); }}
                    style={{ background: 'transparent', border: 'none', color: copiedKey === 'marmot-token' ? 'var(--bull-green)' : 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    {copiedKey === 'marmot-token' ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#a7f3d0', wordBreak: 'break-all' }}>
                {showToken ? accessToken : `${accessToken.substring(0, 16)}••••••••••••`}
              </div>
            </div>
          </div>

          {/* Quick Action Verification Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                id="test-token-exchange-btn"
                className="btn-secondary"
                onClick={handleTestTokenExchange}
                disabled={testingToken}
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: tokenTestSuccess === true ? 'var(--bull-green)' : 'var(--text-primary)',
                  borderColor: tokenTestSuccess === true ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                }}
              >
                {testingToken ? <RefreshCw size={14} className="spin" /> : tokenTestSuccess ? <CheckCircle2 size={14} /> : <Key size={14} />}
                {tokenTestSuccess ? 'Token Exchange Verified' : 'Verify Token via POST /v2/token'}
              </button>

              <button
                id="regenerate-keys-btn"
                className="btn-secondary"
                onClick={handleRegenerateCredentials}
                disabled={isRegenerating}
                style={{
                  fontSize: '0.82rem',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--warn-amber)',
                }}
              >
                <RefreshCw size={14} className={isRegenerating ? 'spin' : ''} />
                Regenerate Credentials
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Protocol: <span style={{ color: '#38bdf8', fontWeight: 600 }}>DhanHQ REST v2 Wire</span> • Port: <span style={{ color: '#ffffff' }}>8500</span>
            </div>
          </div>

          {/* Postback Webhook Configuration Bar */}
          <div
            style={{
              background: 'rgba(10, 15, 29, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '12px',
              padding: '16px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={16} color="var(--accent-primary)" />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                  MARMOT DHAN v2 POSTBACK WEBHOOK URL
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Fires on: PENDING, TRADED, CANCELLED, REJECTED
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                id="postback-webhook-url-input"
                type="text"
                value={postbackUrl}
                onChange={(e) => setPostbackUrl(e.target.value)}
                placeholder="e.g. http://localhost:8080/api/webhook/dhan or external ngrok webhook"
                style={{
                  flex: 1,
                  minWidth: '280px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.86rem',
                }}
              />
              <button
                id="save-postback-url-btn"
                className="btn-primary"
                onClick={handleSavePostback}
                disabled={savingPostback}
                style={{ padding: '10px 18px', fontSize: '0.84rem' }}
              >
                {savingPostback ? 'Saving...' : 'Save Webhook'}
              </button>
              <button
                id="test-postback-probe-btn"
                className="btn-secondary"
                onClick={handleTestPostback}
                disabled={testingPostback}
                style={{
                  padding: '10px 18px',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#38bdf8',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                }}
              >
                <Zap size={15} />
                {testingPostback ? 'Testing Probe...' : 'Test Postback'}
              </button>
            </div>

            {/* Test result status badge */}
            {lastProbeResult && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: lastProbeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                  border: `1px solid ${lastProbeResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
                  fontSize: '0.8rem',
                  color: lastProbeResult.success ? '#a7f3d0' : '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>
                  {lastProbeResult.success
                    ? `✓ Postback probe dispatched to ${lastProbeResult.target_url} — Target returned HTTP ${lastProbeResult.http_status}`
                    : `✗ Probe failed: ${lastProbeResult.error}`}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Event: TEST_PROBE
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
