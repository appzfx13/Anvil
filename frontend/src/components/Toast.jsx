import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      id="toast-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 9999,
        maxWidth: '400px',
        width: '100%',
      }}
    >
      {toasts.map((t) => {
        let icon = <Info size={18} color="#38bdf8" />;
        let border = '1px solid rgba(56, 189, 248, 0.4)';
        let bg = 'rgba(14, 23, 42, 0.95)';

        if (t.type === 'success') {
          icon = <CheckCircle2 size={18} color="#10b981" />;
          border = '1px solid rgba(16, 185, 129, 0.4)';
          bg = 'rgba(6, 30, 24, 0.95)';
        } else if (t.type === 'error') {
          icon = <XCircle size={18} color="#f43f5e" />;
          border = '1px solid rgba(244, 63, 94, 0.4)';
          bg = 'rgba(38, 11, 20, 0.95)';
        } else if (t.type === 'warning') {
          icon = <AlertTriangle size={18} color="#f59e0b" />;
          border = '1px solid rgba(245, 158, 11, 0.4)';
          bg = 'rgba(38, 26, 10, 0.95)';
        }

        return (
          <div
            key={t.id}
            id={`toast-${t.id}`}
            style={{
              background: bg,
              border,
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ marginTop: '2px', flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              {t.title && (
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f8fafc', marginBottom: '2px' }}>
                  {t.title}
                </div>
              )}
              <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {t.message}
              </div>
            </div>
            <button
              id={`toast-close-${t.id}`}
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
