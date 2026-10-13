import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  Wallet,
  RotateCcw,
  Copy,
  Check,
  Edit2,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminTradersView({ addToast, onSelectTraderForMarmot }) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Modal states
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [isAdjustBalanceOpen, setIsAdjustBalanceOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('100000');
  const [adjustReason, setAdjustReason] = useState('Admin Deposit');

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editIsStaff, setEditIsStaff] = useState(false);

  const fetchTraders = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getTraders();
      if (res && res.traders) {
        setTraders(res.traders);
      }
    } catch (err) {
      addToast('error', err.message || 'Failed to fetch traders list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraders();
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast('success', `Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleToggleKillSwitch = async (trader) => {
    try {
      const res = await api.admin.traderAction(trader.id, 'toggle_killswitch');
      addToast('success', res.message || 'Kill switch status updated.');
      fetchTraders();
    } catch (err) {
      addToast('error', err.message || 'Failed to toggle kill switch.');
    }
  };

  const handleResetLedger = async (trader) => {
    if (!window.confirm(`Reset virtual ledger for ${trader.full_name} (${trader.dhan_client_id}) to ₹500,000? All active orders will be cancelled.`)) {
      return;
    }
    try {
      const res = await api.admin.traderAction(trader.id, 'reset_ledger');
      addToast('success', res.message || 'Ledger reset successfully.');
      fetchTraders();
    } catch (err) {
      addToast('error', err.message || 'Failed to reset ledger.');
    }
  };

  const handleAdjustBalanceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrader) return;
    try {
      const res = await api.admin.traderAction(selectedTrader.id, 'adjust_balance', {
        amount: adjustAmount,
        reason: adjustReason,
      });
      addToast('success', res.message || 'Balance adjusted successfully.');
      setIsAdjustBalanceOpen(false);
      fetchTraders();
    } catch (err) {
      addToast('error', err.message || 'Failed to adjust balance.');
    }
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrader) return;
    try {
      const res = await api.admin.traderAction(selectedTrader.id, 'update_profile', {
        full_name: editName,
        email: editEmail,
        is_staff: editIsStaff,
      });
      addToast('success', res.message || 'Profile updated successfully.');
      setIsEditProfileOpen(false);
      fetchTraders();
    } catch (err) {
      addToast('error', err.message || 'Failed to update profile.');
    }
  };

  const openAdjustBalanceModal = (trader) => {
    setSelectedTrader(trader);
    setAdjustAmount('100000');
    setAdjustReason('Admin Margin Allocation');
    setIsAdjustBalanceOpen(true);
  };

  const openEditProfileModal = (trader) => {
    setSelectedTrader(trader);
    setEditName(trader.full_name);
    setEditEmail(trader.email);
    setEditIsStaff(trader.is_staff);
    setIsEditProfileOpen(true);
  };

  const filteredTraders = traders.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.dhan_client_id.toLowerCase().includes(q)
    );
  });

  const totalMarginDeployed = traders.reduce((acc, t) => acc + (t.available_balance || 0), 0);
  const totalOrders = traders.reduce((acc, t) => acc + (t.orders_count || 0), 0);
  const activeKillSwitches = traders.filter((t) => t.kill_switch_active).length;

  return (
    <div className="profile-page-shell">
      {/* Profile Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="profile-header-badge">
          <div className="profile-category-pill cyan">ADMIN CONSOLE</div>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>/</span>
          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Multi-Trader Accounts & Ledgers</span>
          <span className="pill-badge badge-cyan" style={{ fontSize: '0.66rem', marginLeft: 'auto' }}>
            ● DHAN v2 SANDBOX WIRES
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="profile-page-title">
              Traders Management
            </h1>
            <p className="profile-page-subtitle">
              Multi-trader roster, virtual margin balances, emergency kill switches, and Dhan API credentials.
            </p>
          </div>

          <button
            onClick={fetchTraders}
            disabled={loading}
            className="profile-btn-ghost"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>TOTAL TRADERS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{traders.length}</div>
          <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px' }}>100% Provisioned & Active</div>
        </div>

        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>TOTAL VIRTUAL MARGIN</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            ₹{totalMarginDeployed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>Across all sandbox ledgers</div>
        </div>

        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>DAY ORDERS EXECUTED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{totalOrders}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>Sub-50ms engine fills</div>
        </div>

        <div className="profile-metric-tile">
          <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '8px' }}>ACTIVE KILL SWITCHES</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: activeKillSwitches > 0 ? '#f43f5e' : '#10b981', fontFamily: 'var(--font-mono)' }}>
            {activeKillSwitches}
          </div>
          <div style={{ fontSize: '0.74rem', color: activeKillSwitches > 0 ? '#f43f5e' : '#10b981', marginTop: '4px' }}>
            {activeKillSwitches > 0 ? 'Accounts Locked' : 'All Accounts Normal'}
          </div>
        </div>
      </div>

      {/* Search Bar & Table Header */}
      <div className="profile-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ position: 'relative', width: '360px' }}>
            <Search size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter by name, email, or client ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="profile-input"
              style={{ paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', fontSize: '0.82rem' }}
            />
          </div>

          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            Showing <strong>{filteredTraders.length}</strong> of {traders.length} traders
          </div>
        </div>

        {/* Traders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="trading-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>TRADER</th>
                <th>CLIENT ID</th>
                <th>ROLE</th>
                <th style={{ textAlign: 'right' }}>AVAILABLE MARGIN</th>
                <th>ORDERS</th>
                <th>STATUS</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraders.map((trader) => (
                <tr key={trader.id}>
                  {/* Trader Name & Email */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: trader.is_staff ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {trader.full_name ? trader.full_name.charAt(0) : 'T'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.88rem' }}>{trader.full_name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{trader.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Dhan Client ID */}
                  <td>
                    <button
                      onClick={() => copyToClipboard(trader.dhan_client_id, trader.id + '_id')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        color: 'var(--accent-cyan)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                      title="Click to copy Dhan Client ID"
                    >
                      <span>{trader.dhan_client_id}</span>
                      {copiedId === trader.id + '_id' ? <Check size={12} color="var(--bull-green)" /> : <Copy size={12} />}
                    </button>
                  </td>

                  {/* Role */}
                  <td>
                    <span className={trader.is_staff ? 'badge-cyan' : 'badge-emerald'} style={{ fontSize: '0.68rem' }}>
                      {trader.is_staff ? 'Super Admin' : 'Trader'}
                    </span>
                  </td>

                  {/* Available Margin */}
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                    ₹{Number(trader.available_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>

                  {/* Orders & Trades */}
                  <td>
                    <div style={{ fontSize: '0.78rem', color: '#e2e8f0' }}>
                      {trader.orders_count} orders / {trader.trades_count} trades
                    </div>
                  </td>

                  {/* Kill Switch Status */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className={trader.kill_switch_active ? 'pulse-dot-red' : 'pulse-dot-green'} />
                      <span style={{ fontSize: '0.76rem', color: trader.kill_switch_active ? 'var(--bear-red)' : 'var(--bull-green)', fontWeight: 600 }}>
                        {trader.kill_switch_active ? 'LOCKED' : 'NORMAL ARM'}
                      </span>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {/* Adjust Balance / Edit Profile */}
                      <button
                        onClick={() => openAdjustBalanceModal(trader)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                        title="Adjust virtual margin balance"
                      >
                        <Wallet size={13} /> Margin
                      </button>

                      {/* Edit Profile */}
                      <button
                        onClick={() => openEditProfileModal(trader)}
                        className="btn-secondary"
                        style={{ padding: '5px 8px', fontSize: '0.74rem' }}
                        title="Edit name, email or role"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Toggle Kill Switch */}
                      <button
                        onClick={() => handleToggleKillSwitch(trader)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: trader.kill_switch_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: trader.kill_switch_active ? 'var(--bull-green)' : 'var(--bear-red)',
                        }}
                        title={trader.kill_switch_active ? 'Unlock Trader' : 'Lock Trader with Kill Switch'}
                      >
                        {trader.kill_switch_active ? <Unlock size={13} /> : <Lock size={13} />}
                        <span>{trader.kill_switch_active ? 'Unlock' : 'Lock'}</span>
                      </button>

                      {/* Reset Ledger */}
                      <button
                        onClick={() => handleResetLedger(trader)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                        }}
                        title="Reset ledger to ₹500,000"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Balance Modal */}
      {isAdjustBalanceOpen && selectedTrader && (
        <div className="modal-overlay" onClick={() => setIsAdjustBalanceOpen(false)}>
          <div className="profile-card" style={{ maxWidth: '440px', width: '92%', margin: 'auto', padding: '26px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wallet size={20} color="#06b6d4" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Adjust Margin Balance</h3>
              </div>
              <button onClick={() => setIsAdjustBalanceOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div className="profile-tile" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700 }}>TRADER</div>
              <div style={{ fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{selectedTrader.full_name} ({selectedTrader.dhan_client_id})</div>
              <div style={{ fontSize: '0.86rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                Current Margin: ₹{Number(selectedTrader.available_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <form onSubmit={handleAdjustBalanceSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  AMOUNT (POSITIVE FOR DEPOSIT, NEGATIVE FOR WITHDRAWAL)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="profile-input"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem' }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  REASON / LEDGER NOTE
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="profile-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsAdjustBalanceOpen(false)} className="profile-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" className="profile-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && selectedTrader && (
        <div className="modal-overlay" onClick={() => setIsEditProfileOpen(false)}>
          <div className="profile-card" style={{ maxWidth: '440px', width: '92%', margin: 'auto', padding: '26px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="#6366f1" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>Edit Trader Profile</h3>
              </div>
              <button onClick={() => setIsEditProfileOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="profile-input"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="profile-input"
                />
              </div>

              <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="edit-is-staff-chk"
                  checked={editIsStaff}
                  onChange={(e) => setEditIsStaff(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                />
                <label htmlFor="edit-is-staff-chk" style={{ fontSize: '0.84rem', color: '#ffffff', cursor: 'pointer' }}>
                  Grant Super Admin privileges
                </label>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="profile-btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
                <button type="submit" className="profile-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
