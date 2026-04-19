import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send, ShieldIcon, Activity, Lock, Scan, Key,
  UserCircle, Search, MoreVertical, Plus, RefreshCw, Radio,
  Cpu, Zap, Fingerprint, MessageSquare, ChevronLeft
} from 'lucide-react';
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
  sender_email: string;
  content: string;
  timestamp: string;
  type?: 'system' | 'chat';
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

  // ── 3. Load Messages & Keys ────────────────────────────────────────
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
        encryptedMsgs.map(async (m: any) => {
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
    const baseUrl = (import.meta as any).env.VITE_BACKEND_URL.replace(/https?:\/\//, '');
    const socketUrl = `${protocol}//${baseUrl}/channels/ws/chat/${activeChannel.id}`;

    const socket = new WebSocket(socketUrl);
    ws.current = socket;

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        const decrypted = await securityService.processIncoming(payload, activeChannel.id);
        const msg: Message = { ...payload, content: decrypted };
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(scrollToBottom, 50);
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
    <div className="w-full h-[calc(100vh-160px)] font-sans animate-in fade-in duration-500">
      <Card className="h-full flex overflow-hidden border-white/5 p-0 bg-transparent shadow-none">
        
        {/* ── Channel List Pane ── */}
        <div className={`flex-col border-r border-white/5 bg-white/5 w-full lg:w-[320px] shrink-0 ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
             <h2 className="text-lg font-black text-white m-0">Nodes</h2>
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchChannels()}
                  className="p-2 text-gray-400 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                  title="Sync Nodes"
                >
                  <RefreshCw size={18} className={loadingChannels ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => setShowCreateChannel(true)}
                  className="p-2 bg-mesh-gradient/90 text-white rounded-xl hover:bg-mesh-gradient border-none cursor-pointer transition-all shadow-mesh-glow"
                  title="Initiate Mapping"
                >
                  <Plus size={18} />
                </button>
             </div>
          </div>

          <div className="p-4">
            <Input 
              type="text" 
              icon={Search}
              placeholder="Query nodes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-black/20 focus:bg-black/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
              {loadingChannels && channels.length === 0 ? (
                 <div className="py-20 text-center"><InlineLoader message="Scanning Mesh..." /></div>
              ) : channelError && channels.length === 0 ? (
                 <ErrorState message={channelError} onRetry={() => fetchChannels()} />
              ) : filteredChannels.length === 0 ? (
                 <div className="py-20 text-center opacity-30">
                    <MessageSquare size={40} className="mb-4 text-white mx-auto" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active mappings</p>
                 </div>
              ) : (
                  filteredChannels.map(channel => {
                    const isActive = activeChannel?.id === channel.id;
                    const other = channel.sender === user?.email ? channel.receiver : channel.sender;
                    return (
                      <button
                        key={channel.id}
                        onClick={() => handleSelectChannel(channel)}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border cursor-pointer text-left group transition-all duration-200 ${
                          isActive 
                            ? 'bg-primary-cyan/10 border-primary-cyan/30 text-white' 
                            : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-gray-300'
                        }`}
                      >
                        <div className="relative shrink-0">
                           <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-transform duration-300 ${
                             isActive ? 'bg-primary-cyan/20 border-primary-cyan/30 text-primary-cyan group-hover:scale-105' : 'bg-black/30 border-white/10 text-gray-500 group-hover:text-primary-cyan group-hover:scale-105'
                           }`}>
                              <UserCircle size={22} />
                           </div>
                           {channel.is_active && (
                             <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-mesh-dark" />
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[13px] font-bold truncate pr-3">{other.split('@')[0]}</span>
                              <span className={`text-[9px] uppercase tracking-widest font-extrabold shrink-0 border px-1.5 py-0.5 rounded-md ${
                                channel.is_pending ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 'text-primary-cyan border-primary-cyan/30 bg-primary-cyan/10'
                              }`}>
                                 {channel.is_pending ? 'Sync' : 'Link'}
                              </span>
                           </div>
                           <p className="m-0 text-xs text-gray-500 truncate">{other}</p>
                        </div>
                      </button>
                    );
                  })
              )}
          </div>
        </div>

        {/* ── Chat Content Pane ── */}
        <div className={`flex-1 flex flex-col relative bg-mesh-dark ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}>
            {!activeChannel ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary-cyan/5 rounded-full blur-[100px] pointer-events-none" />
                 
                 <div className="w-24 h-24 bg-mesh-gradient rounded-2xl flex items-center justify-center mb-8 shadow-mesh-glow relative z-10 animate-fade-in-up">
                    <ShieldIcon size={40} className="text-white" />
                 </div>
                 <h3 className="text-3xl font-black text-white mb-4 relative z-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>Sovereign Intel</h3>
                 <p className="text-sm font-medium text-gray-400 max-w-sm leading-relaxed relative z-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    Select a node from your mesh to establish a cryptographically secured P2P tunnel.
                 </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <header className="h-[76px] px-8 border-b border-white/5 flex items-center justify-between bg-white/5 relative z-10">
                   <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setMobileView('list')}
                        className="lg:hidden p-2 -ml-3 text-gray-500 hover:text-white bg-transparent border-none cursor-pointer"
                      >
                         <ChevronLeft size={22} />
                      </button>
                      <div className="w-11 h-11 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center text-primary-cyan shadow-sm">
                         <UserCircle size={22} />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[15px] font-extrabold text-white">
                           {(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender).split('@')[0]}
                         </span>
                         <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Node Active</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className={`hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
                     keyStatus === 'ready' ? 'bg-primary-cyan/10 border-primary-cyan/30 text-primary-cyan shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                   }`}>
                      <Fingerprint size={16} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5">
                         {keyStatus === 'ready' ? 'Cipher Synchronized' : 'Handshake...'}
                      </span>
                   </div>
                </header>

                {/* Messages Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar relative z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-cyan/[0.02] to-transparent pointer-events-none" />

                    {loadingMessages ? (
                       <div className="py-20 text-center relative z-10"><InlineLoader message="Establishing Tunnel..." /></div>
                    ) : messageError ? (
                       <ErrorState message={messageError} onRetry={() => loadInitialMessages(activeChannel)} />
                    ) : (
                      messages.map((msg, i) => {
                        const isMe = msg.sender_email === user?.email;
                        return (
                          <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10`}>
                             <div className={`max-w-[85%] lg:max-w-[70%] space-y-2`}>
                                <div className={`px-5 py-3.5 rounded-2xl text-[13px] leading-relaxed transition-all shadow-sm ${
                                  isMe 
                                    ? 'bg-mesh-gradient text-white font-medium rounded-tr-sm shadow-mesh-glow/20' 
                                    : 'bg-white/5 border border-white/5 text-gray-200 rounded-tl-sm'
                                }`}>
                                   {msg.content}
                                </div>
                                <div className={`flex items-center gap-1.5 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest ${isMe ? 'justify-end' : 'justify-start'}`}>
                                   <Lock size={10} className="opacity-50" />
                                   {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                             </div>
                          </div>
                        );
                      })
                    )}
                </div>

                {/* Input Footer */}
                <div className="p-6 bg-white/5 border-t border-white/5 relative z-10 backdrop-blur-md">
                   <form onSubmit={sendMessage} className="flex gap-4">
                      <div className="flex-1 relative">
                         <Input 
                           type="text" 
                           icon={Zap}
                           placeholder="TRANS-ENCODE PAYLOAD..."
                           value={newMessage}
                           onChange={e => setNewMessage(e.target.value)}
                           disabled={keyStatus !== 'ready'}
                           className="h-[52px] font-mono text-sm bg-black/40 border-white/10 focus:bg-black/60"
                         />
                      </div>
                      <Button 
                        type="submit"
                        disabled={!newMessage.trim() || keyStatus !== 'ready'}
                        className="w-[52px] h-[52px] shrink-0 p-0 shadow-mesh-glow"
                      >
                         <Send size={20} className="ml-1" />
                      </Button>
                   </form>
                </div>
              </>
            )}
        </div>
      </Card>

      {/* Initiator Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-mesh-dark/80 backdrop-blur-sm z-[500] flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={() => setShowCreateChannel(false)}>
            <Card onClick={e => e.stopPropagation()} className="w-full max-w-md p-10 space-y-10 border-primary-cyan/20 bg-mesh-dark shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-in zoom-in-95 duration-200">
               <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary-cyan/10 mx-auto rounded-2xl flex items-center justify-center border border-primary-cyan/30 shadow-inner">
                     <Radio size={36} className="text-primary-cyan" />
                  </div>
                  <h3 className="text-2xl font-black text-white m-0">Mapping Initiation</h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest m-0 mt-2">Register remote node in cryptosystem.</p>
               </div>
               
               <form onSubmit={handleCreateChannel} className="space-y-6">
                  <div className="space-y-2.5">
                     <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Node Identifier</label>
                     <Input 
                       type="email" 
                       required
                       placeholder="OPERATOR@REMOTE.INTEL"
                       value={receiverEmail}
                       onChange={e => setReceiverEmail(e.target.value)}
                       className="h-14 font-mono text-sm"
                     />
                  </div>
                  {createError && <p className="text-[11px] font-bold text-red-500 text-center m-0 bg-red-500/10 py-2 rounded-lg border border-red-500/20">{createError}</p>}
                  
                  <div className="flex gap-4">
                     <Button type="submit" className="flex-1 h-14 text-[13px]">
                        Establish Route
                     </Button>
                     <Button variant="secondary" type="button" onClick={() => setShowCreateChannel(false)} className="flex-1 h-14 text-[13px]">
                        Abort
                     </Button>
                  </div>
               </form>
            </Card>
        </div>
      )}
    </div>
  );
}
