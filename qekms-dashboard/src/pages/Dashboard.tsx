import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send, ShieldIcon, Activity, Lock, Scan, Key,
  UserCircle, Search, MoreVertical, Plus, RefreshCw, Radio,
  Cpu, Zap, Fingerprint, MessageSquare, ChevronLeft, LayoutDashboard, Globe, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { securityService } from '../api/SecurityService';
import { InlineLoader } from '../components/InlineLoader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

// ── Types ────────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  type?: 'system' | 'chat' | 'file' | 'image';
}

interface Channel {
  id: string;
  sender: string;
  receiver: string;
  is_active: boolean;
  is_pending: boolean;
  current_key_version?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Security & Loading
  const [isSecurityReady, setIsSecurityReady] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelError, setChannelError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [createError, setCreateError] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Limits
  const PLAN_LIMITS: any = { free: 5, pro: 50, enterprise: -1 };
  const currentLimit = PLAN_LIMITS[user?.plan || 'free'] || 5;
  const isAtLimit = currentLimit !== -1 && channels.length >= currentLimit;

  // Refs
  const channelAbortController = useRef<AbortController | null>(null);
  const messageAbortController = useRef<AbortController | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // ── 1. Security Initialization ──────────────────────────────────────
  const initializeSecurity = useCallback(async () => {
      try {
          const { data } = await api.post('/channels/handshake', { client_public_key: "INITIAL" });
          await securityService.establishSession(data.server_public_key);
          setIsSecurityReady(true);
      } catch (err) {
          console.error('[Dashboard] Security Initialization Failed:', err);
          setChannelError('Security handshake failed. Check network integrity.');
      }
  }, []);

  // ── 2. Fetch Channels ──────────────────────────────────────────────
  const fetchChannels = useCallback(async (isBackground = false) => {
    if (!isBackground) {
        setLoadingChannels(true);
        setChannelError('');
    }

    if (channelAbortController.current) channelAbortController.current.abort();
    channelAbortController.current = new AbortController();

    try {
      const { data } = await api.get('/channels/', {
        signal: channelAbortController.current.signal
      });
      setChannels(data);
    } catch (err: any) {
      if (err.name === 'CanceledError') return;
      setChannelError(err.response?.data?.detail || 'Failed to sync mesh nodes');
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // ── 3. Load Messages ──────────────────────────────────────────────
  const loadInitialMessages = useCallback(async (channel: Channel) => {
    setLoadingMessages(true);
    setMessageError('');
    setMessages([]);

    if (messageAbortController.current) messageAbortController.current.abort();
    messageAbortController.current = new AbortController();

    try {
      setKeyStatus('loading');
      const encodedPubKey = securityService.getEncodedClientPublicKey();
      const { data: keyData } = await api.get(`/channels/${channel.id}/key?client_public_key=${encodedPubKey}`, {
          signal: messageAbortController.current.signal
      });

      const version = keyData.version || 1;
      await securityService.loadChannelKey(channel.id, version, keyData.wrapped_key);
      setKeyStatus('ready');

      const { data: encryptedMsgs } = await api.get(`/channels/${channel.id}/messages`, {
        signal: messageAbortController.current.signal
      });

      const decrypted = await Promise.all(
        encryptedMsgs.messages.map(async (m: any) => {
            try {
                const content = await securityService.processIncoming(m, channel.id);
                return { ...m, content };
            } catch (decErr) {
                return { ...m, content: '[DECRYPTION FAILURE]' };
            }
        })
      );

      setMessages(decrypted);
      setTimeout(scrollToBottom, 50);
    } catch (err: any) {
      if (err.name === 'CanceledError') return;
      setKeyStatus('error');
      setMessageError(err.response?.data?.detail || 'Handshake failed: Security mismatch');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── 4. WebSockets ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChannel || keyStatus !== 'ready') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const backendUrl = (import.meta as any).env.VITE_BACKEND_URL;
    const cleanUrl = backendUrl.replace(/^https?:\/\//, '');
    const socketUrl = `${protocol}//${cleanUrl}/channels/ws/chat/${activeChannel.id}`;

    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'message') {
            const msgData = payload.data;
            const decrypted = await securityService.processIncoming(msgData, activeChannel.id);
            const msg: Message = { ...msgData, content: decrypted };
            setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
            setTimeout(scrollToBottom, 50);
        }
      } catch (err) {
        console.error('[Dashboard] Real-time Error:', err);
      }
    };

    return () => socket.close();
  }, [activeChannel, keyStatus]);

  // ── 5. Lifecycle Hooks ────────────────────────────────────────────
  useEffect(() => {
    initializeSecurity().then(() => fetchChannels());
    return () => {
        if (channelAbortController.current) channelAbortController.current.abort();
        if (messageAbortController.current) messageAbortController.current.abort();
    };
  }, [initializeSecurity, fetchChannels]);

  // ── 6. Actions ────────────────────────────────────────────────────
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setMobileView('chat');
    loadInitialMessages(channel);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel || keyStatus !== 'ready') return;

