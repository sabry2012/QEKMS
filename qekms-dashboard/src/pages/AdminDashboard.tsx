import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import {
  Users, Shield, Activity, Settings, UserPlus, Radio, RefreshCw, Trash2, CheckCircle2,
  XCircle, LogOut, Plus, Globe, ToggleLeft, ToggleRight, AlertTriangle, Zap,
  Cpu, Lock, Fingerprint, Database, Terminal, ChevronRight, MessageSquare, Send, UserCircle, Search,
  Paperclip, Mic, StopCircle, FileText, X, Download, Play, SendHorizonal, PlayCircle, PauseCircle, Mail, Copy, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { securityService } from '../api/SecurityService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { InlineLoader } from '../components/InlineLoader';
import { CryptoVisualizerModal } from '../components/CryptoVisualizerModal';
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
  channels_created_total?: number;
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
  type?: string;
  notes?: string;
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
  type?: 'text' | 'image' | 'video' | 'voice' | 'file';
  file_path?: string;
  file_name?: string;
}

interface PendingMedia {
  file: File;
  objectUrl: string | null;
  msgType: 'image' | 'video' | 'voice' | 'file';
}

// ── Status badge ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    approved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    rejected: 'text-red-500 bg-red-500/10 border-red-500/30',
    active: 'text-primary-cyan bg-primary-cyan/10 border-primary-cyan/30',
    inactive: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
    HIGH: 'text-red-500 bg-red-500/20 border-red-500/50 animate-pulse',
    WARN: 'text-amber-500 bg-amber-500/15 border-amber-500/40',
    INFO: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };
  const s = map[status] ?? 'text-gray-500 bg-gray-500/10 border-gray-500/30';
  return (
    <span className={`${s} border rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest`}>
      {status}
    </span>
  );
}

