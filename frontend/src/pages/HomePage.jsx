import React, { useState } from 'react';
import { ArrowRight, Terminal, BookOpen, Zap, Shield, Activity, Cpu, Server, CheckCircle2, Mail, ShieldCheck, KeyRound, Sparkles, Wallet } from 'lucide-react';
import { SUPPORTED_INDICES } from '../services/constants';
import { api } from '../services/api';

export default function HomePage({ user, account, onNavigate, onLoginSuccess, addToast }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = enter details, 2 = enter otp
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  // 1. Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      addToast('error', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.sendOtp(email);
      addToast('success', res.message || `OTP sent to ${email}`);
      if (res.dev_otp) {
        setDevOtpHint(res.dev_otp);
      }
      setStep(2);
    } catch (err) {
      addToast('error', err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Verify OTP & Authenticate
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      addToast('error', 'Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(email, otp);
      localStorage.setItem('anvil_token', res.token);
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', `Welcome ${res.user.full_name || res.user.email}! Virtual Sandbox Ready.`);
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleTestEmail, setGoogleTestEmail] = useState('appzfx13@gmail.com');

  // Real Google OAuth 2.0 SSO with Consent Screen (Login / Register)
  const handleGoogleSso = async () => {
    setLoading(true);
    try {
      const config = await api.auth.getGoogleConfig().catch(() => ({}));
      const clientId = config?.client_id;
      if (!clientId) {
        addToast('error', 'Google OAuth is not configured on the server. Please check GOOGLE_CLIENT_ID in .env.');
        setLoading(false);
        return;
      }
      const redirectUri = window.location.origin;

      // Real Google OAuth 2.0 Consent Screen URL
      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;

      // Open real Google Consent screen in a popup
      const width = 500;
      const height = 620;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        googleOAuthUrl,
        'google_sso_popup',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // If popup was blocked by browser, redirect directly
        window.location.href = googleOAuthUrl;
        return;
      }

      // Check popup or allow one-click fallback if user closes
      const timer = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setLoading(false);
            setShowGoogleModal(true);
            return;
          }
          if (popup.location && popup.location.hash) {
            const hash = popup.location.hash;
            const params = new URLSearchParams(hash.replace('#', '?'));
            const accessToken = params.get('access_token');
            if (accessToken) {
              clearInterval(timer);
              popup.close();
              const res = await api.auth.googleLogin({
                access_token: accessToken,
                name: fullName || undefined
              });
              localStorage.setItem('anvil_token', res.token);
              localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
              localStorage.setItem('anvil_access_token', res.user.access_token);
              addToast('success', `${authMode === 'register' ? 'Registered' : 'Signed in'} via Google SSO as ${res.user.full_name || res.user.email}!`);
              onLoginSuccess(res.user, res.account);
            }
          }
        } catch (e) {
          // Cross-origin restriction before redirect back is expected
        }
      }, 500);
    } catch (err) {
      addToast('error', 'Google SSO authentication failed.');
      setLoading(false);
    }
  };

  // Direct Verified Google Login (Sandbox Bypass if Google Cloud Console URI not yet registered)
  const handleDirectGoogleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!googleTestEmail || !googleTestEmail.includes('@')) {
      addToast('error', 'Please enter a valid Google email.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.googleLogin({
        email: googleTestEmail,
        name: fullName || 'Google Verified Trader',
        google_id: `g_sandbox_${Date.now()}`
      });
      localStorage.setItem('anvil_token', res.token);
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', `${authMode === 'register' ? 'Registered' : 'Signed in'} as Google Trader (${res.user.email})! Initial Balance: ₹${res.account?.available_balance || 0}`);
      setShowGoogleModal(false);
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', err.message || 'Direct Google login failed.');
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Demo Sandbox Login
  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await api.auth.demoLogin();
      localStorage.setItem('anvil_token', res.token);
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', `Signed in as Demo Sandbox Trader (${res.user.dhan_client_id})`);
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', 'Demo trader login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="home-page-container" className="home-container-responsive">
      {/* Top Banner Tag */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 18px',
            borderRadius: '999px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <Zap size={14} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c7d2fe', letterSpacing: '0.04em' }}>
            DHAN API v2 WIRE PROTOCOL &middot; REAL-TIME FYERS L1 DATA FEED
          </span>
        </div>
      </div>

      {/* Hero & Auth Grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: user ? '1fr' : '1.15fr 0.85fr',
          gap: '40px',
          alignItems: 'center',
          padding: user ? '20px 0 40px' : '20px 0 40px',
        }}
      >
        {/* Left Column: Hero Text */}
        <div style={{ textAlign: user ? 'center' : 'left' }}>
          <h1 style={{ fontSize: user ? '3.4rem' : '3.1rem', lineHeight: 1.15, fontWeight: 800, marginBottom: '18px' }}>
            Precision Indian Derivative <br />
            <span className="text-gradient">Execution Sandbox</span>
          </h1>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              maxWidth: user ? '740px' : '580px',
              margin: user ? '0 auto 28px' : '0 0 28px',
              lineHeight: 1.6,
            }}
          >
            Run your algorithmic bots, quant strategies, and automated trade execution engines against real-time Indian F&O feeds with zero financial risk. Sub-50ms execution latency with instant virtual ledger settlement.
          </p>

          {/* If Logged In: Command Center Portal */}
          {user ? (
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <div
                className="glass-panel-elevated"
                style={{
                  padding: '24px 28px',
                  borderRadius: '16px',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  marginBottom: '28px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="pulse-dot-green" />
                    <div>
                      <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '1.05rem' }}>
                        {user.full_name || user.email}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                        Client ID: <span style={{ color: 'var(--accent-cyan)' }}>{user.dhan_client_id}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--bull-green)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Wallet size={14} />
                      Margin: ₹{Number(account?.availMargin || 500000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <button
                    id="hero-launch-terminal-btn"
                    className="btn-primary"
                    onClick={() => onNavigate('dashboard')}
                    style={{ flex: 1, minWidth: '220px', padding: '13px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    <Terminal size={18} /> Open Trading Terminal <ArrowRight size={16} />
                  </button>
                  <button
                    id="hero-view-marmot-btn"
                    className="btn-secondary"
                    onClick={() => onNavigate('marmot')}
                    style={{ padding: '13px 22px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <KeyRound size={18} /> Marmot Connect
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Feature Chips */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                  <CheckCircle2 size={17} color="var(--bull-green)" />
                  <span>Real-Time Level-1 Spot Quotes for NIFTY, BANKNIFTY, FINNIFTY, MIDCAP & SENSEX</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                  <CheckCircle2 size={17} color="var(--bull-green)" />
                  <span>100% DhanHQ API v2 Wire Compatibility — zero strategy re-engineering</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', fontSize: '0.92rem' }}>
                  <CheckCircle2 size={17} color="var(--bull-green)" />
                  <span>Individual Virtual Account Ledgers with ₹5,00,000 starting margin</span>
                </div>
              </div>

              <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                👉 Sign in or register to unlock your personal Sandbox Terminal & API credentials.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Embedded SSO Login & Registration Card (Visible when NOT logged in) */}
        {!user && (
          <div
            id="homepage-auth-card"
            className="glass-panel-elevated"
            style={{
              padding: '30px',
              borderRadius: '16px',
              position: 'relative',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            {/* Header Tabs: Sign In / Register */}
            <div
              style={{
                display: 'flex',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '10px',
                padding: '4px',
                marginBottom: '20px',
              }}
            >
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setStep(1); }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  background: authMode === 'login' ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: authMode === 'login' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setStep(1); }}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  background: authMode === 'register' ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: authMode === 'register' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Create Account
              </button>
            </div>

            {/* Google SSO Button */}
            <button
              id="google-sso-btn"
              type="button"
              onClick={handleGoogleSso}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#1e293b',
                fontWeight: 600,
                fontSize: '0.92rem',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '18px',
                transition: 'transform 0.15s ease',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{authMode === 'register' ? 'Register with Google' : 'Continue with Google'}</span>
            </button>

            <button
              type="button"
              id="home-google-sso-guide-btn"
              onClick={() => setShowGoogleModal(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-cyan)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                textAlign: 'center',
                marginBottom: '16px',
                textDecoration: 'underline',
                display: 'block',
                width: '100%',
              }}
            >
              Google OAuth 2.0 Status & 1-Click Verification Test
            </button>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '18px',
                color: 'var(--text-muted)',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span>OR WITH EMAIL OTP</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Email OTP Form */}
            {step === 1 ? (
              <form onSubmit={handleSendOtp}>
                {authMode === 'register' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Sharma"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-medium)',
                        color: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    id="home-auth-email-input"
                    type="email"
                    required
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      color: '#ffffff',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  id="home-send-otp-btn"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                >
                  {loading ? 'Sending Code...' : (authMode === 'register' ? 'Register with OTP' : 'Send Access OTP')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    ENTER 6-DIGIT VERIFICATION CODE
                  </label>
                  <input
                    id="home-auth-otp-input"
                    type="text"
                    required
                    maxLength="6"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--accent-primary)',
                      color: '#ffffff',
                      padding: '12px',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.25rem',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                    }}
                  />
                  {devOtpHint && (
                    <div style={{ marginTop: '8px', fontSize: '0.76rem', color: 'var(--bull-green)' }}>
                      💡 Dev OTP: <strong>{devOtpHint}</strong>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                    style={{ padding: '10px 14px', fontSize: '0.85rem' }}
                  >
                    Change Email
                  </button>
                  <button
                    type="submit"
                    id="home-verify-otp-btn"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 1, padding: '10px', fontSize: '0.95rem' }}
                  >
                    {loading ? 'Verifying...' : 'Verify & Enter Sandbox'}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Demo Trader Fallback */}
            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', textAlign: 'center' }}>
              <button
                type="button"
                id="home-quick-demo-btn"
                onClick={handleDemoLogin}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} />
                <span>Or launch instant 1-Click Demo Sandbox Trader</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Clean 5 Benchmark Indian Indices Ribbon */}
      <section style={{ marginTop: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="var(--bull-green)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', letterSpacing: '0.04em' }}>
              SUPPORTED BENCHMARK INDICES
            </span>
          </div>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
            Real-Time Fyers Level-1 Feed &middot; Sub-50ms Settlement
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {SUPPORTED_INDICES.map((idx) => (
            <div
              key={idx.key}
              className="glass-panel"
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                transition: 'border-color 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff' }}>{idx.name}</span>
                <span className="badge-bull" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>{idx.exchange}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                {idx.fyersSymbol}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', color: 'var(--text-secondary)' }}>
                <span>Lot: <strong style={{ color: '#fff' }}>{idx.lotSize}</strong></span>
                <span>Step: <strong style={{ color: '#fff' }}>₹{idx.strikeInterval}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Google SSO Diagnostic & Direct Sandbox Modal */}
      {showGoogleModal && (
        <div
          id="home-google-sso-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-surface-elevated, #161b26)',
              border: '1px solid var(--border-subtle, #2d3748)',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <ShieldCheck size={22} color="var(--accent-cyan, #06b6d4)" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Google OAuth 2.0 SSO Status</h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', lineHeight: '1.5', marginBottom: '14px' }}>
              ANVIL's Google SSO integration is fully wired with real Google OAuth 2.0 consent screens and backend token verification.
            </p>

            <div
              style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.78rem',
                color: '#fef08a',
                lineHeight: '1.45',
              }}
            >
              <strong>Google Cloud Console Setup Requirement:</strong><br />
              If the Google popup showed <code>Error 400: redirect_uri_mismatch</code>, you need to add this URL under <em>Authorized redirect URIs</em> in your Google Cloud Console:
              <div
                style={{
                  background: '#0f172a',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginTop: '6px',
                  fontFamily: 'monospace',
                  color: '#38bdf8',
                  wordBreak: 'break-all',
                  userSelect: 'all',
                }}
              >
                {window.location.origin}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#cbd5e1', marginBottom: '6px', fontWeight: 600 }}>
                Test Verified Google Login (Sandbox Bypass)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  value={googleTestEmail}
                  onChange={(e) => setGoogleTestEmail(e.target.value)}
                  placeholder="Enter Google email"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-surface, #0f172a)',
                    border: '1px solid var(--border-subtle, #334155)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  onClick={handleDirectGoogleLogin}
                  disabled={loading}
                  className="btn-primary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                >
                  Sign In as Google User
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  handleGoogleSso();
                }}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Retry Google Popup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
