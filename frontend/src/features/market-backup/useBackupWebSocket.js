import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * useBackupWebSocket:
 * Subscribes to Go Engine WebSocket (/v2/marketfeed/ws or /ws/market/backup).
 * Automatically intercepts 'BACKUP_PROGRESS' telemetry events and applies
 * zero-HTTP-polling optimistic cache mutations to TanStack Query.
 */
export function useBackupWebSocket(taskId = null, onProgress = null) {
  const queryClient = useQueryClient();
  const wsRef = useRef(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = protocol + '//' + window.location.host + '/v2/marketfeed/ws';

    let socket;
    let reconnectTimer;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          // Connected to Go WebSocket Telemetry Hub
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'BACKUP_PROGRESS') {
              if (onProgress) {
                onProgress(data);
              }

              // Update TanStack Query cache in-memory with zero HTTP roundtrips
              queryClient.setQueryData(['market-backups'], (oldData) => {
                if (!oldData || !oldData.data) return oldData;
                const updatedList = oldData.data.map((task) => {
                  if (String(task.id) === String(data.task_id)) {
                    return {
                      ...task,
                      status: data.status,
                      progress: data.progress,
                      file_size_mb: data.file_size_mb || task.file_size_mb,
                      error_logs: data.message || task.error_logs,
                    };
                  }
                  return task;
                });

                return {
                  ...oldData,
                  data: updatedList,
                  stats: {
                    ...oldData.stats,
                    active_jobs: updatedList.filter((t) => t.status === 'RUNNING' || t.status === 'PENDING').length,
                  },
                };
              });
            }
          } catch (e) {
            // Ignore non-json ticks
          }
        };

        socket.onclose = () => {
          reconnectTimer = setTimeout(connect, 3000);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.close(1000); } catch (e) {}
        } else if (socket.readyState === WebSocket.CONNECTING) {
          socket.onopen = () => {
            try { socket.close(1000); } catch (e) {}
          };
        }
      }
    };
  }, [queryClient, taskId, onProgress]);

  return wsRef;
}