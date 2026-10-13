import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Toast from './components/Toast';
import Modal from './components/Modal';
import DataFeedModal from './components/DataFeedModal';
import ProfileModal from './components/ProfileModal';
import LiveDashboardView from './components/LiveDashboardView';
import OrderModal from './components/OrderModal';
import OptionChainModal from './components/OptionChainModal';
import AdminTradersView from './components/AdminTradersView';
import AdminTradesView from './components/AdminTradesView';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import ApiDocsPage from './pages/ApiDocsPage';
import AuthPage from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { api } from './services/api';
import { SUPPORTED_INDICES } from './services/constants';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // home | live_dashboard | dashboard | traders | trades | docs | auth | admin_login
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [ticks, setTicks] = useState({});
  const [hasFeedToken, setHasFeedToken] = useState(false);

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isDataFeedModalOpen, setIsDataFeedModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedTraderForProfile, setSelectedTraderForProfile] = useState(null);
  const [depositAmount, setDepositAmount] = useState('100000');

  // Order modal & Option chain modal for LiveDashboardView
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOptionChainModalOpen, setIsOptionChainModalOpen] = useState(false);
  const [orderModalParams, setOrderModalParams] = useState({
    index: 'NIFTY50',
    symbol: '',
    strike: null,
    side: 'BUY',
  });

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
    let token = localStorage.getItem('anvil_token');
    if (!token) {
      try {
        const demoRes = await api.auth.demoLogin('admin@anvil.local');
        if (demoRes && demoRes.token) {
          localStorage.setItem('anvil_token', demoRes.token);
          localStorage.setItem('anvil_client_id', demoRes.user.dhan_client_id);
          localStorage.setItem('anvil_access_token', demoRes.user.access_token);
          setUser(demoRes.user);
          setAccount(demoRes.account);
          setCurrentView('live_dashboard');
          return;
        }
      } catch (e) {}
    }

    try {
      const res = await api.auth.getMe();
      if (res && res.user) {
        setUser(res.user);
        setAccount(res.account);
        localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
        localStorage.setItem('anvil_access_token', res.user.access_token);
        if (currentView === 'home' || currentView === 'auth') {
          setCurrentView('live_dashboard');
        }
      } else {
        const demoRes = await api.auth.demoLogin('admin@anvil.local');
        if (demoRes && demoRes.token) {
          localStorage.setItem('anvil_token', demoRes.token);
          localStorage.setItem('anvil_client_id', demoRes.user.dhan_client_id);
          localStorage.setItem('anvil_access_token', demoRes.user.access_token);
          setUser(demoRes.user);
          setAccount(demoRes.account);
          setCurrentView('live_dashboard');
        }
      }
    } catch (err) {
      try {
        const demoRes = await api.auth.demoLogin('admin@anvil.local');
        if (demoRes && demoRes.token) {
          localStorage.setItem('anvil_token', demoRes.token);
          localStorage.setItem('anvil_client_id', demoRes.user.dhan_client_id);
          localStorage.setItem('anvil_access_token', demoRes.user.access_token);
          setUser(demoRes.user);
          setAccount(demoRes.account);
          setCurrentView('live_dashboard');
        }
      } catch (e) {}
    }
  };

  // Check Fyers Broker Data Feed Status from Site Configuration table
  const checkFeedConfig = async () => {
    try {
      const cfg = await api.fyers.getConfig();
      if (cfg) {
        setSiteConfig(cfg);
        setHasFeedToken(cfg.has_token);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchSession();
    checkFeedConfig();

    // Handle Fyers OAuth redirect query params
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('fyers_auth');
    if (authStatus === 'success') {
      addToast('success', 'Fyers Broker Data Feed authenticated! Real-time ticks active.');
      checkFeedConfig();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
      const msg = urlParams.get('msg') || 'Fyers authentication declined';
      addToast('error', `Fyers Auth: ${msg}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user directly navigated to admin portal
    if (window.location.pathname.includes('admin') || urlParams.get('view') === 'admin_login') {
      setCurrentView('admin_login');
    }
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

  // Navigation Guard & Router Handler
  const handleNavigate = (view) => {
    if (view === 'admin_login') {
      setCurrentView('admin_login');
      return;
    }
    if (view === 'profile' || view === 'marmot_config') {
      setSelectedTraderForProfile(user);
      setIsProfileModalOpen(true);
      return;
    }
    if (view === 'feed_config') {
      setIsDataFeedModalOpen(true);
      return;
    }
    if (!user && view !== 'home' && view !== 'auth' && view !== 'admin_login') {
      addToast('info', 'Please sign in or choose a demo account to access the Trading Terminal.');
      setCurrentView('home');
      return;
    }
    setCurrentView(view);
  };

  // 1-Click Fast Sandbox Demo Account Switcher
  const handleSwitchUser = async (email) => {
    try {
      const res = await api.auth.demoLogin(email);
      if (res && res.user) {
        localStorage.setItem('anvil_token', res.token);
        localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
        localStorage.setItem('anvil_access_token', res.user.access_token);
        setUser(res.user);
        setAccount(res.account);
        addToast('success', `Switched to ${res.user.full_name} (${res.user.dhan_client_id})`);
        if (currentView === 'home' || currentView === 'auth') {
          setCurrentView('live_dashboard');
        }
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to switch demo account.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('anvil_token');
    localStorage.removeItem('anvil_client_id');
    localStorage.removeItem('anvil_access_token');
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
    <div style={{ minHeight: '100vh', background: '#06080c', color: '#f8fafc' }}>
      {currentView === 'admin_login' ? (
        /* Dedicated Super Admin Authentication Portal */
        <AdminLoginPage
          onLoginSuccess={(u, a) => {
            setUser(u);
            setAccount(a);
            setCurrentView('live_dashboard');
          }}
          onNavigateToTrader={() => {
            if (user) {
              setCurrentView('live_dashboard');
            } else {
              setCurrentView('home');
            }
          }}
          addToast={addToast}
        />
      ) : user ? (
        /* Logged In: Luxury Obsidian App Shell with Left Sidebar & Top Header */
        <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', background: '#06080c' }}>
          {/* Left Sidebar (Matching media_1791873450802.png) */}
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            user={user}
            onLogout={handleLogout}
            onSwitchUser={handleSwitchUser}
            onOpenProfile={() => {
              setSelectedTraderForProfile(user);
              setIsProfileModalOpen(true);
            }}
          />

          {/* Main Viewport */}
          <div className="main-viewport" style={{ flex: 1, marginLeft: '250px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06080c' }}>
            <TopHeader
              user={user}
              account={account}
              siteConfig={siteConfig}
              onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
              onOpenProfile={() => {
                setSelectedTraderForProfile(user);
                setIsProfileModalOpen(true);
              }}
              onNavigate={handleNavigate}
            />

            {/* View Router */}
            <main style={{ flex: 1, padding: '0 0 40px 0' }}>
              {/* 1. Live Dashboard (Screenshot matching: Rocket card + Option Chain) */}
              {currentView === 'live_dashboard' && (
                <LiveDashboardView
                  user={user}
                  account={account}
                  ticks={ticks}
                  onOpenOrderModal={(params) => {
                    setOrderModalParams(params);
                    setIsOrderModalOpen(true);
                  }}
                  onOpenOptionChainModal={() => setIsOptionChainModalOpen(true)}
                  addToast={addToast}
                />
              )}

              {/* 2. Sandbox Terminal (Full Telemetry + Orders + Positions + Terminal) */}
              {(currentView === 'dashboard' || currentView === 'optionchain' || currentView === 'overview') && (
                <Dashboard
                  user={user}
                  account={account}
                  ticks={ticks}
                  initialTab={currentView === 'optionchain' ? 'optionchain' : 'positions'}
                  onRefreshAccount={fetchSession}
                  addToast={addToast}
                  onOpenMarmotConfig={() => {
                    setSelectedTraderForProfile(user);
                    setIsProfileModalOpen(true);
                  }}
                  onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
                />
              )}

              {/* 3. Admin Traders View */}
              {currentView === 'traders' && (
                <AdminTradersView
                  addToast={addToast}
                  onSelectTraderForMarmot={(trader) => {
                    setSelectedTraderForProfile(trader);
                    setIsProfileModalOpen(true);
                  }}
                />
              )}

              {/* 4. Admin Trade Controls View */}
              {currentView === 'trades' && (
                <AdminTradesView addToast={addToast} />
              )}

              {/* 5. API Documentation & Wire Specs */}
              {currentView === 'docs' && (
                <ApiDocsPage user={user} addToast={addToast} />
              )}
            </main>
          </div>
        </div>
      ) : (
        /* Logged Out: Landing / Auth with Quick Demo Login Access */
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <Navbar
            currentView={currentView}
            setCurrentView={handleNavigate}
            user={user}
            account={account}
            ticks={ticks}
            hasFeedToken={hasFeedToken}
            onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
            onLogout={handleLogout}
            onOpenDeposit={() => setIsDepositModalOpen(true)}
          />

          <main style={{ flex: 1 }}>
            {currentView === 'auth' ? (
              <AuthPage
                onLoginSuccess={(u, a) => {
                  setUser(u);
                  setAccount(a);
                  setCurrentView('live_dashboard');
                }}
                addToast={addToast}
              />
            ) : (
              <HomePage
                user={user}
                account={account}
                onNavigate={handleNavigate}
                onLoginSuccess={(u, a) => {
                  setUser(u);
                  setAccount(a);
                  setCurrentView('live_dashboard');
                }}
                onSwitchDemoUser={handleSwitchUser}
                addToast={addToast}
              />
            )}
          </main>
        </div>
      )}

      {/* Global Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Profile Modal for both Admin & User */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={selectedTraderForProfile || user}
        account={account}
        addToast={addToast}
        onRefreshSession={fetchSession}
        onSwitchUser={handleSwitchUser}
        onNavigate={handleNavigate}
      />

      {/* Order Modal for placing trades from LiveDashboardView */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        params={orderModalParams}
        ticks={ticks}
        account={account}
        addToast={addToast}
        onOrderPlaced={() => {
          fetchSession();
        }}
      />

      {/* Full 31 Strikes Option Chain Modal */}
      <OptionChainModal
        isOpen={isOptionChainModalOpen}
        onClose={() => setIsOptionChainModalOpen(false)}
        initialIndex="NIFTY50"
        onSelectStrike={(strikeParams) => {
          setIsOptionChainModalOpen(false);
          setOrderModalParams(strikeParams);
          setIsOrderModalOpen(true);
        }}
      />

      {/* Global Broker Data Feed Modal */}
      <DataFeedModal
        isOpen={isDataFeedModalOpen}
        onClose={() => setIsDataFeedModalOpen(false)}
        onConfigUpdated={(cfg) => {
          setSiteConfig(cfg);
          setHasFeedToken(cfg.has_token);
        }}
        addToast={addToast}
      />

      {/* Margin Deposit Modal */}
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