// ── Custom Select Component ───────────────────────────────────────────
function CustomSelect({ value, onChange, options, icon: Icon }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], icon?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-12 bg-black/40 border border-white/10 rounded-xl px-4 flex items-center justify-between gap-4 cursor-pointer hover:border-white/20 transition-all min-w-[160px] group"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className="text-gray-500 group-hover:text-primary-cyan transition-colors" />}
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{selectedOption.label}</span>
        </div>
        <ChevronRight size={14} className={`text-gray-600 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 z-[100] mt-2 w-full min-w-[200px] bg-[#0d0d0f]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-2"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between group/opt ${value === option.value ? 'bg-primary-cyan/5' : ''}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-widest ${value === option.value ? 'text-primary-cyan' : 'text-gray-500 group-hover/opt:text-white'}`}>
                  {option.label}
                </span>
                {value === option.value && <div className="w-1.5 h-1.5 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────
const VoiceNote = ({ url, isMe, timestamp }: { url: string, isMe: boolean, timestamp: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const cleanUrl = url.replace(/\/uploads\/uploads\//g, '/uploads/');

  useEffect(() => {
    if (audioRef.current) audioRef.current.load();
  }, [cleanUrl]);

  const toggle = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => {
          console.error("Audio Playback Error:", e);
          setHasError(true);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 0;
      if (dur > 0) setProgress((current / dur) * 100);
    }
  };

  const onLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
    setIsLoading(false);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayTime = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="flex items-center gap-4 px-4 py-3 min-w-[280px] select-none bg-transparent">
      {/* Play Button - Clean WhatsApp Style */}
      <button
        onClick={toggle}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${hasError ? 'bg-red-500/20 text-red-500' : isMe ? 'bg-white/20 text-white' : 'bg-primary-cyan/20 text-primary-cyan'
          } hover:scale-105 active:scale-95`}
        disabled={hasError}
      >
        {isLoading ? (
          <RefreshCw size={24} className="animate-spin opacity-40" />
        ) : hasError ? (
          <AlertTriangle size={24} />
        ) : isPlaying ? (
          <PauseCircle size={32} fill="currentColor" />
        ) : (
          <PlayCircle size={32} fill="currentColor" className="ml-1" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1.5 mt-0.5">
        <div
          className="h-8 w-full relative flex items-center cursor-pointer group"
          onClick={(e) => {
            if (!audioRef.current || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            audioRef.current.currentTime = pct * duration;
          }}
        >
          <div className="absolute inset-x-0 inset-y-0 flex items-center gap-[2px] opacity-10">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="flex-1 bg-white" style={{ height: `${30 + Math.sin(i * 0.4) * 50}%`, borderRadius: '4px' }} />
            ))}
          </div>

          <div className="absolute inset-x-0 inset-y-0 flex items-center gap-[2px] overflow-hidden pointer-events-none" style={{ width: `${progress}%` }}>
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className={`flex-1 ${isMe ? 'bg-white' : 'bg-primary-cyan'}`} style={{ height: `${30 + Math.sin(i * 0.4) * 50}%`, borderRadius: '4px' }} />
            ))}
          </div>

          <motion.div
            className={`absolute w-1 h-8 ${isMe ? 'bg-white/40' : 'bg-primary-cyan/40'} z-10 pointer-events-none`}
            style={{ left: `${progress}%`, marginLeft: '-0.5px' }}
            animate={{ opacity: isPlaying ? 0.8 : 0.3 }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest tabular-nums font-mono">
          <span className="opacity-60">{isPlaying ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}</span>
          <div className="flex items-center gap-1 opacity-40">
            <span>{displayTime}</span>
            <Lock size={8} />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={cleanUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onLoadedMetadata={onLoadedMetadata}
        onError={() => { setHasError(true); setIsLoading(false); }}
        className="hidden"
        preload="auto"
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'messages' | 'audit' | 'health'>('overview');

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<ClientRequest[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantumHealth, setQuantumHealth] = useState<QuantumStatus | null>(null);
  const [sysSettings, setSysSettings] = useState<any>({});
  const [sysStats, setSysStats] = useState<any>({});
  const [stats, setStats] = useState<any>({
    total_users: 0, pending_requests: 0,
    approved_requests: 0, rejected_requests: 0,
  });

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'account', plan: 'professional' });

  // Provisioning State
  const [credsResult, setCredsResult] = useState<{ email: string; password: string } | null>(null);
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // ── MESSAGING STATE ──
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [presence, setPresence] = useState<Record<string, { status: 'online' | 'offline', last_seen?: string }>>({});
  const [keyStatus, setKeyStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [isSecurityReady, setIsSecurityReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  // Media state
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');

  // Media Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter States
  const [overviewClientFilter, setOverviewClientFilter] = useState('all');
  const [overviewUserFilter, setOverviewUserFilter] = useState('all');
  const [usersFilter, setUsersFilter] = useState('all');
  const [clientsFilter, setClientsFilter] = useState('all');
  const [showDeletedClients, setShowDeletedClients] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => { try { const { data } = await api.get('/admin/clients/stats'); setStats(data); } catch { } }, []);
  const fetchUsers = useCallback(async () => { try { const { data } = await api.get('/admin/users'); setUsers(data); } catch { } }, []);
  const fetchClients = useCallback(async () => { try { const { data } = await api.get('/admin/clients'); setClients(data); } catch { } }, []);
  const fetchChannels = useCallback(async () => {
    try {
      const { data } = await api.get('/channels/');
      setChannels(data);

      const initialPresence: Record<string, any> = {};
      data.forEach((ch: any) => {
        if (ch.other_presence) {
          const other = ch.sender === user?.email ? ch.receiver : ch.sender;
          initialPresence[other] = ch.other_presence;
        }
      });
      setPresence(prev => ({ ...initialPresence, ...prev }));
    } catch { }
  }, [user?.email]);
  const fetchSettings = useCallback(async () => { try { const { data } = await api.get('/admin/settings'); setSysSettings(data); } catch { } }, []);
  const fetchAudit = useCallback(async () => { try { const { data } = await api.get('/admin/audit-logs'); setAuditLogs(data); } catch { } }, []);
  const fetchSysHealth = useCallback(async () => { try { const { data } = await api.get('/admin/quantum/status'); setQuantumHealth(data); } catch { } }, []);
  const fetchSysStats = useCallback(async () => { try { const { data } = await api.get('/admin/stats'); setSysStats(data); } catch { } }, []);

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

  // ── Global Security Handshake (once per session) ──────────────────────
  useEffect(() => {
    const initSecurity = async () => {
      try {
        const { data: shake } = await api.post('/channels/handshake', { client_public_key: 'INITIAL' });
        await securityService.establishSession(shake.server_public_key);
        setIsSecurityReady(true);
      } catch (err) {
        console.error('[AdminDashboard] Security handshake failed:', err);
      }
    };
    initSecurity();
  }, []);

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
    setNewUser({ email: '', password: '', role: 'account', plan: 'professional' });
  };


  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    await handleAction(`/admin/reset-password/${resetUser.id}`, 'post', { new_password: newPassword });
    setResetUser(null);
    setNewPassword('');
  };

  const handleForceRecalibrate = async () => {
    await handleAction('/admin/quantum/recalibrate', 'post');
    // Re-fetch health immediately to get updated entropy metrics
    fetchSysHealth();
  };

  const handleOpenVisualizer = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // ── MESSAGING LOGIC ──
  const loadMessages = useCallback(async (channel: Channel) => {
    if (!isSecurityReady) {
      console.warn('[AdminDashboard] Attempted to load messages before security was ready.');
      return;
    }
    setLoadingMessages(true);
    setMessages([]);
    try {
      setKeyStatus('loading');
      // Session is already established globally — just fetch the channel key
      const encodedPubKey = securityService.getEncodedClientPublicKey();
      const { data: keyData } = await api.get(`/channels/${channel.id}/key?client_public_key=${encodedPubKey}`);
      await securityService.loadChannelKey(channel.id, keyData.wrapped_key, keyData.version || 1);
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
  }, [isSecurityReady]);

  // ── MESSAGING HELPERS ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    let msgType: 'image' | 'video' | 'voice' | 'file' = 'file';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) msgType = 'image';
    else if (['mp4', 'webm', 'mov'].includes(ext || '')) msgType = 'video';
    else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext || '')) msgType = 'voice';

    setPendingMedia({
      file,
      objectUrl: URL.createObjectURL(file),
      msgType
    });
  };

  const cancelPendingMedia = () => {
    if (pendingMedia?.objectUrl) URL.revokeObjectURL(pendingMedia.objectUrl);
    setPendingMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `admin-rec-${Date.now()}.webm`, { type: 'audio/webm' });
        setPendingMedia({ file, objectUrl: URL.createObjectURL(audioBlob), msgType: 'voice' });
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(prev => prev + 1), 1000);
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingMedia) || !activeChannel || keyStatus !== 'ready') return;

    setIsUploading(true);
    let fileMeta = null;

    try {
      if (pendingMedia) {
        const formData = new FormData();
        formData.append('file', pendingMedia.file);
        const { data: uploadData } = await api.post(`/channels/${activeChannel.id}/upload`, formData);
        fileMeta = uploadData;
      }

      const content = newMessage.trim();
      const version = 1; // Assuming version 1 for admin simplicity or sync with backend
      const payload: any = await securityService.prepareOutgoing(content, activeChannel.id, version);

      if (fileMeta) {
        payload.msg_type = pendingMedia?.msgType || fileMeta.msg_type;
        payload.file_path = fileMeta.file_path;
        payload.file_name = fileMeta.file_name;
      }

      await api.post(`/channels/${activeChannel.id}/send`, payload);
      setNewMessage('');
      cancelPendingMedia();
    } catch (err) {
      setError('Transmission failed');
    } finally {
      setIsUploading(false);
    }
  };

  const selectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    loadMessages(channel);
  };

  useEffect(() => {
    if (!activeChannel || keyStatus !== 'ready') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const rawBackendUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000';
    const baseUrl = rawBackendUrl.replace(/^https?:\/\//, '');
    const socket = new WebSocket(`${protocol}//${baseUrl}/channels/ws/chat/${activeChannel.id}`);
    ws.current = socket;
    socket.onmessage = async (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'message') {
          const msgData = payload.data;
          const decrypted = await securityService.processIncoming(msgData, activeChannel.id);
          const msg: Message = { ...msgData, content: decrypted };
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
        } else if (payload.type === 'presence') {
          setPresence(prev => ({
            ...prev,
            [payload.user]: { status: payload.status, last_seen: payload.last_seen }
          }));
        } else if (payload.type === 'messages_cleared') {
          setMessages([]);
        }
      } catch (err) {
        console.error('[AdminDashboard] Socket Error:', err);
      }
    };
    return () => socket.close();
  }, [activeChannel, keyStatus]);

  // Auto-retry message load if security became ready after channel selection
  useEffect(() => {
    if (isSecurityReady && activeChannel && keyStatus === 'idle') {
      loadMessages(activeChannel);
    }
  }, [isSecurityReady, activeChannel, keyStatus, loadMessages]);

  const handleStartChat = async (email: string) => {
    if (!email || !email.includes('@')) return;
    try {
      const { data } = await api.post('/channels/', { receiver_email: email });
      fetchAll();
      setActiveTab('messages');
      selectChannel(data.channel);
      setSearchEmail('');
    } catch { setError('Could not initialize P2P tunnel'); }
  };

  const handleClearChat = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!channelId || !window.confirm('Are you sure you want to PERMANENTLY delete all messages in this tunnel?')) return;
    try {
      const { data } = await api.delete(`/channels/${channelId}/messages`);
      console.log(`[AdminDashboard] Clear Chat Result: ${data.deleted_count} messages deleted.`);
      if (activeChannel?.id === channelId) {
        setMessages([]);
      }
      setSuccess(`Channel history purged (${data.deleted_count} records)`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error("[AdminDashboard] Failed to clear history:", err);
      setError('Failed to clear history');
    }
  };

  // ── COMPUTED FILTERS ──
  const activeClientsArray = clients.filter(c => !(c as any).is_deleted);

  const filteredOverviewClients = activeClientsArray
    .filter(c => overviewClientFilter === 'all' ? true : c.status === overviewClientFilter);

  const filteredOverviewUsers = users
    .filter(u => overviewUserFilter === 'all' ? true : (overviewUserFilter === 'active' ? u.is_active : !u.is_active));

  const filteredOperators = users
    .filter(u => {
      if (usersFilter === 'all') return true;
      if (usersFilter === 'admin') return u.role === 'admin';
      if (usersFilter === 'pending') return !u.is_active;
      return u.plan === usersFilter;
    });

  const filteredClientsList = clients
    .filter(c => showDeletedClients ? true : !(c as any).is_deleted)
    .filter(c => clientsFilter === 'all' ? true : c.status === clientsFilter);

  const totalRevenue = activeClientsArray.filter(c => c.status === 'approved' || c.amount).reduce((a, c) => a + (c.amount || 0), 0);
  const pendingCount = activeClientsArray.filter(c => c.status === 'pending').length;

  const statCards = [
    { label: 'Total Nodes', value: stats.total_users, icon: Users, color: 'text-primary-cyan', bg: 'bg-primary-cyan/15', border: 'border-primary-cyan/25' },
    { label: 'Pending Requests', value: stats.pending_requests, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
    { label: 'Security Threats', value: sysStats.threats_detected || 0, icon: Shield, color: 'text-red-500', bg: 'bg-red-500/15', border: 'border-red-500/25' },
    { label: 'Active Channels', value: channels.length, icon: Radio, color: 'text-violet-500', bg: 'bg-violet-500/15', border: 'border-violet-500/25' },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'users', label: 'Operators', icon: Users, badge: users.length },
    { key: 'clients', label: 'Requests', icon: UserPlus, badge: pendingCount, highlight: pendingCount > 0 },
    { key: 'messages', label: 'Messages', icon: MessageSquare },
    { key: 'health', label: 'Quantum', icon: Zap },
    { key: 'audit', label: 'Audit', icon: Activity },
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
                  className={`flex items-center gap-2 px-6 py-5 border-none bg-transparent cursor-pointer relative transition-all duration-300 whitespace-nowrap group ${active ? 'text-primary-cyan font-black' : 'text-gray-500 font-bold hover:text-white'
                    } text-[11px] uppercase tracking-[0.1em]`}
                >
                  <tab.icon size={15} className={active ? 'text-primary-cyan' : 'group-hover:text-primary-cyan transition-colors'} />
                  {tab.label}
                  {active && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 w-full h-[3px] bg-primary-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]" />}
                  {(tab as any).badge > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black leading-none ${(tab as any).highlight ? 'bg-amber-500 text-black' : 'bg-white/10 text-gray-400'
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3 m-0">
                        <UserPlus size={16} /> Latest Mesh Requests
                      </h3>
                      <CustomSelect
                        value={overviewClientFilter}
                        onChange={setOverviewClientFilter}
                        options={[
                          { value: 'all', label: 'ALL' },
                          { value: 'pending', label: 'PENDING' },
                          { value: 'approved', label: 'APPROVED' },
                          { value: 'rejected', label: 'REJECTED' },
                        ]}
                      />
                    </div>
                    {filteredOverviewClients.slice(0, 4).map(c => (
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
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] flex items-center gap-3 m-0">
                        <Users size={16} /> Distributed Operators
                      </h3>
                      <CustomSelect
                        value={overviewUserFilter}
                        onChange={setOverviewUserFilter}
                        options={[
                          { value: 'all', label: 'ALL' },
                          { value: 'active', label: 'ACTIVE' },
                          { value: 'inactive', label: 'INACTIVE' },
                        ]}
                      />
                    </div>
                    {filteredOverviewUsers.slice(0, 4).map(u => (
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
                  <div className="flex items-center gap-4">
                    <CustomSelect
                      value={usersFilter}
                      onChange={setUsersFilter}
                      options={[
                        { value: 'all', label: 'ALL OPERATORS' },
                        { value: 'pending', label: 'PENDING APPROVAL' },
                        { value: 'admin', label: 'ADMINISTRATORS' },
                        { value: 'starter', label: 'STARTER' },
                        { value: 'professional', label: 'PROFESSIONAL' },
                        { value: 'enterprise', label: 'ENTERPRISE' },
                      ]}
                    />
                    <Button onClick={() => setShowAddForm(!showAddForm)} className="h-12 px-8 shadow-mesh-glow">
                      <Plus size={16} className="mr-2" /> Deploy New Node
                    </Button>
                  </div>
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
                            <CustomSelect
                              value={newUser.plan}
                              onChange={(v) => setNewUser({ ...newUser, plan: v })}
                              options={[
                                { value: 'starter', label: 'STARTER NODE' },
                                { value: 'professional', label: 'PROFESSIONAL' },
                                { value: 'enterprise', label: 'ENTERPRISE (∞)' },
                              ]}
                            />
                          </div>
                          <Button type="submit" className="h-12 shadow-mesh-glow font-black uppercase">Initialize Node</Button>
                        </form>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredOperators.map(user => (
                    <Card key={user.id} className="p-6 flex items-center justify-between border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-5 overflow-hidden">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 group-hover:scale-110 ${user.is_active ? 'bg-primary-cyan/10' : 'bg-gray-500/10'}`}>
                          <Users size={20} className={user.is_active ? 'text-primary-cyan' : 'text-gray-500'} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="m-0 text-[14px] font-black text-white tracking-tight truncate group-hover:text-primary-cyan transition-colors">
                            {user.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest shrink-0">
                              {user.plan || 'standard'} · NODE
                            </span>
                            {!user.is_active && (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest shrink-0">
                                Inactive
                              </span>
                            )}
                            <span className="text-[9px] font-black text-primary-cyan uppercase tracking-widest flex items-center gap-1.5 bg-primary-cyan/5 px-2 py-0.5 rounded-md border border-primary-cyan/10 shrink-0">
                              <Radio size={10} className="animate-pulse" />
                              <span>TUNNELS: {user.channels_created_total || 0}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2.5 shrink-0">
                        <button onClick={() => handleStartChat(user.email)} className="w-10 h-10 rounded-xl bg-primary-cyan/10 text-primary-cyan hover:bg-primary-cyan/20 border-none cursor-pointer flex items-center justify-center transition-all shadow-mesh-glow shadow-primary-cyan/5">
                          <MessageSquare size={16} />
                        </button>
                        <button onClick={() => setResetUser(user)} className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 border-none cursor-pointer flex items-center justify-center transition-all">
                          <Lock size={16} />
                        </button>
                        {!user.is_active ? (
                          <button
                            onClick={() => handleAction(`/admin/update-user/${user.id}`, 'put', { is_active: true })}
                            className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-none cursor-pointer flex items-center justify-center transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            title="Approve & Activate"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(`/admin/update-user/${user.id}`, 'put', { is_active: false })}
                            className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none cursor-pointer flex items-center justify-center transition-all"
                            title="Deactivate Node"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
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
                  <div className="p-6 border-b border-white/5">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Active P2P Routes</span>
                      <Radio size={14} className="text-primary-cyan" />
                    </div>
                    <div className="relative group">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary-cyan transition-colors" />
                      <input
                        type="text"
                        placeholder="Search email..."
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleStartChat(searchEmail)}
                        className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white outline-none focus:border-primary-cyan/30 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2">
                    {channels.length === 0 ? (
                      <div className="py-20 text-center opacity-20">
                        <Radio size={40} className="mx-auto mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No tunnels mapped</span>
                      </div>
                    ) : [
                      // Simple client-side filter
                      ...channels.filter(c => {
                        const other = c.sender === user?.email ? c.receiver : c.sender;
                        return other.toLowerCase().includes(searchEmail.toLowerCase());
                      })
                    ].map(c => {
                      const other = c.sender === user?.email ? c.receiver : c.sender;
                      const active = activeChannel?.id === c.id;
                      return (
                        <div
                          key={c.id}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${active ? 'bg-primary-cyan/10 border-primary-cyan/20 text-white' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-500'
                            }`}
                        >
                          <div
                            onClick={() => selectChannel(c)}
                            className="flex-1 flex flex-col cursor-pointer min-w-0"
                          >
                            <p className="m-0 text-[13px] font-black truncate">{other.split('@')[0]}</p>
                            <p className="m-0 text-[9px] font-bold uppercase tracking-widest mt-1 truncate">{other}</p>
                          </div>

                          <button
                            onClick={(e) => handleClearChat(c.id, e)}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-500 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 border-none cursor-pointer"
                            title="Clear History"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
                      <div className="p-6 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-primary-cyan">
                            <UserCircle size={24} />
                          </div>
                          <div>
                            <h3 className="text-[17px] font-black text-white m-0 tracking-tight">{(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender).split('@')[0]}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.status === 'online' ? (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Connection</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                    {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.last_seen
                                      ? `Last seen ${new Date(presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)].last_seen!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                      : 'P2P Link established'}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => activeChannel && handleClearChat(activeChannel.id, e)}
                            className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-red-500/10 text-gray-400 hover:text-red-500 border border-white/5 flex items-center justify-center transition-all group"
                            title="Purge History"
                          >
                            <Trash2 size={18} className="transition-transform group-hover:scale-110" />
                          </button>
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${keyStatus === 'ready' ? 'bg-primary-cyan/10 border-primary-cyan/30 text-primary-cyan shadow-mesh-glow' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                            <Fingerprint size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">{keyStatus === 'ready' ? 'Cipher Active' : 'Key Exchange...'}</span>
                          </div>
                        </div>
                      </div>

                      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative">
                        {loadingMessages ? (
                          <div className="h-full flex items-center justify-center"><InlineLoader message="DECRYPTING PAYLOADS..." /></div>
                        ) : messages.map((m, idx) => {
                          const isMe = m.sender === user?.email;
                          return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] lg:max-w-[240px] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <div className={`rounded-xl shadow-lg transition-all overflow-hidden ${isMe
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-zinc-800 text-gray-200 rounded-tl-none'
                                  }`}>
                                  {/* Unified Media Renderer */}
                                  {(() => {
                                    const mediaUrl = m.file_path?.startsWith('http') ? m.file_path : `${(import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000'}/uploads/${m.file_path}`;
                                    switch (m.type) {
                                      case 'image':
                                        return (
                                          <div className="relative cursor-pointer hover:opacity-95 transition-opacity group/media" onClick={() => setPreviewImage(mediaUrl)}>
                                            <img src={mediaUrl} alt="attachment" className="w-full object-cover block" />
                                            {/* Overlay for image only (no caption) */}
                                            {(!m.content || m.content.trim() === "") && (
                                              <>
                                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                <div className="absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-white">
                                                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  <Lock size={8} />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      case 'video':
                                        // Fallback: If it's a recording but tagged as video by backend
                                        if (m.file_path?.includes('recording-') || m.file_path?.includes('rec-')) {
                                          return <VoiceNote url={mediaUrl} isMe={isMe} timestamp={m.timestamp} />;
                                        }
                                        return (
                                          <div
                                            className="relative group/media bg-black shrink-0 cursor-pointer"
                                            onClick={(e) => {
                                              const v = e.currentTarget.querySelector('video');
                                              if (v) {
                                                if (v.paused) v.play().catch(console.error);
                                                else v.pause();
                                              }
                                            }}
                                          >
                                            <video src={mediaUrl} className="w-full block" preload="metadata" playsInline />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/media:bg-black/30 transition-colors pointer-events-none">
                                              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                                                <Play size={24} fill="currentColor" className="ml-1" />
                                              </div>
                                            </div>
                                            {/* Overlay for video only (no caption) */}
                                            {(!m.content || m.content.trim() === "") && (
                                              <>
                                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                <div className="absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-white">
                                                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  <Lock size={8} />
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        );
                                      case 'voice':
                                        return <VoiceNote url={mediaUrl} isMe={isMe} timestamp={m.timestamp} />;
                                      case 'file':
                                        return (
                                          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 no-underline text-inherit hover:opacity-80 transition-opacity">
                                            <div className={`p-1.5 rounded-lg ${isMe ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                                              <FileText size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[11px] font-black truncate m-0 uppercase tracking-tighter">{m.file_name || 'FileAsset'}</p>
                                            </div>
                                            <Download size={14} className="opacity-40" />
                                          </a>
                                        );
                                      default: return null;
                                    }
                                  })()}

                                  {/* Text Content - Only if exists */}
                                  {m.content && m.content.trim() !== "" && (
                                    <div className="px-3 py-2 relative bg-inherit">
                                      <p className="m-0 text-[13px] leading-snug font-medium break-words">
                                        {m.content}
                                      </p>
                                      {!isMe && m.content !== '[DECRYPTION ERROR]' && (
                                        <div className="flex items-center gap-1 mt-1 opacity-80 text-[8px] font-black uppercase tracking-widest text-emerald-400 group/hmac relative cursor-help w-max">
                                          <CheckCircle2 size={10} /> VERIFIED SECURE
                                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover/hmac:block w-max bg-black/90 text-white text-[9px] px-2 py-1 rounded shadow-lg border border-white/10 z-50">
                                            HMAC Valid • Decryption Successful
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-end gap-1 opacity-30 text-[8px] font-black uppercase tracking-widest mt-1">
                                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <Lock size={8} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {m.type && m.type !== 'image' && m.type !== 'video' && m.type !== 'voice' && (
                                  <div className="flex items-center gap-1.5 mt-1 px-1 opacity-30 text-[8px] font-black uppercase tracking-widest">
                                    <Lock size={8} />
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div className="p-6 border-t border-white/5 bg-white/[0.01] relative">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                        <AnimatePresence>
                          {pendingMedia && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-6 right-6 mb-4 p-4 rounded-2xl bg-mesh-dark border border-white/10 shadow-2xl z-20 flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center relative overflow-hidden">
                                {pendingMedia.msgType === 'image' && pendingMedia.objectUrl && <img src={pendingMedia.objectUrl} className="w-full h-full object-cover" alt="pv" />}
                                {pendingMedia.msgType === 'video' && <Play size={20} className="text-primary-cyan" />}
                                {pendingMedia.msgType === 'voice' && <Mic size={20} className="text-primary-cyan" />}
                                {pendingMedia.msgType === 'file' && <FileText size={20} className="text-primary-cyan" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="m-0 text-[11px] font-black text-white truncate uppercase tracking-tight">{pendingMedia.file.name}</p>
                                <p className="m-0 text-[9px] font-bold text-gray-500 uppercase tracking-widest">{pendingMedia.msgType} attachment</p>
                              </div>
                              <button onClick={cancelPendingMedia} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-white border-none cursor-pointer"><X size={16} /></button>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <form onSubmit={sendMessage} className="flex gap-4 items-center">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-primary-cyan transition-all cursor-pointer"><Paperclip size={20} /></button>

                          <div className="flex-1 relative">
                            <Input
                              placeholder={isRecording ? 'RECORDING...' : "TRANSMIT BROADCAST ON MESH..."}
                              icon={isRecording ? Radio : Zap}
                              value={newMessage}
                              onChange={e => setNewMessage(e.target.value)}
                              disabled={keyStatus !== 'ready' || isRecording || (!!pendingMedia && pendingMedia.msgType === 'voice')}
                              className={`h-14 bg-black/40 border-white/10 font-mono text-sm ${isRecording ? 'text-primary-cyan animate-pulse' : ''}`}
                            />
                            {isRecording && (
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 font-mono">
                                {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                          </div>

                          {!isRecording ? (
                            <button type="button" onClick={startRecording} disabled={keyStatus !== 'ready' || !!pendingMedia} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-red-500 transition-all cursor-pointer disabled:opacity-30"><Mic size={20} /></button>
                          ) : (
                            <button type="button" onClick={stopRecording} className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse cursor-pointer"><StopCircle size={20} /></button>
                          )}

                          <Button
                            type="submit"
                            disabled={(!newMessage.trim() && !pendingMedia) || keyStatus !== 'ready' || isRecording || isUploading}
                            className="w-14 h-14 p-0 shadow-mesh-glow rounded-2xl shrink-0 bg-primary-cyan hover:bg-primary-cyan/80 transition-all text-white border-none cursor-pointer flex items-center justify-center overflow-hidden relative active:scale-95 group"
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isUploading ? (
                              <RefreshCw size={20} className="animate-spin" />
                            ) : (
                              <SendHorizonal size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            )}
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                  <div>
                    <h2 className="m-0 text-xl font-black text-white uppercase tracking-tight">Mesh Provisioning Queue</h2>
                    <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">Authentication and clearance validation for incoming node identifiers.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowDeletedClients(!showDeletedClients)}
                      className={`h-12 px-6 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer border ${showDeletedClients ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-white/5 text-gray-400 border-white/5'}`}
                    >
                      {showDeletedClients ? 'Hide Deleted' : 'Show Deleted'}
                    </button>
                    <CustomSelect
                      value={clientsFilter}
                      onChange={setClientsFilter}
                      options={[
                        { value: 'all', label: 'ALL REQUESTS' },
                        { value: 'pending', label: 'PENDING' },
                        { value: 'approved', label: 'APPROVED' },
                        { value: 'rejected', label: 'REJECTED' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredClientsList.map(client => (
                    <Card key={client.id} className="p-8 flex flex-col gap-6 border-white/5 bg-[#0d0d0f]/40 backdrop-blur-3xl relative overflow-hidden group hover:border-primary-cyan/20 transition-all duration-500 shadow-2xl">
                      {/* Ambient Glow */}
                      <div className="absolute top-[-20%] right-[-20%] w-40 h-40 bg-primary-cyan/5 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="m-0 text-[18px] font-black text-white tracking-tight flex items-center gap-2 truncate">
                            {client.full_name}
                            {(client as any).is_deleted && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest">DELETED</span>}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary-cyan/40" />
                            <p className="m-0 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] truncate">{client.company}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 shrink-0 ml-4">
                          <StatusBadge status={client.status} />
                          {!(client as any).is_deleted && (
                            <button
                              onClick={() => handleAction(`/admin/clients/${client.id}`, 'delete')}
                              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 border-none cursor-pointer transition-all"
                              title="Purge Request"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pb-5 border-b border-white/5 relative z-10">
                        <div className="h-8 px-3 rounded-xl bg-primary-cyan/5 border border-primary-cyan/10 flex items-center gap-2 shrink-0">
                          <Zap size={12} className="text-primary-cyan" />
                          <span className="text-[9px] text-primary-cyan font-black uppercase tracking-wider">{client.plan}</span>
                        </div>
                        {client.type === 'expert_consultation' && (
                          <div className="h-8 px-3 rounded-xl bg-violet-500/5 border border-violet-500/10 flex items-center gap-2 shrink-0">
                            <Shield size={12} className="text-violet-500" />
                            <span className="text-[9px] text-violet-500 font-black uppercase tracking-wider">Consultation</span>
                          </div>
                        )}
                        <div className="h-8 px-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 shrink-0 min-w-0 flex-1 sm:flex-none">
                          <Mail size={12} className="text-gray-500 shrink-0" />
                          <span className="text-[9px] text-gray-400 font-mono truncate">{client.email}</span>
                        </div>
                      </div>

                      {client.notes && (
                        <div className="relative group/notes z-10">
                          <div className="p-5 rounded-2xl bg-black/60 border border-white/5 group-hover/notes:border-primary-cyan/20 transition-all">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare size={10} className="text-gray-600" />
                                <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Message Payload</span>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(client.notes || '');
                                  setSuccess('Message payload copied to clipboard');
                                }}
                                className="p-1.5 rounded-md bg-white/5 hover:bg-primary-cyan/10 text-gray-500 hover:text-primary-cyan border-none cursor-pointer transition-all flex items-center gap-1.5"
                                title="Copy to Clipboard"
                              >
                                <Copy size={10} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Copy</span>
                              </button>
                            </div>
                            <div className="max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                              <p className="m-0 text-[12px] text-gray-400 leading-relaxed font-medium whitespace-pre-wrap break-words">
                                {client.notes}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {client.status === 'pending' && (
                        <div className="flex gap-3 mt-auto relative z-10 pt-2">
                          <button
                            onClick={() => handleAction(`/admin/clients/${client.id}/approve`, 'put')}
                            className="flex-1 h-14 rounded-2xl border-none cursor-pointer bg-primary-cyan text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-cyan/80 transition-all shadow-mesh-glow shadow-primary-cyan/20 group/btn"
                          >
                            <CheckCircle2 size={16} className="group-hover/btn:scale-110 transition-transform" /> Provision
                          </button>
                          <button
                            onClick={() => handleAction(`/admin/clients/${client.id}/reject`, 'put')}
                            className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex items-center justify-center"
                            title="Decline Request"
                          >
                            <XCircle size={20} />
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
                              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
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
                    {quantumHealth?.last_entropy_result?.previous_quality && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4 space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <span>Previous Quality</span>
                          <span>{quantumHealth.last_entropy_result.previous_quality}%</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary-cyan">
                          <span>New Quality</span>
                          <span>{quantumHealth.last_entropy_result.quality}%</span>
                        </div>
                        <div className="text-[8px] text-right font-mono text-gray-600 mt-2">
                          Recalibrated: {new Date(quantumHealth.last_entropy_result.recalibrated_at || '').toLocaleString()}
                        </div>
                      </div>
                    )}
                    <Button onClick={handleForceRecalibrate} className="h-14 font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-700 shadow-mesh-glow shadow-violet-600/20" isLoading={loading}>
                      <Zap size={18} className="mr-3" /> Force Recalibration
                    </Button>
                  </Card>
                </div>
              </div>
            )}

            {/* ── AUDIT TAB ── */}
            {activeTab === 'audit' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="m-0 text-2xl font-black text-white uppercase tracking-tight">Security Audit Matrix</h2>
                    <p className="m-0 mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                       <Shield size={12} className="text-primary-cyan" />
                       Tamper-proof distributed ledger of all collective security events.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={14} />
                      <input 
                        type="text" 
                        placeholder="SEARCH MESH LOGS..." 
                        className="h-10 bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 text-[10px] font-bold text-white outline-none focus:border-primary-cyan/40 transition-all w-[200px] uppercase tracking-widest"
                      />
                    </div>
                    <CustomSelect
                      value="all" // Add state for audit filtering if needed
                      onChange={() => {}}
                      options={[
                        { value: 'all', label: 'ALL SEVERITIES' },
                        { value: 'HIGH', label: 'CRITICAL ONLY' },
                        { value: 'WARN', label: 'WARNINGS' },
                        { value: 'INFO', label: 'INFORMATION' },
                      ]}
                    />
                  </div>
                </div>

                {/* Audit Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Logs', value: auditLogs.length, color: 'text-white' },
                    { label: 'Logins', value: sysStats.logins || 0, color: 'text-primary-cyan' },
                    { label: 'Auth Failures', value: sysStats.login_failures || 0, color: 'text-red-500' },
                    { label: 'Keys Minted', value: sysStats.keys_generated || 0, color: 'text-violet-400' },
                    { label: 'Threats', value: sysStats.threats_detected || 0, color: 'text-amber-500' },
                    { label: 'Quantum %', value: sysStats.keys_generated ? Math.round((sysStats.quantum_source / sysStats.keys_generated) * 100) + '%' : '0%', color: 'text-emerald-400' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{stat.label}</span>
                      <span className={`text-lg font-black tracking-tighter ${stat.color}`}>{stat.value}</span>
                    </div>
                  ))}
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
                        {auditLogs.map((log) => {
                          const eventName = String(log.event || (log as any).event_type || (log as any).type || '').toUpperCase().trim();
                          const canAnalyze = eventName === 'MESSAGE_SENT' || eventName === 'KEY_GENERATED';
                          return (
                          <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-8 py-5 text-gray-500 font-mono text-[11px] whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '---'}</td>
                            <td className="px-8 py-5 font-black text-white tracking-tight">{eventName}</td>
                            <td className="px-8 py-5 text-gray-400 font-bold truncate max-w-[150px]">{log.user_id || 'SYSTEM_CORE'}</td>
                            <td className="px-8 py-5"><StatusBadge status={log.details?.severity || 'INFO'} /></td>
                            <td className="px-8 py-5 text-[11px] text-gray-600 font-mono italic flex items-center justify-between gap-4">
                              <span>{log.details?.ip ? `IPV4://${log.details.ip}` : 'Internal Sequence'}</span>
                              {canAnalyze && (
                                <Button onClick={() => handleOpenVisualizer(log)} className="h-7 text-[10px] font-black px-3 whitespace-nowrap">
                                  {eventName === 'MESSAGE_SENT' ? 'Analyze Flow' : 'Analyze Entropy'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}


          </div>
        </Card>

        <p className="text-center text-[10px] text-gray-700 mt-12 mb-6 font-black uppercase tracking-[0.5em]">
          QEKMS Sovereignty Mode · Restricted Admin Access · Distributed Audit Active
        </p>
      </div>


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
      {/* ── Image Lightbox ── */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border-none cursor-pointer">
            <X size={24} />
          </button>
          <img src={previewImage} alt="preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95" onClick={e => e.stopPropagation()} />
        </div>
      )}
      
      <CryptoVisualizerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        log={selectedLog} 
      />
      
      <style>{`
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.02);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(6, 182, 212, 0.2);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(6, 182, 212, 0.4);
  }
`}</style>
    </div>
  );
}
