import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Zap,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Wallet
} from 'lucide-react';

export default function MarmotProfileModal({
  isOpen,
  onClose,
  user,
  account,
  addToast,
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  if (!isOpen) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8500';
  const clientId = user?.dhan_client_id || '1000000001';
  const clientSecret = user?.client_secret || 'sec_anvil_live_sandbox_secret';
  const accessToken = user?.access_token || 'dhn_sec_sandbox_token';

  const marmotJsonConfig = JSON.stringify(
    {
      broker: 'ANVIL_DHAN_V2_SANDBOX',
      base_url: baseUrl,
      client_id: clientId,
      access_token: accessToken,
      client_secret: clientSecret,
      margin_currency: 'INR',
    },
    null,
    2
  );

  const pythonSnippet = `from dhanhq import dhanhq

# Connect MARMOT or Python Algo to ANVIL Sandbox
dhan = dhanhq(
    client_id="${clientId}",
    access_token="${accessToken}"
)
dhan.base_url = "${baseUrl}"

# Place test order
order = dhan.place_order(
    security_id="49081",
    exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.BUY,
    quantity=25,
    order_type=dhan.MARKET,
    product_type=dhan.INTRADAY,
    price=0,
    tag="marmot_live_test"
)
print("Fill Fill fill Fill:", order)`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <div id="marmot-profile-modal-overlay" className="modal-overlay" onClick={onClose}>
      <div
        id="marmot-profile-modal-box"
        className="modal-box"
        style={{
          maxWidth: '680px',
          width: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '28px',
          background: 'linear-gradient(180deg, #111520 0%, #0d101a 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              <KeyRound size={22} color="#38bdf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>Marmot Sandbox Credentials</h3>
                <span className="badge-cyan" style={{ fontSize: '0.68rem' }}>DHAN V2 WIRE</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Copy your credentials below to configure MARMOT or Python trading bots.
              </div>
            </div>
          </div>

          <button
            id="close-marmot-profile-btn"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable credentials body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {/* User Profile Banner */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ACTIVE TRADER IDENTITY</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff' }}>
                {user?.full_name || 'Alpha Quant Trader'} ({user?.email})
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: 'var(--bull-green)',
                fontWeight: 600,
                fontSize: '0.84rem',
              }}
            >
              <Wallet size={15} />
              <span>Available Margin: ₹{Number(account?.availMargin || 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Credentials Inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '22px' }}>
            {/* 1. Base Gateway URL */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                1. BROKER GATEWAY BASE URL (MARMOT TARGET)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={baseUrl}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.86rem',
                  }}
                />
                <button
                  id="copy-base-url-btn"
                  onClick={() => copyToClipboard(baseUrl, 'baseUrl')}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.84rem' }}
                >
                  {copiedKey === 'baseUrl' ? <Check size={14} color="var(--bull-green)" /> : <Copy size={14} />}
                  <span>{copiedKey === 'baseUrl' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 2. Dhan Client ID */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', letterSpacing: '0.04em' }}>
                2. DHAN CLIENT ID
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  readOnly
                  value={clientId}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                  }}
                />
                <button
                  id="copy-client-id-btn"
                  onClick={() => copyToClipboard(clientId, 'clientId')}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.84rem' }}
                >
                  {copiedKey === 'clientId' ? <Check size={14} color="var(--bull-green)" /> : <Copy size={14} />}
                  <span>{copiedKey === 'clientId' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 3. Access Token */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  3. ACCESS TOKEN (BEARER AUTH)
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showToken ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  readOnly
                  value={accessToken}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                  }}
                />
                <button
                  id="copy-access-token-btn"
                  onClick={() => copyToClipboard(accessToken, 'accessToken')}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.84rem' }}
                >
                  {copiedKey === 'accessToken' ? <Check size={14} color="var(--bull-green)" /> : <Copy size={14} />}
                  <span>{copiedKey === 'accessToken' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* 4. Client Secret */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.04em' }}>
                  4. CLIENT SECRET (API AUTH)
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.74rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showSecret ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  readOnly
                  value={clientSecret}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(0, 0, 0, 0.4)',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.84rem',
                  }}
                />
                <button
                  id="copy-client-secret-btn"
                  onClick={() => copyToClipboard(clientSecret, 'clientSecret')}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.84rem' }}
                >
                  {copiedKey === 'clientSecret' ? <Check size={14} color="var(--bull-green)" /> : <Copy size={14} />}
                  <span>{copiedKey === 'clientSecret' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1-Click Copy Full JSON config for Marmot */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>
                MARMOT TERMINAL JSON CONFIGURATION
              </span>
              <button
                id="copy-full-marmot-json-btn"
                onClick={() => copyToClipboard(marmotJsonConfig, 'jsonConfig')}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                {copiedKey === 'jsonConfig' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'jsonConfig' ? 'Copied Full JSON!' : 'Copy Marmot JSON'}</span>
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                fontSize: '0.76rem',
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto',
              }}
            >
              {marmotJsonConfig}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: '8px 24px', fontSize: '0.88rem' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
