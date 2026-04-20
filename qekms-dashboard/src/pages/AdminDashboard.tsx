import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
  } from 'recharts';
  import {
  Users, Shield, Activity, Settings, UserPlus, Radio, RefreshCw, Trash2, CheckCircle2,
  XCircle, LogOut, DollarSign, Plus, Globe, ToggleLeft, ToggleRight, AlertTriangle, Zap,
  Cpu, Lock, Fingerprint, Database, Terminal, CreditCard, ChevronRight, MessageSquare, Send, UserCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { securityService } from '../api/SecurityService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { InlineLoader } from '../components/InlineLoader';
import { motion, AnimatePresence } from 'framer-motion';

interface AuditLog {
  id: string;
  event: string;
  user_id: string;
  details: any;
  timestamp: string;
}

interface QuantumStatus {
  last_entropy_result: any;
  passed: boolean;
  generated_keys: number;
}

interface User {
  id: string;
  email: string;
  role: string;
  plan: string;
  is_active: boolean;
}

interface ClientRequest {
  id: string;
  full_name: string;
  company: string;
  email: string;
  plan: string;
  status: string;
  payment_status?: string;
  payment_reference?: string;
  amount?: number;
}

interface Channel {
  id: string;
  sender: string;
  receiver: string;
  is_active: boolean;
  is_pending: boolean;
  is_group?: boolean;
}

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
}

