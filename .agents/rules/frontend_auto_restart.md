# Rule: Frontend Auto-Restart & Hot Reloading

## 1. Mandatory Container Restart on Frontend Changes
- Whenever any frontend file (under rontend/src/, rontend/index.html, etc.) is modified, created, or deleted, automatically run:
  `powershell
  docker restart anvil_frontend
  `
  in c:\Users\godla\OneDrive\Desktop\workspace\Projects\Tasks\anvil\Anvil to guarantee changes are served without stale container caching.

## 2. Docker Hot Reloading (Polling)
- Ensure Vite in Docker uses server.watch.usePolling: true so Windows file-system changes propagate instantly across the Docker volume mount into Vite's HMR watcher.
