/**
 * ANVIL API Client Service
 */

const API_BASE = '/api';
const DHAN_BASE = '/v2';

// Helper for authenticated fetch
async function request(url, options = {}) {
  const token = localStorage.getItem('anvil_token');
  const clientId = localStorage.getItem('anvil_client_id');
  const accessToken = localStorage.getItem('anvil_access_token');

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(clientId ? { 'client-id': clientId } : {}),
    ...(accessToken ? { 'access-token': accessToken } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errorMsg = data.remarks || data.error || data.detail || `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err) {
    console.error(`[ANVIL-API-ERROR] ${url}:`, err);
    throw err;
  }
}

export const api = {
  // Authentication & Session
  auth: {
    sendOtp: (email) => request(`${API_BASE}/auth/otp/send/`, { method: 'POST', body: JSON.stringify({ email }) }),
    getGoogleConfig: () => request(`${API_BASE}/auth/google/`),
    googleLogin: (data) => request(`${API_BASE}/auth/google/`, { method: 'POST', body: JSON.stringify(typeof data === 'object' ? data : { email: data }) }),
    demoLogin: (email) => request(`${API_BASE}/auth/demo-login/`, { method: 'POST', body: JSON.stringify(email ? { email } : {}) }),
    adminLogin: (credentials) => request(`${API_BASE}/auth/admin-login/`, { method: 'POST', body: JSON.stringify(credentials) }),
    getMe: () => request(`${API_BASE}/auth/me/`),
    updateProfile: (data) => request(`${API_BASE}/auth/me/`, { method: 'PUT', body: JSON.stringify(data) }),
    resetCredentials: () => request(`${API_BASE}/auth/reset-keys/`, { method: 'POST' }),
  },

  // Admin Portal & Multi-Trader Management
  admin: {
    getTraders: () => request(`${API_BASE}/admin-portal/traders/`),
    traderAction: (userId, action, data = {}) => request(`${API_BASE}/admin-portal/traders/${userId}/action/`, { method: 'POST', body: JSON.stringify({ action, ...data }) }),
    getTrades: () => request(`${API_BASE}/admin-portal/trades/`),
    getOrders: () => request(`${API_BASE}/admin-portal/orders/`),
    getOverview: () => request(`${API_BASE}/admin-portal/overview/`),
  },

  // Account Ledger & Margins
  account: {
    getSummary: () => request(`${API_BASE}/accounts/summary/`),
    adjustFunds: (amount, reason) => request(`${API_BASE}/accounts/adjust-funds/`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
    resetLedger: () => request(`${API_BASE}/accounts/reset/`, { method: 'POST' }),
    getPostback: () => request(`${API_BASE}/accounts/postback/`),
    savePostback: (url) => request(`${API_BASE}/accounts/postback/`, { method: 'POST', body: JSON.stringify({ postback_webhook_url: url }) }),
    testPostback: () => request(`${API_BASE}/accounts/test-postback/`, { method: 'POST' }),
  },

  // Site Configuration & Fyers API v3 Data Feed
  fyers: {
    getConfig: () => request(`${API_BASE}/fyers/config/`),
    saveConfig: (configData) => request(`${API_BASE}/fyers/config/`, { method: 'POST', body: JSON.stringify(configData) }),
    getAuthUrl: (redirectUri) => request(`${API_BASE}/fyers/auth-url/?redirect_uri=${encodeURIComponent(redirectUri || '')}`),
    testFeed: () => request(`${API_BASE}/fyers/test-feed/`, { method: 'POST' }),
    getHistory: (symbol, resolution = '5m', from, to) => {
      let url = `${API_BASE}/fyers/history/?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}`;
      if (from) url += `&from=${from}`;
      if (to) url += `&to=${to}`;
      return request(url);
    },
  },


  // Dhan v2 Core Endpoints
  dhan: {
    getToken: (clientId, clientSecret) => request(`${DHAN_BASE}/token`, { method: 'POST', body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }) }),
    getKillSwitch: () => request(`${DHAN_BASE}/killswitch`),
    activateKillSwitch: () => request(`${DHAN_BASE}/killswitch`, { method: 'POST', body: JSON.stringify({ killSwitchStatus: 'ACTIVATE' }) }),
    deactivateKillSwitch: () => request(`${DHAN_BASE}/killswitch`, { method: 'DELETE' }),
    placeOrder: (orderData) => request(`${DHAN_BASE}/orders`, { method: 'POST', body: JSON.stringify(orderData) }),
    getOrders: () => request(`${DHAN_BASE}/orders`),
    cancelOrder: (orderId) => request(`${DHAN_BASE}/orders/${orderId}`, { method: 'DELETE' }),
    getTrades: () => request(`${DHAN_BASE}/trades`),
    getPositions: () => request(`${DHAN_BASE}/positions`),
    getFundLimit: () => request(`${DHAN_BASE}/fundlimit`),
    getOptionChain: (index = 'NIFTY50') => request(`${DHAN_BASE}/optionchain?index=${index}`),
    getQuotes: () => request(`${DHAN_BASE}/quotes`),
    evaluateOrders: () => request(`${DHAN_BASE}/orders/evaluate-triggers`, { method: 'POST' }),
  },
};
