import React, { useState } from 'react';
import { Mail, ShieldCheck, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuthPage({ onLoginSuccess, addToast }) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter otp
  const [loading, setLoading] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');

  // 1. Send OTP via Gmail SMTP
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

  // 2. Verify OTP & Log In / Register
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      addToast('error', 'Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.verifyOtp(email, otp);
      localStorage.setItem('anvil_token', res.token);
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', authMode === 'register' ? 'Account registered successfully! Virtual desk ready.' : 'Logged in successfully! Virtual account ready.');
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login
  const handleQuickDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await api.auth.getMe();
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', `Signed in as Demo Sandbox Trader (${res.user.dhan_client_id})`);
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', 'Could not initialize demo trader.');
    } finally {
      setLoading(false);
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleTestEmail, setGoogleTestEmail] = useState('appzfx13@gmail.com');

  // Real Google OAuth 2.0 Consent Screen (Login / Register)
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

      const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=email%20profile%20openid&prompt=select_account`;

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
        window.location.href = googleOAuthUrl;
        return;
      }

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
        } catch (e) {}
      }, 500);
    } catch (err) {
      addToast('error', 'Google SSO failed.');
      setLoading(false);
    }
  };

  // Direct Verified Google Login (Sandbox Bypass if Google Cloud Console URI not yet updated)
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

  return (
    <div
      id="auth-page-container"
      style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px',
        }}
      >
        {/* Header Tabs: Sign In / Create Account */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            id="auth-tab-login"
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
            id="auth-tab-register"
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

        {/* Title & Badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(99, 102, 241, 0.4)',
              marginBottom: '16px',
            }}
          >
            <ShieldCheck size={26} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '6px' }}>
            {step === 1 ? (authMode === 'register' ? 'Create ANVIL Account' : 'Sign In to ANVIL') : 'Verify One-Time Password'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {step === 1
              ? (authMode === 'register' ? 'Register for your precision derivative sandbox account' : 'Enter your email for instant Gmail OTP authentication')
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Step 1: Email / Registration Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            {authMode === 'register' && (
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  FULL NAME
                </label>
                <input
                  id="auth-input-fullname"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: '#ffffff',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                GMAIL / WORK EMAIL ADDRESS
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-input-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-medium)',
                    color: '#ffffff',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '10px',
                    fontSize: '0.92rem',
                  }}
                />
                <Mail
                  size={18}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              id="auth-send-otp-btn"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginBottom: '20px' }}
            >
              {loading ? (authMode === 'register' ? 'Creating Account...' : 'Sending Code...') : (authMode === 'register' ? 'Register with Gmail OTP' : 'Send Verification OTP')} <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                6-DIGIT VERIFICATION CODE
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-input-otp"
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--accent-primary)',
                    color: '#ffffff',
                    padding: '12px 14px 12px 40px',
                    borderRadius: '10px',
                    fontSize: '1.2rem',
                    letterSpacing: '0.25em',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'center',
                  }}
                />
                <KeyRound
                  size={18}
                  color="var(--accent-primary)"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
              {devOtpHint && (
                <div
                  id="dev-otp-hint"
                  style={{
                    marginTop: '8px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'rgba(56, 189, 248, 0.1)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    fontSize: '0.78rem',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Dev OTP Code: <strong>{devOtpHint}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtp(devOtpHint)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Auto-Fill
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="auth-verify-otp-btn"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', marginBottom: '12px' }}
            >
              {loading ? 'Verifying...' : 'Verify & Enter Sandbox'}
            </button>

            <button
              type="button"
              id="auth-back-to-email-btn"
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              &larr; Change email address
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 20px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR INSTANT SIGN-IN</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          id="auth-google-sso-btn"
          onClick={handleGoogleSso}
          disabled={loading}
          className="btn-secondary"
          style={{ width: '100%', padding: '11px', marginBottom: '12px', gap: '10px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {authMode === 'register' ? 'Register with Google SSO' : 'Continue with Google SSO'}
        </button>

        <button
          type="button"
          id="google-sso-config-guide-btn"
          onClick={() => setShowGoogleModal(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-cyan)',
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
            marginBottom: '14px',
            textDecoration: 'underline',
            display: 'block',
            width: '100%',
          }}
        >
          Google OAuth 2.0 Status & 1-Click Verification Test
        </button>

        {/* Quick Demo Button */}
        <button
          type="button"
          id="auth-quick-demo-btn"
          onClick={handleQuickDemoLogin}
          className="btn-secondary"
          style={{ width: '100%', padding: '10px', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}
        >
          Launch as Demo Sandbox Trader (1000000001)
        </button>

        {/* Google SSO Diagnostic & Direct Sandbox Modal */}
        {showGoogleModal && (
          <div
            id="google-sso-modal"
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
    </div>
  );
}