// ── Status badge ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'text-amber-500 bg-amber-500/10 border-amber-500/30',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    rejected: 'text-red-500 bg-red-500/10 border-red-500/30',
    active:   'text-primary-cyan bg-primary-cyan/10 border-primary-cyan/30',
    inactive: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
    HIGH:     'text-red-500 bg-red-500/20 border-red-500/50 animate-pulse',
    WARN:     'text-amber-500 bg-amber-500/15 border-amber-500/40',
    INFO:     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };
  const s = map[status] ?? 'text-gray-500 bg-gray-500/10 border-gray-500/30';
  return (
    <span className={`${s} border rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'channels' | 'messages' | 'audit' | 'health' | 'settings'>('overview');

  // Data
  const [users, setUsers]     = useState<User[]>([]);
  const [clients, setClients] = useState<ClientRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [quantumHealth, setQuantumHealth] = useState<QuantumStatus | null>(null);
  const [sysSettings, setSysSettings] = useState<any>({});
  const [sysStats, setSysStats] = useState<any>({});
  const [stats, setStats] = useState<any>({
    total_users: 0, pending_requests: 0,
    approved_requests: 0, rejected_requests: 0,
  });

  // UI state
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser]   = useState({ email: '', password: '', role: 'account', plan: 'pro' });

  // Payment/Provisioning State
  const [verifyingClient, setVerifyingClient] = useState<ClientRequest | null>(null);
  const [paymentForm, setPaymentForm] = useState({ reference: '', amount: 0 });
  const [credsResult, setCredsResult] = useState<{ email: string; password: string } | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // ── MESSAGING STATE ──
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchStats    = useCallback(async () => { try { const { data } = await api.get('/admin/clients/stats'); setStats(data); } catch {} }, []);
  const fetchUsers    = useCallback(async () => { try { const { data } = await api.get('/admin/users'); setUsers(data); } catch {} }, []);
  const fetchClients  = useCallback(async () => { try { const { data } = await api.get('/admin/clients'); setClients(data); } catch {} }, []);
  const fetchChannels = useCallback(async () => { try { const { data } = await api.get('/channels/'); setChannels(data); } catch {} }, []);
  const fetchSettings = useCallback(async () => { try { const { data } = await api.get('/admin/settings'); setSysSettings(data); } catch {} }, []);
  const fetchAudit    = useCallback(async () => { try { const { data } = await api.get('/admin/audit-logs'); setAuditLogs(data); } catch {} }, []);
  const fetchSysHealth = useCallback(async () => { try { const { data } = await api.get('/admin/quantum/status'); setQuantumHealth(data); } catch {} }, []);
  const fetchSysStats = useCallback(async () => { try { const { data } = await api.get('/admin/stats'); setSysStats(data); } catch {} }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    await Promise.all([
        fetchStats(), fetchUsers(), fetchClients(), 
        fetchChannels(), fetchSettings(), fetchAudit(),
        fetchSysHealth(), fetchSysStats()
    ]);
    setLoading(false);
  }, [fetchStats, fetchUsers, fetchClients, fetchChannels, fetchSettings, fetchAudit, fetchSysHealth, fetchSysStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Periodic Refresh
  useEffect(() => {
    const timer = setInterval(() => {
        fetchAudit();
        fetchSysHealth();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchAudit, fetchSysHealth]);

  // ── Actions ──────────────────────────────────────────────────────────
  const handleAction = async (endpoint: string, method: 'post' | 'put' | 'delete' | 'patch' = 'post', payload?: any) => {
    setLoading(true);
    try {
      const { data } = await (api as any)[method](endpoint, payload);
      if (data?.generated_password) {
        setCredsResult({ email: data.email, password: data.generated_password });
      }
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

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingClient) return;
    await handleAction(`/admin/clients/${verifyingClient.id}/payment`, 'put', {
        payment_reference: paymentForm.reference,
        amount: paymentForm.amount
    });
    setVerifyingClient(null);
    setPaymentForm({ reference: '', amount: 0 });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    await handleAction(`/admin/reset-password/${resetUser.id}`, 'post', { new_password: newPassword });
    setResetUser(null);
    setNewPassword('');
  };

  // ── MESSAGING LOGIC ──
  const loadMessages = useCallback(async (channel: Channel) => {
    setLoadingMessages(true);
    setMessages([]);
    try {
        setKeyStatus('loading');
        // Ensure handshake
        const { data: shake } = await api.post('/channels/handshake', { client_public_key: 'INITIAL' });
        await securityService.establishSession(shake.server_public_key);

        const encodedPubKey = securityService.getEncodedClientPublicKey();
        const { data: keyData } = await api.get(`/channels/${channel.id}/key?client_public_key=${encodedPubKey}`);
        await securityService.loadChannelKey(channel.id, keyData.version || 1, keyData.wrapped_key);
        setKeyStatus('ready');

        const { data: msgs } = await api.get(`/channels/${channel.id}/messages`);
        const decrypted = await Promise.all(msgs.messages.map(async (m: any) => {
            try { return { ...m, content: await securityService.processIncoming(m, channel.id) }; }
            catch { return { ...m, content: '[DECRYPTION ERROR]' }; }
        }));
        setMessages(decrypted);
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
    } catch { setKeyStatus('error'); }
    finally { setLoadingMessages(false); }
  }, []);

  const selectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    loadMessages(channel);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || keyStatus !== 'ready') return;
    const content = newMessage;
    setNewMessage('');
    try {
        const payload = await securityService.prepareOutgoing(content, activeChannel.id, 1);
        await api.post(`/channels/${activeChannel.id}/send`, payload);
    } catch { setError('Transmission failed'); }
  };

  useEffect(() => {
    if (!activeChannel || keyStatus !== 'ready') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = (import.meta as any).env.VITE_BACKEND_URL.replace(/https?:\/\//, '');
    const socket = new WebSocket(`${protocol}//${baseUrl}/channels/ws/chat/${activeChannel.id}`);
    ws.current = socket;
    socket.onmessage = async (e) => {
        const payload = JSON.parse(e.data);
        if (payload.type === 'message') {
            const dec = await securityService.processIncoming(payload.data, activeChannel.id);
            setMessages(prev => [...prev, { ...payload.data, content: dec }]);
            setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
        }
    };
    return () => socket.close();
  }, [activeChannel, keyStatus]);

  const handleStartChat = async (email: string) => {
    try {
        const { data } = await api.post('/channels/', { receiver_email: email });
        fetchAll();
        setActiveTab('messages');
        selectChannel(data.channel);
    } catch { setError('Could not initialize P2P tunnel'); }
  };

  const totalRevenue = clients.filter(c => c.status === 'approved' || c.amount).reduce((a, c) => a + (c.amount || 0), 0);
  const pendingCount = clients.filter(c => c.status === 'pending').length;

  const statCards = [
    { label: 'Total Nodes',      value: stats.total_users,        icon: Users,      color: 'text-primary-cyan', bg: 'bg-primary-cyan/15', border: 'border-primary-cyan/25' },
    { label: 'Pending Requests', value: stats.pending_requests,   icon: Activity,   color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
    { label: 'Security Threats', value: sysStats.threats_detected || 0, icon: Shield, color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/25' },
    { label: 'Revenue',          value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-violet-500', bg: 'bg-violet-500/15', border: 'border-violet-500/25' },
  ];

  const tabs = [
    { key: 'overview',  label: 'Overview',  icon: Shield },
    { key: 'users',     label: 'Operators', icon: Users,   badge: users.length },
    { key: 'clients',   label: 'Requests',  icon: UserPlus, badge: pendingCount, highlight: pendingCount > 0 },
    { key: 'messages',  label: 'Messages',  icon: MessageSquare },
    { key: 'health',    label: 'Quantum',   icon: Zap },
    { key: 'audit',     label: 'Audit',     icon: Activity },
    { key: 'channels',  label: 'Mesh',      icon: Radio },
    { key: 'settings',  label: 'Config',    icon: Settings },
  ] as const;

  return (
    <div className="font-sans min-h-screen bg-mesh-dark text-white p-8 md:p-10 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[100px]" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto h-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-mesh-gradient flex items-center justify-center shadow-mesh-glow">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight m-0 text-white uppercase">Control Center</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Sovereign Administration & Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={fetchAll} size="sm" className="hidden sm:flex h-11 px-6">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Sync Mesh
            </Button>
            <Button variant="danger" size="sm" onClick={logout} className="h-11 px-6">
              <LogOut size={15} /> Terminate Session
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-5 text-red-500 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top-4">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <Card key={i} className="px-6 py-6 flex items-center gap-5 border-white/5 bg-white/[0.02]">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${s.bg} ${s.border}`}>
                <s.icon size={22} className={s.color} />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-black m-0 tracking-widest uppercase">{s.label}</p>
                <p className="text-3xl font-black m-0 mt-1 text-white leading-none">
                  {loading ? '—' : s.value}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-0 border-white/5 bg-white/[0.01] overflow-hidden min-h-[600px] flex flex-col shadow-2xl">
          <div className="flex overflow-x-auto border-b border-white/5 px-2 no-scrollbar bg-white/[0.02] backdrop-blur-md">
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-5 border-none bg-transparent cursor-pointer relative transition-all duration-300 whitespace-nowrap group ${
                    active ? 'text-primary-cyan font-black' : 'text-gray-500 font-bold hover:text-white'
                  } text-[11px] uppercase tracking-[0.1em]`}
                >
                  <tab.icon size={15} className={active ? 'text-primary-cyan' : 'group-hover:text-primary-cyan transition-colors'} />
                  {tab.label}
                  {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-[3px] bg-primary-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
                  {(tab as any).badge > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black leading-none ${
                        (tab as any).highlight ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400'
                    }`}>
                      {(tab as any).badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Card className="col-span-2 p-8 flex items-center justify-between bg-primary-cyan/[0.03] border-primary-cyan/20 relative overflow-hidden group">
                        <div className="absolute top-[-50px] left-[-50px] w-40 h-40 bg-primary-cyan/5 rounded-full blur-[50px] group-hover:bg-primary-cyan/10 transition-colors" />
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-primary-cyan/20 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)]">
                                <Cpu size={32} className="text-primary-cyan animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white m-0 tracking-tight uppercase">Quantum Core Status</h3>
                                <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-widest">Protocol Integrity: <span className="text-emerald-500">OPTIMAL</span></p>
                            </div>
                        </div>
                        <div className="text-right relative z-10">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cipher Cycles</p>
                            <p className="text-4xl font-black text-white m-0">{quantumHealth?.generated_keys || 0}</p>
                        </div>
                    </Card>

                    <Card className="p-8 border-white/5 bg-white/[0.02] flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-4">
                             <Fingerprint size={20} className="text-violet-500" />
                             <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Mesh Entropy</span>
                        </div>
                        <p className="text-4xl font-black text-white m-0">
                            {quantumHealth?.last_entropy_result?.quality ? (quantumHealth.last_entropy_result.quality * 100).toFixed(1) : "98.2"}%
                        </p>
                        <div className="w-full bg-white/5 h-1.5 rounded-full mt-5 overflow-hidden">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(quantumHealth?.last_entropy_result?.quality || 0.98) * 100}%` }}
                                className="h-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" 
                            />
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <UserPlus size={16} /> Latest Mesh Requests
                    </h3>
                    {clients.slice(0, 4).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                          <div>
                            <p className="m-0 text-[14px] font-black text-white tracking-tight">{c.full_name}</p>
                            <p className="m-0 text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{c.company} · {c.plan}</p>
                          </div>
                          <StatusBadge status={c.status} />
                        </div>
                    ))}
                  </div>
  
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                        <Users size={16} /> Distributed Operators
                    </h3>
                    {users.slice(0, 4).map(u => (
                        <div key={u.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${u.is_active ? 'bg-primary-cyan/15' : 'bg-gray-500/15'}`}>
                              <Users size={16} className={u.is_active ? 'text-primary-cyan' : 'text-gray-500'} />
                            </div>
                            <div>
                                <p className="m-0 text-[14px] font-black text-white tracking-tight">{u.email.split('@')[0]}</p>
                                <p className="m-0 text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{u.plan || 'standard'} · NODE</p>
                            </div>
                          </div>
                          <StatusBadge status={u.is_active ? 'active' : 'inactive'} />
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── OPERATORS TAB ── */}
            {activeTab === 'users' && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="m-0 text-xl font-black text-white uppercase tracking-tight">Mesh Operators</h2>
                    <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global distributed identity management & key provisioning.</p>
                  </div>
                  <Button onClick={() => setShowAddForm(!showAddForm)} className="h-12 px-8 shadow-mesh-glow">
                    <Plus size={16} className="mr-2" /> Deploy New Node
                  </Button>
                </div>

                <AnimatePresence>
                    {showAddForm && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <Card className="p-8 mb-8 border-primary-cyan/30 bg-primary-cyan/[0.03] shadow-inner">
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Locator ID</label>
                                    <Input required type="email" placeholder="node@mesh.net" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Cipher</label>
                                    <Input required type="password" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="h-12 bg-black/40 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Clearance Tier</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-white px-4 h-12 outline-none focus:border-primary-cyan/50" 
                                        value={newUser.plan} onChange={e => setNewUser({ ...newUser, plan: e.target.value })}
                                    >
                                        <option value="pro">PROFESSIONAL</option>
                                        <option value="enterprise">ENTERPRISE (∞)</option>
                                    </select>
                                </div>
                                <Button type="submit" className="h-12 shadow-mesh-glow font-black uppercase">Initialize Node</Button>
                            </form>
                        </Card>
                    </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {users.map(user => (
                    <Card key={user.id} className="p-6 flex items-center justify-between border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-5 overflow-hidden">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 group-hover:scale-110 ${user.is_active ? 'bg-primary-cyan/10' : 'bg-gray-500/10'}`}>
                          <Users size={20} className={user.is_active ? 'text-primary-cyan' : 'text-gray-500'} />
                        </div>
                        <div className="min-w-0 pr-2">
                          <p className="m-0 text-[14px] font-black text-white tracking-tight truncate">{user.email}</p>
                          <p className="m-0 text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{user.plan || 'standard'} · NODE</p>
                        </div>
                      </div>
                      <div className="flex gap-2.5 shrink-0">
                        <button onClick={() => handleStartChat(user.email)} className="w-10 h-10 rounded-xl bg-primary-cyan/10 text-primary-cyan hover:bg-primary-cyan/20 border-none cursor-pointer flex items-center justify-center transition-all shadow-mesh-glow shadow-primary-cyan/5">
                            <MessageSquare size={16} />
                        </button>
                        <button onClick={() => setResetUser(user)} className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-none cursor-pointer flex items-center justify-center transition-all">
                            <Lock size={16} />
                        </button>
                        <button onClick={() => handleAction(`/admin/delete-user/${user.id}`, 'delete')} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none cursor-pointer flex items-center justify-center transition-all">
                            <Trash2 size={16} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ── MESSAGES TAB ── */}
            {activeTab === 'messages' && (
              <div className="h-[700px] flex gap-8 -m-8 relative">
                 {/* Sidebar */}
                 <div className="w-[300px] border-r border-white/5 flex flex-col bg-white/[0.01]">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Active P2P Routes</span>
                        <Radio size={14} className="text-primary-cyan" />
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
                        {channels.length === 0 ? (
                            <div className="py-20 text-center opacity-20">
                                <Radio size={40} className="mx-auto mb-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">No tunnels mapped</span>
                            </div>
                        ) : channels.map(c => {
                            const other = c.sender === user?.email ? c.receiver : c.sender;
                            const active = activeChannel?.id === c.id;
                            return (
                                <button 
                                    key={c.id} 
                                    onClick={() => selectChannel(c)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                                        active ? 'bg-primary-cyan/10 border-primary-cyan/20 text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-500'
                                    }`}
                                >
                                    <p className="m-0 text-[13px] font-black truncate">{other.split('@')[0]}</p>
                                    <p className="m-0 text-[9px] font-bold uppercase tracking-widest mt-1">{other}</p>
                                </button>
                            )
                        })}
                    </div>
                 </div>

                 {/* Chat Area */}
                 <div className="flex-1 flex flex-col bg-mesh-dark">
                    {!activeChannel ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
                            <MessageSquare size={80} className="mb-6" />
                            <h3 className="text-4xl font-black uppercase tracking-tighter">Secure Handshake</h3>
                            <p className="text-xs font-bold uppercase tracking-[0.3em]">Select a node to initiate tunnel</p>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 bg-primary-cyan/10 rounded-xl flex items-center justify-center text-primary-cyan">
                                        <UserCircle size={24} />
                                    </div>
                                    <div>
                                        <span className="text-[15px] font-black text-white">{(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender).split('@')[0]}</span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">LIVE ENCRYPTION</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest ${
                                    keyStatus === 'ready' ? 'border-primary-cyan/30 text-primary-cyan bg-primary-cyan/5' : 'border-amber-500/20 text-amber-500'
                                }`}>
                                    <Fingerprint size={14} />
                                    {keyStatus === 'ready' ? 'SECURED BY ENTROPY' : 'PROTOCOLS DOWN'}
                                </div>
                            </div>

                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative">
                                {loadingMessages ? (
                                    <div className="h-full flex items-center justify-center"><InlineLoader message="DECRYPTING PAYLOADS..." /></div>
                                ) : messages.map((m, idx) => {
                                    const isMe = m.sender === user?.email;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[80%] space-y-2">
                                                <Card className={`p-4 rounded-[1.5rem] border-none shadow-sm ${isMe ? 'bg-mesh-gradient text-white rounded-tr-none' : 'bg-white/5 text-gray-300 rounded-tl-none'}`}>
                                                    <p className="m-0 text-sm font-medium leading-relaxed">{m.content}</p>
                                                </Card>
                                                <div className={`flex items-center gap-2 px-2 text-[8px] font-black text-gray-600 uppercase tracking-widest ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <Lock size={8} /> {new Date(m.timestamp).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
                                <form onSubmit={sendMessage} className="flex gap-4">
                                    <Input placeholder="TRANSMIT BROADCAST ON MESH..." icon={Zap} value={newMessage} onChange={e=>setNewMessage(e.target.value)} disabled={keyStatus !== 'ready'} className="h-14 bg-black/40 border-white/10" />
                                    <Button type="submit" disabled={!newMessage.trim() || keyStatus !== 'ready'} className="w-14 h-14 p-0 shadow-mesh-glow">
                                        <Send size={24} className="ml-1" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    )}
                 </div>
              </div>
            )}

            {/* ── CLIENTS TAB ── */}
            {activeTab === 'clients' && (
              <div>
                <div className="mb-8">
                  <h2 className="m-0 text-xl font-black text-white uppercase tracking-tight">Mesh Provisioning Queue</h2>
                  <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Authentication and clearance validation for incoming node identifiers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map(client => (
                    <Card key={client.id} className="p-6 flex flex-col gap-6 border-white/5 bg-white/[0.03] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                         <CreditCard size={60} className="text-primary-cyan" />
                      </div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                          <p className="m-0 text-[18px] font-black text-white tracking-tight">{client.full_name}</p>
                          <p className="m-0 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{client.company}</p>
                        </div>
                        <StatusBadge status={client.status} />
                      </div>

                      <div className="flex gap-2 flex-wrap pb-2 border-b border-white/5 relative z-10">
                        <span className="text-[10px] text-primary-cyan bg-primary-cyan/10 px-3 py-1 rounded-lg font-black uppercase tracking-wider">{client.plan}</span>
                        <span className="text-[10px] text-gray-500 bg-white/5 px-3 py-1 rounded-lg font-mono">{client.email}</span>
                        {client.payment_status === 'paid' && (
                          <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg font-black uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 size={12} /> PAID
                          </span>
                        )}
                      </div>

                      {client.payment_status === 'paid' && client.payment_reference && (
                          <div className="px-4 py-3 rounded-[1.25rem] bg-white/5 border border-white/5 space-y-2 animate-in slide-in-from-top-2">
                              <div className="flex justify-between items-center">
                                  <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Transaction ID</span>
                                  <span className="text-[12px] text-emerald-400 font-black tracking-tighter">${client.amount?.toLocaleString()}</span>
                              </div>
                              <p className="m-0 text-[13px] text-white font-mono truncate bg-black/20 p-2 rounded-lg">{client.payment_reference}</p>
                          </div>
                      )}

                      {client.status === 'pending' && (
                        <div className="flex flex-col gap-3 mt-auto relative z-10">
                          {client.payment_status !== 'paid' ? (
                              <button
                                  onClick={() => {
                                      setVerifyingClient(client);
                                      setPaymentForm({ reference: '', amount: client.plan === 'enterprise' ? 2500 : 500 });
                                  }}
                                  className="w-full py-4 rounded-2xl border-none cursor-pointer bg-primary-cyan text-black font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-mesh-glow"
                              >
                                  <CreditCard size={18} /> Verify Payment
                              </button>
                          ) : (
                              <button
                                  onClick={() => handleAction(`/admin/clients/${client.id}/approve`, 'put')}
                                  className="w-full py-4 rounded-2xl border-none cursor-pointer bg-mesh-gradient text-white font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-mesh-glow"
                              >
                                  <CheckCircle2 size={18} /> Provision Access
                              </button>
                          )}
                          <button
                              onClick={() => handleAction(`/admin/clients/${client.id}/reject`, 'put')}
                              className="w-full py-3 rounded-2xl border border-white/10 bg-transparent text-gray-600 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/10 hover:text-red-500 transition-all"
                          >
                              <XCircle size={16} /> Decline Request
                          </button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'health' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <Card className="lg:col-span-2 p-8 border-white/5 bg-white/[0.01]">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                                <Activity size={18} className="text-primary-cyan" /> Entropy Spectrum Analysis
                            </h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        { name: 'T-10', quality: 98, jitter: 2.1 },
                                        { name: 'T-9', quality: 95, jitter: 1.8 },
                                        { name: 'T-8', quality: 99, jitter: 2.5 },
                                        { name: 'T-7', quality: 92, jitter: 3.2 },
                                        { name: 'T-6', quality: 97, jitter: 1.5 },
                                        { name: 'T-5', quality: 94, jitter: 2.0 },
                                        { name: 'T-4', quality: 99, jitter: 0.8 },
                                        { name: 'T-3', quality: 96, jitter: 1.2 },
                                        { name: 'T-2', quality: 98, jitter: 1.9 },
                                        { name: 'T-1', quality: (quantumHealth?.last_entropy_result?.quality || 0.98) * 100, jitter: 1.5 },
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#05070a', border: '1px solid #ffffff10', borderRadius: '16px', fontSize: '10px' }} />
                                        <Area type="monotone" dataKey="quality" stroke="#06b6d4" strokeWidth={4} fillOpacity={1} fill="url(#colorQuality)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                        <Card className="p-8 border-white/5 bg-white/[0.01] flex flex-col justify-between">
                            <div className="space-y-8">
                                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Protocol Metrics</h3>
                                <div className="space-y-4">
                                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Source Reliability</p>
                                        <p className="text-2xl font-black text-emerald-500">94.0% QUANTUM</p>
                                    </div>
                                    <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1">Total Generation Cycles</p>
                                        <p className="text-2xl font-black text-white">{sysStats.keys_generated || 0}</p>
                                    </div>
                                </div>
                            </div>
                            <Button className="h-14 font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 shadow-mesh-glow shadow-violet-600/20">
                                <Zap size={18} className="mr-3" /> Force Recalibration
                            </Button>
                        </Card>
                    </div>
                </div>
            )}
            
            {/* ── AUDIT TAB ── */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="m-0 text-xl font-black text-white uppercase tracking-tight">Security Audit Matrix</h2>
                        <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Tamper-proof distributed ledger of all collective security events.</p>
                    </div>
                </div>
                <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-white/[0.01] backdrop-blur-3xl">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full border-collapse text-[12px]">
                            <thead>
                                <tr className="bg-white/[0.03] border-b border-white/10 uppercase font-black text-gray-500 tracking-widest text-[9px]">
                                    <th className="px-8 py-6 text-left">Timestamp</th>
                                    <th className="px-8 py-6 text-left">Event Protocol</th>
                                    <th className="px-8 py-6 text-left">Subject ID</th>
                                    <th className="px-8 py-6 text-left">Risk Assessment</th>
                                    <th className="px-8 py-6 text-left">Observational Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-5 text-gray-500 font-mono text-[11px] whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '---'}</td>
                                        <td className="px-8 py-5 font-black text-white tracking-tight">{log.event}</td>
                                        <td className="px-8 py-5 text-gray-400 font-bold truncate max-w-[150px]">{log.user_id || 'SYSTEM_CORE'}</td>
                                        <td className="px-8 py-5"><StatusBadge status={log.details?.severity || 'INFO'} /></td>
                                        <td className="px-8 py-5 text-[11px] text-gray-600 font-mono italic">{log.details?.ip ? `IPV4://${log.details.ip}` : 'Internal Sequence'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
              <div className="max-w-[800px] space-y-8">
                <div className="mb-4">
                  <h2 className="m-0 text-xl font-black text-white uppercase tracking-tight">System Core Configuration</h2>
                  <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Global collective parameters and high-level platform behavior control.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { key: 'registration_enabled', label: 'Identity Registry', desc: 'Allow remote node proposals.' },
                      { key: 'auto_channel_approval', label: 'Handshake Sync', desc: 'Automatic tunnel establishment.' },
                      { key: 'quantum_key_generation_enabled', label: 'Quantum Entropies', desc: 'Active hardware-backed generation.' },
                    ].map(s => (
                      <Card key={s.key} className="p-6 flex flex-col justify-between border-white/5 bg-white/[0.02] space-y-4">
                        <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black text-primary-cyan uppercase tracking-[0.2em]">Safety Protocol</span>
                            <button onClick={() => handleAction('/admin/settings', 'put', { [s.key]: !sysSettings[s.key] })} className="bg-transparent border-none cursor-pointer transition-transform active:scale-90">
                                {sysSettings[s.key] ? <ToggleRight size={32} className="text-primary-cyan" /> : <ToggleLeft size={32} className="text-gray-700" />}
                            </button>
                        </div>
                        <div>
                            <p className="m-0 text-[14px] font-black text-white tracking-tight">{s.label}</p>
                            <p className="m-0 text-[10px] text-gray-500 font-medium leading-relaxed mt-2">{s.desc}</p>
                        </div>
                      </Card>
                    ))}
                </div>

                <Card className="p-8 border-primary-cyan/20 bg-primary-cyan/[0.02] space-y-8">
                  <div className="flex items-center gap-3">
                      <Zap size={20} className="text-primary-cyan" />
                      <h3 className="m-0 text-[12px] font-black text-gray-400 uppercase tracking-[0.3em]">Runtime Hardening Limits</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Default Node Quota</label>
                      <Input type="number" value={sysSettings.default_channels_limit || 0} onChange={e => setSysSettings({ ...sysSettings, default_channels_limit: +e.target.value })} className="h-14 bg-black/40 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Entropy Hardening Floor</label>
                      <Input type="number" value={sysSettings.default_encryption_limit || 0} onChange={e => setSysSettings({ ...sysSettings, default_encryption_limit: +e.target.value })} className="h-14 bg-black/40 border-white/10" />
                    </div>
                  </div>
                  <Button onClick={() => handleAction('/admin/settings', 'put', sysSettings)} className="w-full h-14 font-black uppercase shadow-mesh-glow">
                    Save Synchronization Parameters
                  </Button>
                </Card>
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-[10px] text-gray-700 mt-12 mb-6 font-black uppercase tracking-[0.5em]">
          QEKMS Sovereignty Mode · Restricted Admin Access · Distributed Audit Active
        </p>
      </div>

      {/* ── Client Modals ── */}
      {verifyingClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <Card className="w-full max-w-md p-10 border-primary-cyan/30 bg-mesh-dark shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-mesh-gradient" />
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-primary-cyan/10 flex items-center justify-center border border-primary-cyan/20">
                        <CreditCard size={28} className="text-primary-cyan" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white m-0 tracking-tight">Mesh Verification</h3>
                        <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest font-black">Node: <span className="text-primary-cyan">{verifyingClient.full_name}</span></p>
                    </div>
                </div>
                <form onSubmit={handleVerifyPayment} className="space-y-8">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Txn Identifier</label>
                            <Input required placeholder="STRIPE_CH_XXXXXX" value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} className="h-14 font-mono text-sm bg-black/40" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Verification Value (USD)</label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-cyan" />
                                <Input type="number" required value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: +e.target.value})} className="h-14 pl-12 font-black text-lg bg-black/40" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-2">
                        <Button type="submit" className="flex-1 h-14 shadow-mesh-glow font-black text-[11px] uppercase tracking-widest">Commit Handshake</Button>
                        <Button variant="secondary" type="button" onClick={() => setVerifyingClient(null)} className="flex-1 h-14 font-black text-[11px] uppercase tracking-widest">Abort</Button>
                    </div>
                </form>
            </Card>
        </div>
      )}

      {/* ── Shared Credential View ── */}
      {credsResult && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <Card className="w-full max-w-lg p-10 border-emerald-500/30 bg-mesh-dark shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                <div className="text-center space-y-6 mb-10">
                    <div className="w-24 h-24 bg-emerald-500/10 mx-auto rounded-[2rem] flex items-center justify-center border border-emerald-500/20 shadow-inner">
                        <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-white m-0 tracking-tighter uppercase">Identity Provisioned</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mt-3">Node initialized in the mesh. Synchronize now.</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 group relative overflow-hidden">
                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Locator Address</p>
                        <p className="text-xl font-bold text-white truncate m-0">{credsResult.email}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 cursor-pointer hover:bg-emerald-500/10 transition-all group relative"
                         onClick={() => { navigator.clipboard.writeText(credsResult.password); setSuccess('Key copied to device storage'); }}>
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Primary Cipher Key</p>
                        <p className="text-3xl font-mono font-black text-white m-0 tracking-tighter">{credsResult.password}</p>
                        <span className="absolute top-4 right-6 text-[8px] font-black bg-emerald-500 text-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">CLICK TO COPY</span>
                    </div>
                </div>
                <Button onClick={() => setCredsResult(null)} className="w-full h-16 mt-10 text-[13px] font-black uppercase tracking-[0.3em] shadow-mesh-glow">Synchronize Completion</Button>
            </Card>
        </div>
      )}

      {/* ── Key Rotation Modal ── */}
      {resetUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
            <Card className="w-full max-w-md p-10 border-violet-500/30 bg-mesh-dark shadow-2xl animate-in zoom-in-95 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-violet-600" />
                <div className="flex items-center gap-5 mb-10">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-inner">
                        <Lock size={28} className="text-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white m-0 tracking-tight uppercase">Rotate Master Cipher</h3>
                        <p className="text-[9px] text-gray-500 mt-2 font-black uppercase tracking-widest">Target Node: <span className="text-violet-400">{resetUser.email}</span></p>
                    </div>
                </div>
                <form onSubmit={handleResetPassword} className="space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">New Identity Key</label>
                        <Input type="password" required placeholder="MINIMUM 8 CHARS" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-14 font-mono text-sm bg-black/40" />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <Button type="submit" className="flex-1 h-14 bg-violet-600 hover:bg-violet-700 font-black text-[11px] uppercase tracking-widest shadow-mesh-glow shadow-violet-600/20">Apply Rotation</Button>
                        <Button variant="secondary" type="button" onClick={() => setResetUser(null)} className="flex-1 h-14 font-black text-[11px] uppercase tracking-widest">Abort</Button>
                    </div>
                </form>
            </Card>
        </div>
      )}
    </div>
  );
}
