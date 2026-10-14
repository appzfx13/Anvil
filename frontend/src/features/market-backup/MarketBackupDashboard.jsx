import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Plus, RefreshCw, HardDrive, Play, Layers, Sparkles } from 'lucide-react';
import CreateBackupModal from './CreateBackupModal';
import BackupTable from './BackupTable';
import ParquetInspectorDrawer from './ParquetInspectorDrawer';
import { useBackupWebSocket } from './useBackupWebSocket';

export default function MarketBackupDashboard({ user, addToast }) {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTaskForInspect, setSelectedTaskForInspect] = useState(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Subscribes to Go Engine WebSocket and handles real-time task mutations (zero polling)
  useBackupWebSocket(null, (telemetry) => {
    if (telemetry.status === 'COMPLETED') {
      addToast?.('success', 'Backup Task #' + telemetry.task_id + ' completed successfully!');
    } else if (telemetry.status === 'FAILED') {
      addToast?.('error', 'Backup Task #' + telemetry.task_id + ' failed: ' + (telemetry.message || ''));
    }
  });

  // Fetch tasks with TanStack Query
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['market-backups'],
    queryFn: async () => {
      const res = await fetch('/api/v1/market/backups/');
      if (!res.ok) throw new Error('Failed to fetch backup tasks');
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const tasks = data?.data || [];
  const stats = data?.stats || { total_tasks: 0, total_size_mb: 0, active_jobs: 0 };

  // Create Task Mutation
  const createMutation = useMutation({
    mutationFn: async (taskData) => {
      const res = await fetch('/api/v1/market/backups/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(JSON.stringify(errData));
      }
      return res.json();
    },
    onSuccess: (resData) => {
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['market-backups'] });
      addToast?.('success', 'Market data backup task queued for execution!');
    },
    onError: (err) => {
      addToast?.('error', 'Failed to queue backup task: ' + (err.message || ''));
    },
  });

  // Cancel Task Mutation
  const cancelMutation = useMutation({
    mutationFn: async (taskId) => {
      const res = await fetch('/api/v1/market/backups/' + taskId + '/cancel/', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-backups'] });
      addToast?.('info', 'Cancellation signal sent to Go worker.');
    },
  });

  // Retry Task Mutation
  const retryMutation = useMutation({
    mutationFn: async (taskId) => {
      const res = await fetch('/api/v1/market/backups/' + taskId + '/retry/', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-backups'] });
      addToast?.('success', 'Task re-queued successfully.');
    },
  });

  // Delete Task Mutation
  const deleteMutation = useMutation({
    mutationFn: async (taskId) => {
      const res = await fetch('/api/v1/market/backups/' + taskId + '/', { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market-backups'] });
      addToast?.('info', 'Task deleted.');
    },
  });

  const handleInspect = (task) => {
    setSelectedTaskForInspect(task);
    setIsInspectorOpen(true);
  };

  const handleDownload = (task) => {
    window.location.href = '/api/v1/market/backups/' + task.id + '/download/';
  };

  return (
    <div id="market-backup-dashboard-page" style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.72rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              F&O PIPELINE
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Apache Parquet Multi-Strike Compaction
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#ffffff', fontWeight: 800 }}>
            Market Data Backup & Historical Archiver
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary"
            style={{ padding: '9px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
            style={{ padding: '9px 18px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>New Backup Task</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>TOTAL DATASETS</span>
            <Database size={16} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
            {stats.total_tasks}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Archived F&O session datasets
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>STORAGE UTILIZED</span>
            <HardDrive size={16} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
            {stats.total_size_mb.toFixed(2)} MB
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Snappy-compressed binary storage
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>ACTIVE JOBS</span>
            <Play size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {stats.active_jobs}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
            Go worker goroutines running
          </div>
        </div>
      </div>

      {/* Main Backup Tasks Grid */}
      <BackupTable
        tasks={tasks}
        onInspect={handleInspect}
        onDownload={handleDownload}
        onCancel={(id) => cancelMutation.mutate(id)}
        onRetry={(id) => retryMutation.mutate(id)}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      {/* Create Backup Task Modal */}
      <CreateBackupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(taskData) => createMutation.mutate(taskData)}
        isPending={createMutation.isPending}
      />

      {/* Parquet Inspection Side Drawer */}
      <ParquetInspectorDrawer
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        task={selectedTaskForInspect}
        onDownload={handleDownload}
      />
    </div>
  );
}