    const content = newMessage;
    setNewMessage('');

    try {
      const version = activeChannel.current_key_version || 1;
      const securePayload = await securityService.prepareOutgoing(content, activeChannel.id, version);
      await api.post(`/channels/${activeChannel.id}/send`, securePayload);
    } catch (err) {
      console.error('[Dashboard] Transmission Failed:', err);
      setMessageError('Security layer rejected outgoing payload');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAtLimit) return;
    setCreateError('');
    try {
      await api.post('/channels/', { receiver_email: receiverEmail });
      setReceiverEmail('');
      setShowCreateChannel(false);
      fetchChannels(true);
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Mapping rejected');
    }
  };

  const filteredChannels = channels.filter(c => {
    const target = c.sender === user?.email ? c.receiver : c.sender;
    return target.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-full h-[calc(100vh-140px)] font-sans animate-in fade-in duration-500 relative">
      <div className="h-full flex gap-6 overflow-hidden">
        
        {/* ── Left Sidebar Pane ── */}
        <div className={`flex flex-col w-full lg:w-[350px] shrink-0 ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <Card className="flex-1 flex flex-col p-0 border-white/5 bg-white/[0.02] backdrop-blur-3xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-cyan/10">
                        <Globe size={18} className="text-primary-cyan" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">Mesh Nodes</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => fetchChannels()}
                        className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-white transition-colors bg-white/5 rounded-lg border-none cursor-pointer"
                    >
                        <RefreshCw size={16} className={loadingChannels ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => setShowCreateChannel(true)}
                        className="w-9 h-9 flex items-center justify-center bg-mesh-gradient text-white rounded-lg border-none cursor-pointer shadow-mesh-glow transition-transform active:scale-95"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Plan Usage */}
            <div className="px-6 py-4 bg-white/[0.01] border-b border-white/5">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mapping Capacity</span>
                    <span className={`text-[10px] font-black uppercase ${isAtLimit ? 'text-amber-500' : 'text-primary-cyan'}`}>
                        {channels.length} / {currentLimit === -1 ? '∞' : currentLimit}
                    </span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentLimit === -1 ? 100 : (channels.length / currentLimit) * 100}%` }}
                        className={`h-full ${isAtLimit ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 'bg-primary-cyan shadow-[0_0_8px_rgba(6,182,212,0.4)]'}`}
                    />
                </div>
            </div>

            {/* Search */}
            <div className="p-4">
                <Input 
                    placeholder="QUERY NODE IDENTITY..."
                    icon={Search}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-12 bg-black/40 border-white/10 text-xs font-mono"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 space-y-2">
                {loadingChannels && channels.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-2 border-primary-cyan/20 border-t-primary-cyan rounded-full animate-spin" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Scanning Protocols...</span>
                    </div>
                ) : filteredChannels.map(channel => {
                    const isActive = activeChannel?.id === channel.id;
                    const other = channel.sender === user?.email ? channel.receiver : channel.sender;
                    return (
                        <motion.button
                            key={channel.id}
                            whileHover={{ x: 4 }}
                            onClick={() => handleSelectChannel(channel)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group text-left cursor-pointer ${
                                isActive 
                                    ? 'bg-primary-cyan/10 border-primary-cyan/30 text-white shadow-mesh-glow shadow-primary-cyan/5' 
                                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-gray-400'
                            }`}
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 ${
                                isActive ? 'bg-primary-cyan/20 border-primary-cyan/30 text-primary-cyan' : 'bg-black/30 border-white/10 text-gray-600 group-hover:text-gray-300'
                            }`}>
                                <Cpu size={20} className={isActive ? 'animate-pulse' : ''} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5">
                                    <span className="text-[13px] font-black truncate uppercase tracking-tight">{other.split('@')[0]}</span>
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                                        channel.is_pending ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                                    }`}>
                                        {channel.is_pending ? 'Sync' : 'Live'}
                                    </span>
                                </div>
                                <p className="m-0 text-[10px] text-gray-500 truncate font-mono">{other}</p>
                            </div>
                        </motion.button>
                    )
                })}
            </div>
          </Card>
        </div>

        {/* ── Main Chat/Interface Pane ── */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {!activeChannel ? (
                <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center border-white/5 bg-white/[0.01] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-cyan/[0.03] via-transparent to-transparent pointer-events-none" />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        <div className="w-24 h-24 bg-mesh-gradient rounded-[2rem] mx-auto flex items-center justify-center shadow-mesh-glow relative">
                            <ShieldIcon size={44} className="text-white" />
                            <div className="absolute inset-0 rounded-[2rem] border border-white/20 animate-ping opacity-20" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-4">Quantum Mesh Gateway</h2>
                            <p className="text-sm font-medium text-gray-500 max-w-sm mx-auto leading-relaxed">
                                Select an active terminal from the mesh network to establish a cryptographically secured tunnel.
                            </p>
                        </div>
                        <div className="flex justify-center gap-8 pt-8">
                            <div className="flex flex-col items-center gap-2">
                                <Scan size={18} className="text-primary-cyan opacity-40" />
                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">End-to-End Encryption</span>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <Key size={18} className="text-primary-cyan opacity-40" />
                                <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Quantum Entropies</span>
                            </div>
                        </div>
                    </motion.div>
                </Card>
            ) : (
                <Card className="flex-1 flex flex-col p-0 border-white/5 bg-white/[0.01] overflow-hidden">
                    {/* Active Header */}
                    <div className="h-[80px] px-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMobileView('list')} className="lg:hidden p-2 -ml-3 text-gray-500 hover:text-white">
                                <ChevronLeft size={22} />
                            </button>
                            <div className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-primary-cyan">
                                <UserCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-[17px] font-black text-white m-0 tracking-tight">
                                    {(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender).split('@')[0]}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Established P2P Link</span>
                                </div>
                            </div>
                        </div>

                        <div className={`hidden md:flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all ${
                            keyStatus === 'ready' ? 'bg-primary-cyan/10 border-primary-cyan/30 text-primary-cyan shadow-mesh-glow' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        }`}>
                            <Fingerprint size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">
                                {keyStatus === 'ready' ? 'Cipher Validated' : 'Handshaking...'}
                            </span>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative chat-bg">
                        {loadingMessages ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                                <InlineLoader message="DECRYPTING MESH HISTORY..." />
                            </div>
                        ) : messageError ? (
                            <ErrorState message={messageError} onRetry={() => loadInitialMessages(activeChannel)} />
                        ) : (
                            <div className="flex flex-col space-y-6 min-h-full justify-end">
                                <AnimatePresence initial={false}>
                                    {messages.map((msg, idx) => {
                                        const isMe = msg.sender === user?.email;
                                        return (
                                            <motion.div
                                                key={msg.id || idx}
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] lg:max-w-[70%] group`}>
                                                    <Card className={`p-4 rounded-3xl ${
                                                        isMe 
                                                            ? 'bg-mesh-gradient text-white border-transparent rounded-tr-none shadow-mesh-glow shadow-primary-cyan/10' 
                                                            : 'bg-white/5 border-white/5 text-gray-200 rounded-tl-none'
                                                    }`}>
                                                        <p className="m-0 text-sm leading-relaxed font-medium">{msg.content}</p>
                                                    </Card>
                                                    <div className={`flex items-center gap-2 mt-2 px-1 opacity-40 text-[9px] font-black uppercase tracking-[0.2em] ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <Lock size={10} />
                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-xl">
                        <form onSubmit={sendMessage} className="flex gap-4 items-center">
                            <div className="flex-1 relative group">
                                <Input 
                                    placeholder="TRANSMIT SECURE PAYLOAD..."
                                    icon={Zap}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    disabled={keyStatus !== 'ready'}
                                    className="h-14 bg-black/40 border-white/10 focus:bg-black/60 font-mono text-sm"
                                />
                            </div>
                            <Button 
                                type="submit"
                                disabled={!newMessage.trim() || keyStatus !== 'ready'}
                                className="w-14 h-14 p-0 shadow-mesh-glow rounded-2xl shrink-0"
                            >
                                <Send size={22} className="ml-1" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}
        </div>
      </div>

      {/* ── Mapping Modal ── */}
      {showCreateChannel && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowCreateChannel(false)}>
              <Card onClick={e => e.stopPropagation()} className="w-full max-w-md p-10 space-y-8 border-primary-cyan/30 bg-mesh-dark shadow-[0_0_100px_rgba(6,182,212,0.15)] animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-mesh-gradient" />
                
                <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-primary-cyan/10 mx-auto rounded-3xl flex items-center justify-center border border-primary-cyan/20">
                        <Radio size={36} className="text-primary-cyan" />
                    </div>
                    <h3 className="text-3xl font-black text-white m-0 tracking-tight">Initiate Mapping</h3>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] m-0">Secure Node Discovery Sequence</p>
                </div>

                {!isAtLimit ? (
                    <form onSubmit={handleCreateChannel} className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Remote Node Identity</label>
                            <Input 
                                type="email"
                                required
                                placeholder="OPERATOR@MESH.PROTOCOL"
                                value={receiverEmail}
                                onChange={e => setReceiverEmail(e.target.value)}
                                className="h-14 font-mono text-sm bg-black/40"
                            />
                        </div>
                        {createError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black text-center uppercase tracking-widest">
                                {createError}
                            </div>
                        )}
                        <div className="flex gap-4 pt-2">
                            <Button type="submit" className="flex-1 h-14 text-[13px] font-black shadow-mesh-glow uppercase tracking-widest">Establish Route</Button>
                            <Button variant="secondary" type="button" onClick={() => setShowCreateChannel(false)} className="flex-1 h-14 text-[13px] font-bold">Abort</Button>
                        </div>
                    </form>
                ) : (
                    <div className="pt-4 space-y-6 text-center">
                        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                            <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                            <h4 className="text-lg font-black text-white tracking-tight">Quota Reached</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Your <span className="text-amber-500 font-bold uppercase">{user?.plan || 'Free'}</span> plan is currently restricted to {currentLimit} mesh nodes. Access to further mappings requires a higher clearace level.
                            </p>
                        </div>
                        <Button className="w-full h-14 bg-amber-500 text-black hover:bg-white transition-all font-black uppercase tracking-widest">
                             UPGRADE CLEARANCE
                        </Button>
                        <button onClick={() => setShowCreateChannel(false)} className="text-[10px] font-bold text-gray-600 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                            DISMISS WARNING
                        </button>
                    </div>
                )}
              </Card>
          </div>
      )}
    </div>
  );
}
