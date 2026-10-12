import React, { useState } from 'react';
import { Mail, ShieldCheck, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function AuthPage({ onLoginSuccess, addToast }) {
  const [email, setEmail] = useState('');
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

  // 2. Verify OTP & Log In
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
      addToast('success', 'Logged in successfully! Virtual account ready.');
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

  // Google SSO Simulation / One-Tap
  const handleGoogleSso = async () => {
    setLoading(true);
    try {
      const demoGoogleEmail = 'algo.trader@gmail.com';
      const res = await api.auth.googleLogin(demoGoogleEmail, 'Google Quant Trader', 'g_sub_1092837482');
      localStorage.setItem('anvil_token', res.token);
      localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
      localStorage.setItem('anvil_access_token', res.user.access_token);
      addToast('success', 'Authenticated via Google SSO!');
      onLoginSuccess(res.user, res.account);
    } catch (err) {
      addToast('error', 'Google SSO failed.');
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
        {/* Title & Badge */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
          <h2 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '6px' }}>
            {step === 1 ? 'Sign In to ANVIL' : 'Verify One-Time Password'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {step === 1
              ? 'Enter your email for instant Gmail OTP authentication'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Step 1: Email Form */}
        {step === 1 && (
          <form onSubmit={handleSendOtp}>
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
              {loading ? 'Sending Code...' : 'Send Verification OTP'} <ArrowRight size={16} />
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
          Continue with Google SSO
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
      </div>
    </div>
  );
}
