import React, { useState, useEffect } from 'react';
import { X, Database, Table, Search, HardDrive, FileText, CheckCircle2, Download, AlertCircle } from 'lucide-react';

export default function ParquetInspectorDrawer({ isOpen, onClose, task, onDownload }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('records'); // records | schema

  useEffect(() => {
    if (isOpen && task && task.id) {
      fetchInspection();
    } else {
      setData(null);
    }
  }, [isOpen, task && task.id]);

  const fetchInspection = async (query = '') => {
    setLoading(true);
    try {
      let url = '/api/v1/market/backups/' + task.id + '/inspect/?limit=25';
      if (query) url += '&q=' + encodeURIComponent(query);
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json.inspection);
      }
    } catch (err) {
      console.error('Inspection error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInspection(searchQuery);
  };

  if (!isOpen || !task) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '780px',
        background: '#080b11',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.85)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Table size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: 700 }}>
                Parquet Inspector
              </h3>
              <span className="badge-cyan" style={{ fontSize: '0.7rem' }}>
                Task #{task.id}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
              {task.index_name} • {task.start_date} to {task.end_date} • {task.resolution_label || '5s Ticks'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {task.status === 'COMPLETED' && (
            <button
              onClick={() => onDownload(task)}
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Download size={13} />
              <span>Download Parquet</span>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Stats Cards Ribbon */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          background: 'rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Total Records</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {data?.num_rows ? data.num_rows.toLocaleString() : '--'}
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>File Size</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {data?.file_size_mb ? data.file_size_mb + ' MB' : '--'}
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Row Groups</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
            {data?.num_row_groups || 1}
          </div>
        </div>

        <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Columns</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7', fontFamily: 'var(--font-mono)' }}>
            {data?.columns?.length || 12}
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('records')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'records' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              color: activeTab === 'records' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sample Rows ({data?.sample_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'schema' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
              color: activeTab === 'schema' ? '#c084fc' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Parquet Schema
          </button>
        </div>

        {activeTab === 'records' && (
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search symbol / strike..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '6px 10px 6px 28px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '0.78rem',
                  width: '200px',
                }}
              />
              <Search size={13} color="#64748b" style={{ position: 'absolute', left: '9px', top: '8px' }} />
            </div>
            <button
              type="submit"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
            >
              Filter
            </button>
          </form>
        )}
      </div>

      {/* Content Viewport */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
            Reading Parquet metadata via PyArrow...
          </div>
        ) : !data?.exists ? (
          <div className="glass-panel" style={{ padding: '36px', textAlign: 'center', color: '#f87171' }}>
            <AlertCircle size={28} style={{ margin: '0 auto 8px' }} />
            <div>{data?.error || 'Parquet dataset file is missing or still being compiled by Go engine.'}</div>
          </div>
        ) : activeTab === 'schema' ? (
          /* Parquet Schema Table */
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>#</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>COLUMN NAME</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>ARROW TYPE</th>
              </tr>
            </thead>
            <tbody>
              {data.schema?.map((col, idx) => (
                <tr key={col.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '8px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                  <td style={{ padding: '8px', color: '#ffffff', fontWeight: 600 }}>{col.name}</td>
                  <td style={{ padding: '8px', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>{col.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          /* Sample Rows Grid */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.02)' }}>
                  {data.columns?.map((col) => (
                    <th key={col} style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.records?.map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    {data.columns?.map((col) => (
                      <td
                        key={col}
                        style={{
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                          color: col === 'symbol' ? '#38bdf8' : col === 'option_type' ? (row[col] === 'CE' ? '#34d399' : '#f87171') : '#cbd5e1',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {String(row[col] !== undefined ? row[col] : '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}