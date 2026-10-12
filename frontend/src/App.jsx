import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Modal from './components/Modal';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ApiDocsPage from './pages/ApiDocsPage';
import AuthPage from './pages/AuthPage';
import { api } from './services/api';
import { SUPPORTED_INDICES } from './services/constants';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // home | dashboard | docs | auth
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [ticks, setTicks] = useState({});
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100000');

  // Toast dispatch helper
  const addToast = (type, message, title = '') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize Default Tick Map
  useEffect(() => {
    const initialMap = {};
    SUPPORTED_INDICES.forEach((idx) => {
      initialMap[idx.key] = {
        symbol: idx.fyersSymbol,
        index_name: idx.name,
        ltp: idx.baseSpot,
        ch: 0.0,
        chp: 0.0,
      };
    });
    setTicks(initialMap);
  }, []);

  // Fetch Current Session & Telemetry
  const fetchSession = async () => {
    try {
      const res = await api.auth.getMe();
      if (res && res.user) {
        setUser(res.user);
        setAccount(res.account);
        localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
        localStorage.setItem('anvil_access_token', res.user.access_token);
      }
    } catch (err) {
      // Unauthenticated, default sandbox available
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // Connect WebSocket Market Feed / Polling
  useEffect(() => {
    let ws = null;
    let pollInterval = null;

    const setupWs = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host;
      const wsUrl = `${wsProtocol}//${wsHost}/v2/marketfeed/ws`;

      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'TICK' && data.index) {
              setTicks((prev) => ({
                ...prev,
                [data.index]: {
                  symbol: data.fyers_symbol,
                  index_name: data.index,
                  ltp: data.ltp,
                  ch: data.ch,
                  chp: data.chp,
                },
              }));
            }
          } catch (e) {}
        };
        ws.onerror = () => {
          startPolling();
        };
      } catch (err) {
        startPolling();
      }
    };

    const startPolling = () => {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const res = await api.dhan.getQuotes();
          if (res && res.quotes) {
            const update = {};
            res.quotes.forEach((q) => {
              if (q.index_key) {
                update[q.index_key] = q;
              }
            });
            setTicks((prev) => ({ ...prev, ...update }));
          }
        } catch (e) {}
      }, 2000);
    };

    setupWs();

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('anvil_token');
    setUser(null);
    setAccount(null);
    setCurrentView('home');
    addToast('info', 'Signed out of ANVIL sandbox session.');
  };

  // Handle Deposit
  const handleDepositConfirm = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || isNaN(amt)) {
      addToast('error', 'Enter a valid amount.');
      return;
    }
    try {
      await api.account.adjustFunds(amt, 'Virtual Margin Deposit');
      addToast('success', `Deposited ₹${amt.toLocaleString('en-IN')} to virtual ledger.`);
      setIsDepositModalOpen(false);
      fetchSession();
    } catch (err) {
      addToast('error', err.message || 'Deposit failed.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        account={account}
        ticks={ticks}
        onLogout={handleLogout}
        onOpenDeposit={() => setIsDepositModalOpen(true)}
      />

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {currentView === 'home' && (
          <HomePage onNavigate={(v) => setCurrentView(v)} />
        )}

        {currentView === 'dashboard' && (
          <Dashboard
            user={user}
            account={account}
            ticks={ticks}
            onRefreshAccount={fetchSession}
            addToast={addToast}
          />
        )}

        {currentView === 'docs' && (
          <ApiDocsPage user={user} addToast={addToast} />
        )}

        {currentView === 'auth' && (
          <AuthPage
            onLoginSuccess={(u, a) => {
              setUser(u);
              setAccount(a);
              setCurrentView('dashboard');
            }}
            addToast={addToast}
          />
        )}
      </main>

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Quick Margin Deposit Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        title="Deposit Virtual Sandbox Margin"
        confirmText="Confirm Deposit"
        onConfirm={handleDepositConfirm}
        onCancel={() => setIsDepositModalOpen(false)}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            MARGIN AMOUNT TO ADD (INR)
          </label>
          <input
            id="navbar-deposit-amount-input"
            type="number"
            step="10000"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              color: '#ffffff',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '1.1rem',
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
