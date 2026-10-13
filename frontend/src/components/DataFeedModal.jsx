import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, ShieldAlert, Zap, Radio, KeyRound, Globe, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function DataFeedModal({ isOpen, onClose, onConfigUpdated, onTokenSuccess, addToast }) {
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

  // Determine current origin callback URL
  const defaultCallback = typeof window !== 'undefined'
    ? `${window.location.origin}/api/fyers/callback/`
    : 'http://localhost:8500/api/fyers/callback/';

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await api.fyers.getConfig();
      if (res) {
        setAppId(res.app_id || '');
        setSecretKey(res.secret_key || '');
        setAccessToken(res.has_token ? (res.has_token ? '••••••••••••••••••••••••••••••••' : '') : '');
        setRedirectUri(res.redirect_uri || defaultCallback);
        setFeedStatus(res.feed_status || 'DISCONNECTED');
        setHasToken(res.has_token || false);
        setLastError(res.last_error || '');
      }
    } catch (err) {
      addToast('error', 'Failed to load site broker configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRedirect = () => {
    const urlToCopy = redirectUri || defaultCallback;
    navigator.clipboard.writeText(urlToCopy);
    setCopied(true);
    addToast('success', 'Redirect URL copied to clipboard! Paste it into Fyers App Settings.');
    setTimeout(() => setCopied(false), 3000);
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

      // Only pass token if user typed/pasted a new token (not the masked placeholder)
      if (accessToken && !accessToken.includes('••••')) {
        payload.access_token = accessToken.trim();
      }

      const res = await api.fyers.saveConfig(payload);
      addToast('success', 'Broker configuration saved to Site Configuration table.');
      setHasToken(res.has_token);
      setFeedStatus(res.feed_status);
      setLastError(res.last_error || '');
      if (onConfigUpdated) onConfigUpdated(res);
      if (payload.access_token && res.has_token) {
        if (onTokenSuccess) onTokenSuccess();
        onClose();
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to save broker configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleStartFyersAuth = async () => {
    // If not saved yet, save first
    if (!appId) {
      addToast('error', 'Please enter and save your Fyers App ID first.');
      return;
    }

    try {
      setSaving(true);
      // Ensure current values are saved
      await api.fyers.saveConfig({
        app_id: appId.trim(),
        secret_key: secretKey.trim(),
        redirect_uri: redirectUri.trim() || defaultCallback,
      });

      const res = await api.fyers.getAuthUrl(redirectUri || defaultCallback);
      if (res && res.auth_url) {
        addToast('info', 'Redirecting to Fyers OAuth Login...');
        // Navigate to Fyers login
        window.location.href = res.auth_url;
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to initialize Fyers OAuth.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestFeed = async () => {
    setLoading(true);
    try {
      const res = await api.fyers.testFeed();
      if (res.success) {
        addToast('success', 'Fyers Real-Time L1 Market Data Feed is ACTIVE!');
        setFeedStatus('ACTIVE');
        setHasToken(true);
        if (onConfigUpdated) onConfigUpdated({ feed_status: 'ACTIVE', has_token: true });
      }
    } catch (err) {
      addToast('error', err.message || 'Feed test failed. Check token validity.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="data-feed-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
          borderRadius: '16px',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)',
            }}
          >
            <Radio size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: '#ffffff', fontWeight: 700 }}>
              Broker Data Feed Configuration
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              FYERS API v3 Real-Time Level-1 Market Data Ingestion
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderRadius: '10px',
            background: hasToken
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${hasToken ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={hasToken ? 'pulse-dot-green' : 'pulse-dot-amber'} />
            <span
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color: hasToken ? 'var(--bull-green)' : 'var(--warn-amber)',
              }}
            >
              {hasToken ? 'FYERS TOKEN ACTIVE & CONNECTED' : 'NO ACTIVE TOKEN — DATA FEED OFFLINE'}
            </span>
          </div>
          <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            STATUS: {feedStatus}
          </span>
        </div>

        {lastError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--bear-red)',
              fontSize: '0.82rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldAlert size={16} />
            <span>{lastError}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* App ID */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              FYERS APP ID (CLIENT ID)
            </label>
            <input
              id="fyers-app-id-input"
              type="text"
              required
              placeholder="e.g. XS83019-100"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Your Fyers App ID from <a href="https://myapi.fyers.in/dashboard" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>myapi.fyers.in/dashboard</a>
            </span>
          </div>

          {/* Secret Key */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                FYERS SECRET KEY
              </label>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="fyers-secret-key-input"
              type={showSecret ? 'text' : 'password'}
              placeholder="Enter App Secret Key"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                color: '#ffffff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.92rem',
              }}
            />
          </div>

          {/* Copy-Ready Redirect URL */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              REDIRECT URL (READY TO PASTE IN FYERS APP CONFIG)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="fyers-redirect-url-display"
                type="text"
                readOnly
                value={redirectUri || defaultCallback}
                style={{
                  flex: 1,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--accent-cyan)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                }}
              />
              <button
                type="button"
                id="copy-redirect-url-btn"
                onClick={handleCopyRedirect}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  fontSize: '0.84rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? <Check size={16} color="var(--bull-green)" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy URL'}
              </button>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              📋 Paste this Redirect URL into your Fyers App settings at myapi.fyers.in so Fyers allows the OAuth handshake.
            </span>
          </div>

          {/* Access Token (Optional Manual Paste) */}
          <div style={{ marginBottom: '26px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              ACCESS TOKEN {hasToken ? '(ACTIVE)' : '(EMPTY — REQUIRES AUTH)'}
            </label>
            <input
              id="fyers-access-token-input"
              type="text"
              placeholder={hasToken ? '••••••••••••••••••••••••••••••••' : 'Empty. Click Data Feed Auth below to generate'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                color: hasToken ? 'var(--bull-green)' : '#ffffff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Optional: If you already generated a token today, you can paste it here directly.
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                id="save-fyers-config-btn"
                className="btn-secondary"
                disabled={saving}
                style={{ flex: 1, padding: '12px', fontSize: '0.92rem' }}
              >
                {saving ? 'Saving...' : '💾 Save Configuration'}
              </button>

              {hasToken && (
                <button
                  type="button"
                  id="test-fyers-feed-btn"
                  className="btn-secondary"
                  onClick={handleTestFeed}
                  disabled={loading}
                  style={{ padding: '12px 18px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={15} /> Test Feed
                </button>
              )}
            </div>

            {/* Fyers OAuth Process Button */}
            <button
              type="button"
              id="start-fyers-auth-btn"
              onClick={handleStartFyersAuth}
              disabled={saving}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontSize: '0.96rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)',
              }}
            >
              <Zap size={18} />
              {saving ? 'Preparing Auth...' : '🚀 Data Feed Auth (Login on Fyers)'}
              <ExternalLink size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
