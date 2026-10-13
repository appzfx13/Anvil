import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import Toast from './components/Toast';
import Modal from './components/Modal';
import DataFeedModal from './components/DataFeedModal';
import ProfileModal from './components/ProfileModal';
import OrderModal from './components/OrderModal';
import OptionChainModal from './components/OptionChainModal';
import AdminTradersView from './components/AdminTradersView';
import AdminTradesView from './components/AdminTradesView';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import OptionChainPage from './pages/OptionChainPage';
import ChartsPage from './pages/ChartsPage';
import MarketFeedPage from './pages/MarketFeedPage';
import MarmotConnectPage from './pages/MarmotConnectPage';
import ProfilePage from './pages/ProfilePage';
import AuthPage from './pages/AuthPage';
import AdminLoginPage from './pages/AdminLoginPage';
import { api } from './services/api';
import { SUPPORTED_INDICES } from './services/constants';

// Path-based HTML5 History Routing Definitions
const PATH_TO_VIEW = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/market': 'dashboard',
  '/charts': 'charts',
  '/chart': 'charts',
  '/terminal': 'charts',
  '/optionchain': 'optionchain',
  '/option-chain': 'optionchain',
  '/feed': 'feed',
  '/market-feed': 'feed',
  '/feed-config': 'feed',
  '/marmot': 'marmot',
  '/marmot-connect': 'marmot',
  '/profile': 'profile',
  '/trades': 'trades',
  '/orders': 'trades',
  '/traders': 'traders',
  '/auth': 'auth',
  '/login': 'auth',
  '/admin': 'admin_login',
  '/admin/login': 'admin_login',
};

const VIEW_TO_PATH = {
  dashboard: '/dashboard',
  charts: '/charts',
  optionchain: '/optionchain',
  feed: '/feed',
  marmot: '/marmot',
  profile: '/profile',
  trades: '/trades',
  traders: '/traders',
  auth: '/auth',
  admin_login: '/admin',
  home: '/',
};

function getRouteFromLocation() {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'admin_login' || path === '/admin' || path === '/admin/login') {
    return 'admin_login';
  }
  return PATH_TO_VIEW[path] || 'dashboard';
}

