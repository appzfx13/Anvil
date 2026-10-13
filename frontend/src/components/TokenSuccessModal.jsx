import React from 'react';
import { CheckCircle2, ShieldCheck, Zap, Activity, Layers, ArrowRight, X } from 'lucide-react';
import { SUPPORTED_INDICES } from '../services/constants';

export default function TokenSuccessModal({
  isOpen,
  onClose,
  feedConfig,
}) {
  if (!isOpen) return null;

  return (
    <div
      id="token-success-modal-overlay"
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        id="token-success-modal-box"
        className="glass-panel-elevated"
        style={{
          maxWidth: '560px',
          width: '100%',
          borderRadius: '20px',
          padding: '36px 32px',
          position: 'relative',
          background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(10, 15, 29, 0.98) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="token-success-modal-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: 'none',
            borderRadius: '8px',
            padding: '6px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={18} />
        </button>

        {/* Animated Success Badge */}
        <div style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.05) 70%)',
              border: '2px solid var(--bull-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)',
            }}
          >
            <ShieldCheck size={42} color="var(--bull-green)" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
          Fyers Token Successfully Stored!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', lineHeight: 1.5, marginBottom: '24px' }}>
          Your FYERS API v3 access token has been verified and securely saved to the database. Real-time Level-1 ticks and live option chains are now streaming.
        </p>

        {/* Key Verification Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>FEED STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bull-green)', fontWeight: 700, fontSize: '0.9rem' }}>
              <div className="pulse-dot-green" /> ACTIVE & STREAMING
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '4px' }}>DATA INTEGRITY</div>
            <div style={{ color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '0.88rem' }}>
              100% REAL FYERS DATA
            </div>
          </div>
        </div>

        {/* Active Indices Strip */}
        <div style={{ marginBottom: '26px', textAlign: 'left' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>
            ACTIVE LIVE LEVEL-1 FEEDS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {SUPPORTED_INDICES.map((idx) => (
              <div
                key={idx.key}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  fontSize: '0.76rem',
                  color: '#e2e8f0',
                  fontWeight: 600,
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--bull-green)' }} />
                <span>{idx.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confirmation Action Button */}
        <button
          id="token-success-confirm-btn"
          className="btn-primary"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            borderRadius: '10px',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.35)',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          }}
        >
          <Zap size={18} /> Enter Live Trading Terminal <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
