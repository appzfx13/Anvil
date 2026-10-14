import React, { useState } from 'react';
import { Download, Eye, RotateCcw, StopCircle, Trash2, CheckCircle2, Clock, AlertTriangle, Layers, Calendar } from 'lucide-react';

export default function BackupTable({ tasks = [], onInspect, onDownload, onCancel, onRetry, onDelete }) {
  const getStatusBadge = (status, progress) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
            <CheckCircle2 size={12} /> COMPLETED
          </span>
        );
      case 'RUNNING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22d3ee', animation: 'pulse 1s infinite' }} /> {progress}% RUNNING
          </span>
        );
      case 'PENDING':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
            <Clock size={12} /> QUEUED
          </span>
        );
      case 'FAILED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
            <AlertTriangle size={12} /> FAILED
          </span>
        );
      case 'CANCELLED':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(100, 116, 139, 0.15)', color: '#94a3b8', border: '1px solid rgba(100, 116, 139, 0.3)', fontSize: '0.72rem', fontWeight: 700 }}>
            CANCELLED
          </span>
        );
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  if (!tasks.length) {
    return (
      <div className="glass-panel" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '12px' }}>
        <Calendar size={32} color="#64748b" style={{ margin: '0 auto 12px' }} />
        <h4 style={{ margin: '0 0 6px', color: '#ffffff', fontSize: '1rem' }}>No Backup Datasets Generated Yet</h4>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.82rem' }}>
          Schedule a historical Indian F&O multi-strike backup job to generate partitioned Apache Parquet archives.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>TASK ID</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>INDEX / ASSET</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>SESSION DATES</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>STRIKES & RES</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>PROGRESS</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>STATUS</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600 }}>FILE SIZE</th>
              <th style={{ padding: '12px 16px', color: '#94a3b8', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.id}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'background 0.15s ease',
                }}
              >
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: '#38bdf8', fontWeight: 700 }}>
                  #{String(task.id).padStart(4, '0')}
                </td>

                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{task.index_name}</span>
                    {task.include_vix && (
                      <span style={{ fontSize: '0.62rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '1px 4px', borderRadius: '3px' }}>
                        +VIX
                      </span>
                    )}
                  </div>
                </td>

                <td style={{ padding: '12px 16px', color: '#cbd5e1', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                  {task.start_date} <span style={{ color: '#64748b' }}>→</span> {task.end_date}
                </td>

                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#cbd5e1' }}>
                    ±{task.strike_count} ({task.total_strikes_count || task.strike_count * 2 + 1} Strikes)
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    {task.resolution_label || '5s Ticks'}
                  </div>
                </td>

                <td style={{ padding: '12px 16px', minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: (task.progress || 0) + '%',
                          background: task.status === 'FAILED' ? '#ef4444' : task.status === 'COMPLETED' ? '#10b981' : '#06b6d4',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      {task.progress || 0}%
                    </span>
                  </div>
                </td>

                <td style={{ padding: '12px 16px' }}>
                  {getStatusBadge(task.status, task.progress)}
                </td>

                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: '#cbd5e1' }}>
                  {task.file_size_mb > 0 ? task.file_size_mb.toFixed(2) + ' MB' : '--'}
                </td>

                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {/* Inspect Schema & Records */}
                    <button
                      onClick={() => onInspect(task)}
                      title="Inspect Schema & Parquet Rows"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        color: '#38bdf8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                      }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>

                    {/* Download */}
                    {task.status === 'COMPLETED' && (
                      <button
                        onClick={() => onDownload(task)}
                        title="Download .parquet Dataset"
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.74rem',
                        }}
                      >
                        <Download size={13} />
                        <span>Parquet</span>
                      </button>
                    )}

                    {/* Cancel Running */}
                    {(task.status === 'RUNNING' || task.status === 'PENDING') && (
                      <button
                        onClick={() => onCancel(task.id)}
                        title="Cancel Job"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          cursor: 'pointer',
                        }}
                      >
                        <StopCircle size={13} />
                      </button>
                    )}

                    {/* Retry Failed */}
                    {(task.status === 'FAILED' || task.status === 'CANCELLED') && (
                      <button
                        onClick={() => onRetry(task.id)}
                        title="Retry Job"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#facc15',
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    {/* Delete Task */}
                    <button
                      onClick={() => onDelete(task.id)}
                      title="Delete Task & Files"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'transparent',
                        color: '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}