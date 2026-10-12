/**
 * ANVIL API Client Service
 */

const API_BASE = '/api';
const DHAN_BASE = '/v2';

// Helper for authenticated fetch
async function request(url, options = {}) {
  const token = localStorage.getItem('anvil_token');
  const clientId = localStorage.getItem('anvil_client_id') || '1000000001';
  const accessToken = localStorage.getItem('anvil_access_token') || 'dhn_sec_sandbox_demo_token_2026';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'client-id': clientId,
    'access-token': accessToken,
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
    verifyOtp: (email, otp) => request(`${API_BASE}/auth/otp/verify/`, { method: 'POST', body: JSON.stringify({ email, otp }) }),
    googleLogin: (email, name, google_id) => request(`${API_BASE}/auth/google/`, { method: 'POST', body: JSON.stringify({ email, name, google_id }) }),
    getMe: () => request(`${API_BASE}/auth/me/`),
    resetCredentials: () => request(`${API_BASE}/auth/reset-keys/`, { method: 'POST' }),
  },

  // Account Ledger & Margins
  account: {
    getSummary: () => request(`${API_BASE}/accounts/summary/`),
    adjustFunds: (amount, reason) => request(`${API_BASE}/accounts/adjust-funds/`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
    resetLedger: () => request(`${API_BASE}/accounts/reset/`, { method: 'POST' }),
  },

  // Dhan v2 Core Endpoints
  dhan: {
    placeOrder: (orderData) => request(`${DHAN_BASE}/orders`, { method: 'POST', body: JSON.stringify(orderData) }),
    getOrders: () => request(`${DHAN_BASE}/orders`),
    cancelOrder: (orderId) => request(`${DHAN_BASE}/orders/${orderId}`, { method: 'DELETE' }),
    getTrades: () => request(`${DHAN_BASE}/trades`),
    getPositions: () => request(`${DHAN_BASE}/positions`),
    getFundLimit: () => request(`${DHAN_BASE}/fundlimit`),
    getOptionChain: (index = 'NIFTY50') => request(`${DHAN_BASE}/optionchain?index=${index}`),
    getQuotes: () => request(`${DHAN_BASE}/quotes`),
  },
};
