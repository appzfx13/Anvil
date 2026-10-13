import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Terminal,
  ShieldCheck,
  Copy,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminLoginPage({
  onLoginSuccess,
  onNavigateToTrader,
  addToast,
}) {
  const [email, setEmail] = useState('admin@anvil.local');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const adminCredentials = {
    role: 'Super Admin',
    email: 'admin@anvil.local',
    password: 'Admin@123',
    clientId: '1000000001',
    clientSecret: 'sec_anvil_admin_master_secret_01',
    balance: '₹500,000.00',
    privilege: 'Full Superuser / Staff'
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!email) {
      setErrorMsg('Please enter the Super Admin email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter the master password or client secret.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.adminLogin({
        email,
        password,
      });

      if (res && res.token && res.user) {
        localStorage.setItem('anvil_token', res.token);
        localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
        localStorage.setItem('anvil_access_token', res.user.access_token);
        addToast('success', `Welcome Super Admin! Authenticated as ${res.user.full_name}.`);
        onLoginSuccess(res.user, res.account);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      addToast('error', err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFillAndLogin = () => {
    setEmail('admin@anvil.local');
    setPassword('Admin@123');
    setTimeout(() => {
      handleLogin();
    }, 100);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('success', `Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 20px',
        position: 'relative',
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 20% 80%, rgba(245, 158, 11, 0.05) 0%, transparent 40%)
        `,
      }}
    >
      {/* Top Security Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(14, 165, 233, 0.1)',
          border: '1px solid rgba(14, 165, 233, 0.3)',
          borderRadius: '999px',
          padding: '6px 16px',
          marginBottom: '24px',
        }}
      >
        <ShieldAlert size={14} color="#38bdf8" />
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          ANVIL RESTRICTED PORTAL • SUPER ADMIN ONLY
        </span>
      </div>

      {/* Main Glass Authentication Card */}
      <div
        className="glass-panel-elevated"
        style={{
          maxWidth: '480px',
          width: '100%',
          padding: '36px 32px',
          borderRadius: '16px',
          background: 'rgba(14, 18, 28, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          position: 'relative',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              boxShadow: '0 0 25px rgba(2, 132, 199, 0.45)',
            }}
          >
            <Lock size={22} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Admin Command Console
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.4 }}>
            Enter Master Credentials to manage trader rosters, adjust margin limits, configure broker feeds, and monitor trade ledgers.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '20px',
              color: '#fda4af',
              fontSize: '0.8rem',
            }}
          >
            <AlertTriangle size={16} color="#f43f5e" style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          {/* Email / Admin ID Input */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', marginBottom: '6px' }}>
              SUPER ADMIN IDENTIFIER / EMAIL
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="admin-email-input"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@anvil.local"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Master Password Input */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                MASTER PASSWORD / SECRET KEY
              </label>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8', cursor: 'pointer' }} onClick={() => setPassword(adminCredentials.clientSecret)}>
                Use Secret Key
              </span>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <KeyRound size={16} color="#64748b" style={{ position: 'absolute', left: '12px' }} />
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Admin@123 or Secret"
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 38px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="admin-login-submit-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 0 20px rgba(2, 132, 199, 0.35)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <span>Verifying Privileges...</span>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Sign In to Admin Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
          <span style={{ fontSize: '0.68rem', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            DEMO ADMIN CHEAT SHEET
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
        </div>

        {/* Interactive 1-Click Credentials Table */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '0.78rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>SUPER ADMIN CREDENTIALS</span>
            <button
              onClick={handleAutoFillAndLogin}
              style={{
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.4)',
                color: '#38bdf8',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡ 1-Click Auto Fill & Login
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '5px 0', color: '#64748b' }}>Email:</td>
                <td style={{ color: '#ffffff', textAlign: 'right' }}>
                  {adminCredentials.email}
                  <span
                    onClick={() => copyToClipboard(adminCredentials.email, 'email')}
                    style={{ marginLeft: '6px', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {copiedKey === 'email' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '5px 0', color: '#64748b' }}>Password:</td>
                <td style={{ color: '#10b981', textAlign: 'right', fontWeight: 700 }}>
                  {adminCredentials.password}
                  <span
                    onClick={() => copyToClipboard(adminCredentials.password, 'pass')}
                    style={{ marginLeft: '6px', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {copiedKey === 'pass' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  </span>
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '5px 0', color: '#64748b' }}>Client ID:</td>
                <td style={{ color: '#ffffff', textAlign: 'right' }}>{adminCredentials.clientId}</td>
              </tr>
              <tr>
                <td style={{ padding: '5px 0', color: '#64748b' }}>Privilege:</td>
                <td style={{ color: '#38bdf8', textAlign: 'right', fontWeight: 600 }}>{adminCredentials.privilege}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Back Link to Trader Terminal */}
        <div style={{ textAlign: 'center', marginTop: '22px' }}>
          <button
            onClick={onNavigateToTrader}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Looking for Trader Sandbox Terminal?</span>
            <ArrowRight size={14} color="#38bdf8" />
          </button>
        </div>
      </div>
    </div>
  );
}
