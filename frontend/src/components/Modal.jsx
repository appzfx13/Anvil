import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function Modal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm Action',
  cancelText = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div id="confirmation-modal" className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isDanger && <AlertCircle size={20} color="#f43f5e" />}
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', fontWeight: 600 }}>{title}</h3>
          </div>
          <button
            id="modal-close-btn"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px' }}>
          {message && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
              {message}
            </p>
          )}
          {children}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            id="modal-cancel-btn"
            className="btn-secondary"
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            {cancelText}
          </button>
          <button
            id="modal-confirm-btn"
            className={isDanger ? 'btn-bear' : 'btn-primary'}
            onClick={onConfirm}
            style={{ padding: '8px 18px', fontSize: '0.88rem' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