export default function App() {
  const [currentView, setCurrentView] = useState(() => getRouteFromLocation());
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [ticks, setTicks] = useState({});
  const [optionChainWsData, setOptionChainWsData] = useState({});
  const [hasFeedToken, setHasFeedToken] = useState(false);

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isDataFeedModalOpen, setIsDataFeedModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedTraderForProfile, setSelectedTraderForProfile] = useState(null);
  const [depositAmount, setDepositAmount] = useState('100000');

  // Quick Order & Option chain modal
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

  // Sync with browser Back / Forward navigation (PopState)
  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteFromLocation();
      setCurrentView(route);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Google OAuth access_token returned in hash
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        window.history.replaceState(null, '', window.location.pathname);
        api.auth.googleLogin({ access_token: accessToken })
          .then((res) => {
            if (res && res.token) {
              localStorage.setItem('anvil_token', res.token);
              localStorage.setItem('anvil_client_id', res.user.dhan_client_id);
              localStorage.setItem('anvil_access_token', res.user.access_token);
              setUser(res.user);
              setAccount(res.account);
              addToast('success', `Signed in via Google SSO as ${res.user.full_name || res.user.email}!`);
              setCurrentView('dashboard');
            }
          })
          .catch((err) => {
            console.error('Google OAuth token verification failed:', err);
            addToast('error', 'Google SSO authentication failed.');
          });
      }
    }
  }, []);

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
    const initialRoute = getRouteFromLocation();

    if (!token) {
      if (initialRoute === 'auth' || initialRoute === 'admin_login') {
        setCurrentView(initialRoute);
        return;
      }
      try {
        const demoRes = await api.auth.demoLogin('admin@anvil.local');
        if (demoRes && demoRes.token) {
          localStorage.setItem('anvil_token', demoRes.token);
          localStorage.setItem('anvil_client_id', demoRes.user.dhan_client_id);
          localStorage.setItem('anvil_access_token', demoRes.user.access_token);
          setUser(demoRes.user);
          setAccount(demoRes.account);
          const initial = getRouteFromLocation();
          setCurrentView(initial === 'admin_login' ? 'admin_login' : initial || 'dashboard');
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
        const initial = getRouteFromLocation();
        setCurrentView(initial === 'admin_login' ? 'admin_login' : initial || 'dashboard');
      } else {
        const demoRes = await api.auth.demoLogin('admin@anvil.local');
        if (demoRes && demoRes.token) {
          localStorage.setItem('anvil_token', demoRes.token);
          localStorage.setItem('anvil_client_id', demoRes.user.dhan_client_id);
          localStorage.setItem('anvil_access_token', demoRes.user.access_token);
          setUser(demoRes.user);
          setAccount(demoRes.account);
          const initial = getRouteFromLocation();
          setCurrentView(initial === 'admin_login' ? 'admin_login' : initial || 'dashboard');
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
          const initial = getRouteFromLocation();
          setCurrentView(initial === 'admin_login' ? 'admin_login' : initial || 'dashboard');
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
            } else if (data.type === 'OPTION_CHAIN' || (data.strikes && (data.index_symbol || data.index))) {
              const idxKey = data.index || data.index_symbol;
              setOptionChainWsData((prev) => ({
                ...prev,
                [idxKey]: data,
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
      const fetchOnce = async () => {
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
      };
      fetchOnce();
      pollInterval = setInterval(fetchOnce, 2000);
    };

    startPolling();
    setupWs();

    return () => {
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  // Navigation Guard & HTML5 History Router Handler
  const handleNavigate = (view) => {
    if (view === 'admin_login') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState({ view: 'admin_login' }, '', '/admin');
      }
      setCurrentView('admin_login');
      return;
    }
    if (view === 'marmot_config') {
      view = 'marmot';
    }
    if (view === 'feed_config') {
      view = 'feed';
    }
    if (!user && view !== 'home' && view !== 'auth' && view !== 'admin_login') {
      addToast('info', 'Please sign in or choose a demo account to access the Market Desk.');
      if (window.location.pathname !== '/') {
        window.history.pushState({ view: 'home' }, '', '/');
      }
      setCurrentView('home');
      return;
    }

    const targetPath = VIEW_TO_PATH[view] || '/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ view }, '', targetPath);
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
          handleNavigate('dashboard');
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
    if (window.location.pathname !== '/') {
      window.history.pushState({ view: 'home' }, '', '/');
    }
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
            handleNavigate('dashboard');
          }}
          onNavigateToTrader={() => {
            if (user) {
              handleNavigate('dashboard');
            } else {
              handleNavigate('home');
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
            onOpenOptionChainModal={() => setIsOptionChainModalOpen(true)}
            onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
          />

          {/* Main Viewport */}
          <div className="main-viewport" style={{ flex: 1, marginLeft: '250px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#06080c' }}>
            <TopHeader
              user={user}
              account={account}
              siteConfig={siteConfig}
              onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
              onOpenProfile={() => handleNavigate('profile')}
              onNavigate={handleNavigate}
            />

            {/* View Router */}
            <main style={{ flex: 1, padding: '0 0 40px 0' }}>
              {/* 1. Market Desk (Primary Trading Sandbox: Real Quotes, Level-1 Depth, Positions & Orders) */}
              {(currentView === 'dashboard' || currentView === 'overview' || currentView === 'market') && (
                <Dashboard
                  user={user}
                  account={account}
                  ticks={ticks}
                  onRefreshAccount={fetchSession}
                  addToast={addToast}
                  onOpenMarmotConfig={() => {
                    setSelectedTraderForProfile(user);
                    setIsProfileModalOpen(true);
                  }}
                  onOpenDataFeed={() => setIsDataFeedModalOpen(true)}
                />
              )}

              {/* 2. Visual Terminal & Candlestick Charts with Position & Order Overlays */}
              {currentView === 'charts' && (
                <ChartsPage
                  user={user}
                  account={account}
                  ticks={ticks}
                  addToast={addToast}
                  onRefreshAccount={fetchSession}
                />
              )}

              {/* 3. Dedicated Full-Page Option Chain Matrix */}
              {currentView === 'optionchain' && (
                <OptionChainPage
                  user={user}
                  account={account}
                  ticks={ticks}
                  optionChainWsData={optionChainWsData}
                  addToast={addToast}
                  onRefreshAccount={fetchSession}
                />
              )}

              {/* 2. Admin Traders Directory */}
              {currentView === 'traders' && (
                <AdminTradersView
                  addToast={addToast}
                  onSelectTraderForMarmot={(trader) => {
                    setSelectedTraderForProfile(trader);
                    setIsProfileModalOpen(true);
                  }}
                />
              )}

              {/* 3. Admin Orders & Execution Ledger */}
              {currentView === 'trades' && (
                <AdminTradesView addToast={addToast} />
              )}

              {/* 4. Dedicated Market Data Feed Configuration Page */}
              {currentView === 'feed' && (
                <MarketFeedPage
                  user={user}
                  ticks={ticks}
                  addToast={addToast}
                />
              )}

              {/* 5. Dedicated Marmot Connect & Gateway Page */}
              {currentView === 'marmot' && (
                <MarmotConnectPage
                  user={user}
                  account={account}
                  onRefreshAccount={fetchSession}
                  addToast={addToast}
                />
              )}

              {/* 6. Dedicated Profile & Marmot API Credentials Page */}
              {currentView === 'profile' && (
                <ProfilePage
                  user={user}
                  account={account}
                  onRefreshAccount={fetchSession}
                  onUpdateUser={(updatedUser) => {
                    setUser(updatedUser);
                  }}
                  addToast={addToast}
                  onNavigate={handleNavigate}
                />
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
                  handleNavigate('dashboard');
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
                  handleNavigate('dashboard');
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

      {/* Quick Order Modal */}
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
