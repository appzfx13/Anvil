import React, { useState } from 'react';
import { X, Database, Sparkles } from 'lucide-react';
import CalendarRangePicker from './CalendarRangePicker';

export default function CreateBackupModal({ isOpen, onClose, onSubmit, isPending }) {
  const [indexName, setIndexName] = useState('NIFTY');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [strikeCount, setStrikeCount] = useState(15);
  const [use30Days5s, setUse30Days5s] = useState(true);
  const [use30Days1s, setUse30Days1s] = useState(false);
  const [includeVix, setIncludeVix] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      index_name: indexName,
      start_date: startDate,
      end_date: endDate,
      strike_count: Number(strikeCount),
      use_30_days_5s: use30Days5s,
      use_30_days_1s: use30Days1s,
      include_vix: includeVix,
    });
  };

  const totalStrikes = strikeCount * 2 + 1;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface-elevated, #0a0d14)',
          border: '1px solid var(--border-medium, rgba(255, 255, 255, 0.1))',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Header - Fixed */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <Database size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary, #ffffff)', fontWeight: 700 }}>
                Schedule Market Data Backup
              </h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                Concurrently ingest multi-strike historical option chains & spot into Parquet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form
          id="create-backup-form"
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Index Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)', marginBottom: '8px', fontWeight: 600 }}>
              UNDERLYING INDEX
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'SENSEX'].map((idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setIndexName(idx)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: indexName === idx ? '#38bdf8' : 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
                    background: indexName === idx ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                    color: indexName === idx ? '#ffffff' : 'var(--text-secondary, #94a3b8)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {idx}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Interactive Calendar Date Range Selector */}
          <CalendarRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          {/* Strike Count Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.76rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>
                STRIKE DEPTH (ATM ± N)
              </label>
              <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                ±{strikeCount} ({totalStrikes} Strikes)
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={strikeCount}
              onChange={(e) => setStrikeCount(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
            />
          </div>

          {/* Resolution Switches & VIX Checkbox */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={use30Days5s}
                onChange={(e) => {
                  setUse30Days5s(e.target.checked);
                  if (e.target.checked) setUse30Days1s(false);
                }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary, #cbd5e1)' }}>5s Granular Ticks</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--bg-card, rgba(255, 255, 255, 0.02))',
                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={includeVix}
                onChange={(e) => setIncludeVix(e.target.checked)}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-primary, #cbd5e1)' }}>Bundle INDIA VIX</span>
            </label>
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
            background: 'var(--bg-card, rgba(15, 23, 42, 0.8))',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '9px 18px', fontSize: '0.84rem' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-backup-form"
            disabled={isPending}
            className="btn-primary"
            style={{ padding: '9px 22px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={14} />
            <span>{isPending ? 'Queuing...' : 'Start Backup Job'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
