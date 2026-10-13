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
  FileCode,
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
  const [activeSnippetTab, setActiveSnippetTab] = useState('env'); // 'env' | 'python' | 'json'

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

  // Code snippets
  const marmotEnvSnippet = `# Marmot Trading Bot Configuration
# Connect MARMOT Algo Strategy Engine to ANVIL Dhan v2 Sandbox Wire
DHAN_CLIENT_ID="${clientId}"
DHAN_ACCESS_TOKEN="${accessToken}"
DHAN_BASE_URL="${brokerBaseUrl}"
DHAN_ENV="SANDBOX"
ANVIL_CLIENT_SECRET="${clientSecret}"
`;

  const pythonSnippet = `from dhanhq import dhanhq

# Initialize DhanHQ Client pointing to ANVIL Mock Broker Wire
dhan = dhanhq(
    client_id="${clientId}",
    access_token="${accessToken}"
)
# Override base URL to route orders through ANVIL Sandbox
dhan.base_url = "${brokerBaseUrl}"

# Place Intraday Test Order
order_response = dhan.place_order(
    security_id="49546",
    exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.BUY,
    quantity=75,
    order_type=dhan.MARKET,
    product_type=dhan.INTRADAY,
    price=0,
    tag="marmot_live_test"
)
print("Order Status:", order_response)
`;

  const marmotJsonConfig = JSON.stringify({
    broker: "DHAN_V2",
    environment: "SANDBOX",
    base_url: brokerBaseUrl,
    client_id: clientId,
    client_secret: clientSecret,
    access_token: accessToken,
    execution_mode: "AUTO",
    default_exchange: "NSE_FNO",
    postback_webhook_url: postbackUrl || `${brokerBaseUrl}/api/webhook/postback/`,
    kill_switch_active: killSwitchActive,
  }, null, 2);

  return (
    <div id="marmot-connect-page" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Page Title & Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
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
            <KeyRound size={24} color="#34d399" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Marmot Connect & Sandbox Gateway
              </h1>
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
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Direct client credentials, algorithmic trading keys, postback webhook dispatch, and live safety controls.
            </p>
          </div>
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
              padding: '9px 16px',
              borderRadius: '8px',
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

      {/* Kill Switch Active Warning Banner */}
      {killSwitchActive && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertTriangle size={20} color="#ef4444" />
          <div style={{ flex: 1, fontSize: '0.86rem', color: '#fca5a5' }}>
            <strong>EMERGENCY KILL SWITCH IS ACTIVE:</strong> All incoming order requests from MARMOT or Python bots are rejected immediately with Dhan status REJECTED.
          </div>
          <button
            onClick={handleToggleKillSwitch}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            Deactivate Now
          </button>
        </div>
      )}

      {/* SECTION 1: Credentials Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* 1. Broker Base URL */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>1. BROKER GATEWAY BASE URL</span>
            <button
              onClick={() => copyToClipboard(brokerBaseUrl, 'base-url')}
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedKey === 'base-url' ? 'var(--bull-green)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
              }}
            >
              {copiedKey === 'base-url' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'base-url' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#38bdf8', wordBreak: 'break-all', fontWeight: 600 }}>
            {brokerBaseUrl}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Set as target base URL for Marmot or DhanHQ client.
          </div>
        </div>

        {/* 2. Client ID */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>2. DHAN CLIENT ID / APP ID</span>
            <button
              onClick={() => copyToClipboard(clientId, 'client-id')}
              style={{
                background: 'transparent',
                border: 'none',
                color: copiedKey === 'client-id' ? 'var(--bull-green)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
              }}
            >
              {copiedKey === 'client-id' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedKey === 'client-id' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>
            {clientId}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Unique 10-digit sandbox trader identifier.
          </div>
        </div>

        {/* 3. Client Secret */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>3. CLIENT SECRET</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowSecret(!showSecret)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title={showSecret ? 'Hide Secret' : 'Reveal Secret'}
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => copyToClipboard(clientSecret, 'secret')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'secret' ? 'var(--bull-green)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {copiedKey === 'secret' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === 'secret' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: '#fbbf24', wordBreak: 'break-all' }}>
            {showSecret ? clientSecret : '••••••••••••••••••••••••••••••••'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Used for token exchange and payload HMAC verification.
          </div>
        </div>

        {/* 4. Access Token */}
        <div
          style={{
            background: 'rgba(12, 17, 29, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>4. DHAN ACCESS TOKEN</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowToken(!showToken)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                title={showToken ? 'Hide Token' : 'Reveal Token'}
              >
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={() => copyToClipboard(accessToken, 'token')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: copiedKey === 'token' ? 'var(--bull-green)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                }}
              >
                {copiedKey === 'token' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedKey === 'token' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', color: 'var(--bull-green)', wordBreak: 'break-all' }}>
            {showToken ? accessToken : '••••••••••••••••••••••••••••••••'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Permanent Sandbox wire bearer token.
          </div>
        </div>
      </div>

      {/* Action Row: Verification & Key Regeneration */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          background: 'rgba(12, 17, 29, 0.5)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '10px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="test-token-exchange-btn"
            onClick={handleTestTokenExchange}
            disabled={testingToken}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontSize: '0.82rem',
              fontWeight: 600,
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
            <span style={{ fontSize: '0.8rem', color: 'var(--bull-green)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={14} /> Token Wire Active & Verified
            </span>
          )}
          {tokenTestSuccess === false && (
            <span style={{ fontSize: '0.8rem', color: 'var(--bear-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={14} /> Verification Failed
            </span>
          )}
        </div>

        <button
          id="regenerate-keys-btn"
          onClick={handleRegenerateCredentials}
          disabled={isRegenerating}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <RefreshCw size={13} className={isRegenerating ? 'spin' : ''} />
          <span>{isRegenerating ? 'Regenerating...' : 'Regenerate API Credentials'}</span>
        </button>
      </div>

      {/* SECTION 2: Postback Webhook Setup */}
      <div
        style={{
          background: 'rgba(12, 17, 29, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Send size={18} color="#38bdf8" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            Order Postback Webhook Dispatcher
          </h3>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '0 0 16px 0' }}>
          Whenever orders are filled, modified, or cancelled, ANVIL dispatches instant HTTP POST payloads matching the Dhan v2 Webhook specifications to your endpoint.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            id="postback-webhook-input"
            type="url"
            value={postbackUrl}
            onChange={(e) => setPostbackUrl(e.target.value)}
            placeholder="https://your-bot-or-marmot.domain/api/dhan/webhook/"
            style={{
              flex: 1,
              minWidth: '280px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#090d16',
              border: '1px solid var(--border-subtle)',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontFamily: 'var(--font-mono)',
            }}
          />
          <button
            id="save-postback-btn"
            onClick={handleSavePostback}
            disabled={savingPostback}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              background: '#38bdf8',
              border: 'none',
              color: '#090d16',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: savingPostback ? 'not-allowed' : 'pointer',
            }}
          >
            {savingPostback ? 'Saving...' : 'Save Webhook'}
          </button>
          <button
            id="test-postback-probe-btn"
            onClick={handleTestPostback}
            disabled={testingPostback || !postbackUrl.trim()}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: (testingPostback || !postbackUrl.trim()) ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Send size={13} />
            <span>{testingPostback ? 'Probing...' : 'Send Test Ping'}</span>
          </button>
        </div>

        {/* Test Probe Result */}
        {lastProbeResult && (
          <div
            style={{
              marginTop: '14px',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              background: lastProbeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: lastProbeResult.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              color: lastProbeResult.success ? 'var(--bull-green)' : 'var(--bear-red)',
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

      {/* SECTION 3: Code Integration Snippets */}
      <div
        style={{
          background: 'rgba(12, 17, 29, 0.75)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCode size={18} color="#fbbf24" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
              Algorithmic Integration Snippets
            </h3>
          </div>

          {/* Snippet Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveSnippetTab('env')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSnippetTab === 'env' ? '#38bdf8' : 'transparent',
                color: activeSnippetTab === 'env' ? '#090d16' : 'var(--text-secondary)',
              }}
            >
              Marmot .env Block
            </button>
            <button
              onClick={() => setActiveSnippetTab('python')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSnippetTab === 'python' ? '#38bdf8' : 'transparent',
                color: activeSnippetTab === 'python' ? '#090d16' : 'var(--text-secondary)',
              }}
            >
              Python DhanHQ SDK
            </button>
            <button
              onClick={() => setActiveSnippetTab('json')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeSnippetTab === 'json' ? '#38bdf8' : 'transparent',
                color: activeSnippetTab === 'json' ? '#090d16' : 'var(--text-secondary)',
              }}
            >
              Full JSON Config
            </button>
          </div>
        </div>

        {/* Snippet Display */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 2 }}>
            <button
              id="copy-active-snippet-btn"
              onClick={() => {
                const text =
                  activeSnippetTab === 'env'
                    ? marmotEnvSnippet
                    : activeSnippetTab === 'python'
                    ? pythonSnippet
                    : marmotJsonConfig;
                copyToClipboard(text, activeSnippetTab);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                cursor: 'pointer',
              }}
            >
              {copiedKey === activeSnippetTab ? <Check size={13} /> : <Copy size={13} />}
              <span>{copiedKey === activeSnippetTab ? 'Copied Snippet!' : 'Copy Snippet'}</span>
            </button>
          </div>

          <pre
            style={{
              margin: 0,
              padding: '16px',
              borderRadius: '8px',
              background: '#090d16',
              border: '1px solid var(--border-subtle)',
              color: '#cbd5e1',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              overflowX: 'auto',
            }}
          >
            {activeSnippetTab === 'env' && marmotEnvSnippet}
            {activeSnippetTab === 'python' && pythonSnippet}
            {activeSnippetTab === 'json' && marmotJsonConfig}
          </pre>
        </div>
      </div>
    </div>
  );
}
