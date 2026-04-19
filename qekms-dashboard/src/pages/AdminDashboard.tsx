import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Shield, Activity, Settings, UserPlus, Radio, RefreshCw, Trash2, CheckCircle2,
  XCircle, LogOut, DollarSign, Plus, Globe, ToggleLeft, ToggleRight, AlertTriangle, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

// ── Types ─────────────────────────────────────────────────────────────
interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  plan?: string;
  subscription_status?: string;
  created_at?: string;
}

interface ClientRequest {
  id: string;
  email: string;
  full_name: string;
  company: string;
  plan: string;
  status: string;
  amount?: number;
}

interface Channel {
  id: string;
  sender: string;
  receiver: string;
  is_active: boolean;
  created_at: string;
}

// ── Status badge ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'text-amber-500 bg-amber-500/10 border-amber-500/30',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    rejected: 'text-red-500 bg-red-500/10 border-red-500/30',
    active:   'text-primary-cyan bg-primary-cyan/10 border-primary-cyan/30',
    inactive: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
  };
  const s = map[status] ?? 'text-gray-500 bg-gray-500/10 border-gray-500/30';
  return (
    <span className={`${s} border rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'channels' | 'settings'>('overview');

  // Data
  const [users, setUsers]     = useState<User[]>([]);
  const [clients, setClients] = useState<ClientRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [sysSettings, setSysSettings] = useState<any>({});
  const [stats, setStats] = useState<any>({
    total_users: 0, pending_requests: 0,
    approved_requests: 0, rejected_requests: 0,
  });

  // UI
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser]   = useState({ email: '', password: '', role: 'account', plan: 'pro' });

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchStats    = useCallback(async () => { try { const { data } = await api.get('/admin/clients/stats'); setStats(data); } catch {} }, []);
  const fetchUsers    = useCallback(async () => { try { const { data } = await api.get('/admin/users'); setUsers(data); } catch {} }, []);
  const fetchClients  = useCallback(async () => { try { const { data } = await api.get('/admin/clients'); setClients(data); } catch {} }, []);
  const fetchChannels = useCallback(async () => { try { const { data } = await api.get('/admin/channels'); setChannels(data); } catch {} }, []);
  const fetchSettings = useCallback(async () => { try { const { data } = await api.get('/admin/settings'); setSysSettings(data); } catch {} }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    await Promise.all([fetchStats(), fetchUsers(), fetchClients(), fetchChannels(), fetchSettings()]);
    setLoading(false);
  }, [fetchStats, fetchUsers, fetchClients, fetchChannels, fetchSettings]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Actions ──────────────────────────────────────────────────────────
  const handleAction = async (endpoint: string, method: 'post' | 'put' | 'delete' | 'patch' = 'post', payload?: any) => {
    setLoading(true);
    try {
      await (api as any)[method](endpoint, payload);
      setSuccess('Operation completed successfully');
      setTimeout(() => setSuccess(''), 3000);
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed');
      setTimeout(() => setError(''), 4000);
    } finally { setLoading(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleAction('/admin/create-user', 'post', newUser);
    setShowAddForm(false);
    setNewUser({ email: '', password: '', role: 'account', plan: 'pro' });
  };

  const totalRevenue = clients.filter(c => c.status === 'approved' || c.amount).reduce((a, c) => a + (c.amount || 0), 0);
  const pendingCount = clients.filter(c => c.status === 'pending').length;

  // ── STAT CARDS ───────────────────────────────────────────────────────
  const statCards = [
    { label: 'Total Nodes',      value: stats.total_users,        icon: Users,      color: 'text-primary-cyan', bg: 'bg-primary-cyan/15', border: 'border-primary-cyan/25' },
    { label: 'Pending Requests', value: stats.pending_requests,   icon: Activity,   color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
    { label: 'Approved Nodes',   value: stats.approved_requests,  icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
    { label: 'Revenue',          value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-violet-500', bg: 'bg-violet-500/15', border: 'border-violet-500/25' },
  ];

  // ── TABS ─────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: Shield },
    { key: 'users',     label: 'Operators', icon: Users,   badge: users.length },
    { key: 'clients',   label: 'Requests',  icon: UserPlus, badge: pendingCount, highlight: pendingCount > 0 },
    { key: 'channels',  label: 'Mesh',      icon: Radio },
    { key: 'settings',  label: 'Config',    icon: Settings },
  ] as const;

  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans min-h-screen bg-mesh-dark text-white p-8 md:p-10 relative">
      {/* ── Ambient ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[100px]" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-mesh-gradient flex items-center justify-center">
              <Shield size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-extrabold tracking-tight m-0 text-white">Control Center</h1>
              <p className="text-xs text-gray-500 mt-0.5">QEKMS Enterprise Administration Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={fetchAll} size="sm" className="hidden sm:flex">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Sync
            </Button>
            <Button variant="danger" size="sm" onClick={logout}>
              <LogOut size={15} /> Log out
            </Button>
          </div>
        </div>

        {/* ── Feedback ── */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5 text-red-500 text-sm">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-5 text-emerald-500 text-sm">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <Card key={i} className="px-6 py-5.5 flex items-center gap-4">
              <div className={`w-11.5 h-11.5 rounded-xl border flex items-center justify-center shrink-0 ${s.bg} ${s.border}`}>
                <s.icon size={20} className={s.color} />
              </div>
              <div>
                <p className="text-[11px] text-gray-500 font-semibold m-0 tracking-wider uppercase">{s.label}</p>
                <p className="text-2xl font-extrabold m-0 mt-0.5 text-white">
                  {loading ? '—' : s.value}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {/* ── Main Panel ── */}
        <Card>
          {/* Tab Bar */}
          <div className="flex overflow-x-auto border-b border-white/5 px-2 no-scrollbar">
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3.5 border-none bg-transparent cursor-pointer relative transition-all duration-150 whitespace-nowrap ${
                    active ? 'text-primary-cyan font-bold border-b-2 border-b-primary-cyan' : 'text-gray-500 font-medium border-b-2 border-b-transparent hover:text-gray-300'
                  } text-[13px]`}
                >
                  <tab.icon size={15} />
                  {tab.label}
                  {(tab as any).badge > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold leading-none ${
                        (tab as any).highlight ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400'
                    }`}>
                      {(tab as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-8">

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent clients */}
                <div>
                  <h3 className="text-sm font-bold text-white m-0 mb-4">Latest Requests</h3>
                  <div className="flex flex-col gap-2.5">
                    {clients.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/5 border border-white/5">
                        <div>
                          <p className="m-0 text-[13px] font-semibold text-white">{c.full_name}</p>
                          <p className="m-0 text-[11px] text-gray-500">{c.company} · {c.plan}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                    {clients.length === 0 && <p className="text-gray-600 text-[13px] text-center py-6">No requests yet.</p>}
                  </div>
                </div>

                {/* Recent users */}
                <div>
                  <h3 className="text-sm font-bold text-white m-0 mb-4">Active Operators</h3>
                  <div className="flex flex-col gap-2.5">
                    {users.slice(0, 5).map(u => (
                      <div key={u.id} className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${u.is_active ? 'bg-primary-cyan/15' : 'bg-gray-500/15'}`}>
                            <Users size={14} className={u.is_active ? 'text-primary-cyan' : 'text-gray-500'} />
                          </div>
                          <div>
                            <p className="m-0 text-[13px] font-semibold text-white">{u.email.split('@')[0]}</p>
                            <p className="m-0 text-[11px] text-gray-500">{u.plan || 'standard'}</p>
                          </div>
                        </div>
                        <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-gray-600 text-[13px] text-center py-6">No operators yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS TAB ── */}
            {activeTab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="m-0 text-lg font-extrabold text-white">Operator Nodes</h2>
                    <p className="m-0 mt-1 text-xs text-gray-500">Manage mesh operator accounts and access tiers.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus size={15} /> Add Operator
                  </Button>
                </div>

                {/* Add form */}
                {showAddForm && (
                  <Card className="p-6 mb-6 border-primary-cyan/30 bg-primary-cyan/5">
                    <form onSubmit={handleCreateUser}>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold">Email</label>
                          <Input type="email" required placeholder="operator@mesh.intel" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold">Password</label>
                          <Input type="password" required placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-[11px] text-gray-500 mb-1.5 font-semibold">Plan</label>
                          <select 
                            className="w-full bg-white/5 border border-white/10 rounded-xl text-sm text-white px-4 py-3.5 outline-none focus:border-primary-cyan/50" 
                            value={newUser.plan} onChange={e => setNewUser({ ...newUser, plan: e.target.value })}
                          >
                            <option value="pro" className="bg-gray-900">Professional</option>
                            <option value="enterprise" className="bg-gray-900">Enterprise</option>
                          </select>
                        </div>
                        <Button type="submit" className="h-[46px]">Deploy</Button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* User list */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {users.map(user => (
                    <Card key={user.id} className="px-5 py-4.5 flex items-center justify-between border-white/5 bg-white/5">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${user.is_active ? 'bg-primary-cyan/10' : 'bg-gray-500/10'}`}>
                          <Users size={18} className={user.is_active ? 'text-primary-cyan' : 'text-gray-500'} />
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="m-0 text-[13px] font-semibold text-white truncate max-w-[160px]">{user.email}</p>
                          <p className="m-0 text-[11px] text-gray-500 mt-0.5">{user.plan || 'standard'} · {user.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleAction(`/admin/update-user/${user.id}`, 'put', { is_active: !user.is_active })}
                          title={user.is_active ? 'Deactivate' : 'Activate'}
                          className={`w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors ${
                            user.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500'
                          }`}
                        >
                          <Activity size={14} />
                        </button>
                        <button
                          onClick={() => handleAction(`/admin/delete-user/${user.id}`, 'delete')}
                          title="Delete"
                          className="w-8 h-8 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Card>
                  ))}
                  {users.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-gray-600">
                      <Globe size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="m-0 text-[13px]">No operators provisioned yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CLIENTS TAB ── */}
            {activeTab === 'clients' && (
              <div>
                <div className="mb-6">
                  <h2 className="m-0 text-lg font-extrabold text-white">Access Requests</h2>
                  <p className="m-0 mt-1 text-xs text-gray-500">Review and approve enterprise access applications.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clients.map(client => (
                    <Card key={client.id} className="p-5.5 flex flex-col gap-4 border-white/5 bg-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="m-0 text-[15px] font-bold text-white">{client.full_name}</p>
                          <p className="m-0 mt-1 text-xs text-gray-500">{client.company}</p>
                        </div>
                        <StatusBadge status={client.status} />
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <span className="text-[11px] text-primary-cyan bg-primary-cyan/10 px-2.5 py-0.5 rounded-md font-semibold">{client.plan}</span>
                        <span className="text-[11px] text-gray-500 bg-white/5 px-2.5 py-0.5 rounded-md">{client.email}</span>
                      </div>

                      {client.status === 'pending' && (
                        <div className="flex gap-2 mt-1 -mb-1">
                          <button
                            onClick={() => handleAction(`/admin/clients/${client.id}/approve`, 'put')}
                            className="flex-1 py-2.5 rounded-lg border-none cursor-pointer bg-emerald-500/10 text-emerald-500 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-500/20 transition-colors"
                          >
                            <CheckCircle2 size={14} /> Approve
                          </button>
                          <button
                            onClick={() => handleAction(`/admin/clients/${client.id}/reject`, 'put')}
                            className="flex-1 py-2.5 rounded-lg border-none cursor-pointer bg-red-500/10 text-red-500 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors"
                          >
                            <XCircle size={14} /> Decline
                          </button>
                        </div>
                      )}
                    </Card>
                  ))}
                  {clients.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-gray-600">
                      <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="m-0 text-[13px]">No pending requests.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CHANNELS TAB ── */}
            {activeTab === 'channels' && (
              <div>
                <div className="mb-6">
                  <h2 className="m-0 text-lg font-extrabold text-white">Mesh Channels</h2>
                  <p className="m-0 mt-1 text-xs text-gray-500">Real-time status of P2P encrypted channels.</p>
                </div>

                <div className="rounded-xl overflow-hidden border border-white/5 border-b-transparent">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                          {['Initiator', 'Receiver', 'Status', 'Created', 'Action'].map(h => (
                            <th key={h} className="px-4.5 py-3 text-left text-[11px] text-gray-500 font-bold uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {channels.map(ch => (
                          <tr key={ch.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4.5 py-3.5 text-white font-semibold">{ch.sender}</td>
                            <td className="px-4.5 py-3.5 text-gray-400">{ch.receiver}</td>
                            <td className="px-4.5 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${ch.is_active ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                                <span className={`text-[12px] font-semibold ${ch.is_active ? 'text-emerald-500' : 'text-gray-500'}`}>{ch.is_active ? 'Live' : 'Offline'}</span>
                              </div>
                            </td>
                            <td className="px-4.5 py-3.5 text-gray-500 text-[12px]">{ch.created_at?.slice(0, 10)}</td>
                            <td className="px-4.5 py-3.5">
                              <button
                                onClick={() => handleAction(`/admin/channels/${ch.id}`, 'delete')}
                                className="px-3 py-1.5 rounded-lg border-none cursor-pointer bg-red-500/10 text-red-500 text-xs font-semibold flex items-center gap-1.5 hover:bg-red-500/20 transition-colors"
                              >
                                <Trash2 size={13} /> Terminate
                              </button>
                            </td>
                          </tr>
                        ))}
                        {channels.length === 0 && (
                          <tr><td colSpan={5} className="text-center py-10 text-gray-600 text-[13px] border-b border-white/5">No channels found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div className="max-w-[700px]">
                <div className="mb-7">
                  <h2 className="m-0 text-lg font-extrabold text-white">System Configuration</h2>
                  <p className="m-0 mt-1 text-xs text-gray-500">Control global collective parameters and platform behavior.</p>
                </div>

                {/* Toggles */}
                <Card className="p-6 mb-5 border-white/5 bg-white/5">
                  <h3 className="m-0 mb-5 text-[14px] font-bold text-gray-400 uppercase tracking-widest">Feature Flags</h3>
                  <div className="flex flex-col gap-4">
                    {[
                      { key: 'registration_enabled', label: 'Public Registration', desc: 'Allow new organizations to submit access requests.' },
                      { key: 'auto_channel_approval', label: 'Auto Channel Approval', desc: 'Automatically approve new mesh handshakes.' },
                      { key: 'quantum_key_generation_enabled', label: 'Quantum Key Generation', desc: 'Enable hardware-backed quantum entropy integration.' },
                    ].map(s => (
                      <div key={s.key} className="flex items-center justify-between px-4.5 py-3.5 rounded-xl bg-white/5 border border-white/5 transition-all hover:border-white/10">
                        <div>
                          <p className="m-0 text-[14px] font-semibold text-white">{s.label}</p>
                          <p className="m-0 text-[12px] text-gray-500 mt-1">{s.desc}</p>
                        </div>
                        <button
                          onClick={() => handleAction('/admin/settings', 'put', { [s.key]: !sysSettings[s.key] })}
                          className="bg-transparent border-none cursor-pointer shrink-0"
                        >
                          {sysSettings[s.key]
                            ? <ToggleRight size={32} className="text-primary-cyan" />
                            : <ToggleLeft size={32} className="text-gray-600" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Limits */}
                <Card className="p-6 border-primary-cyan/20 bg-primary-cyan/5">
                  <h3 className="m-0 mb-5 text-[14px] font-bold text-gray-400 uppercase tracking-widest">System Limits</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-2 font-semibold">Default Channel Quota</label>
                      <Input type="number" 
                        value={sysSettings.default_channels_limit || 0}
                        onChange={e => setSysSettings({ ...sysSettings, default_channels_limit: +e.target.value })} 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-2 font-semibold">Encryption Entropy Floor</label>
                      <Input type="number" 
                        value={sysSettings.default_encryption_limit || 0}
                        onChange={e => setSysSettings({ ...sysSettings, default_encryption_limit: +e.target.value })} 
                      />
                    </div>
                  </div>
                  <Button onClick={() => handleAction('/admin/settings', 'put', sysSettings)} className="w-full justify-center">
                    <Zap size={15} /> Save Configuration
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-[11px] text-gray-700 mt-8 mb-4 font-medium">
          QEKMS Control Center · Restricted Access · All actions are audit-logged
        </p>
      </div>
    </div>
  );
}
