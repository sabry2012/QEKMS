import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Send, ShieldIcon, Lock, Scan, Key,
  UserCircle, Search, Plus, RefreshCw,
  Cpu, Zap, Fingerprint, Globe, AlertTriangle,
  Paperclip, Mic, StopCircle, FileText, X, Download, Play,
  ChevronLeft, Radio, SendHorizonal, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { securityService } from '../api/SecurityService';
import { InlineLoader } from '../components/InlineLoader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { PlayCircle, PauseCircle } from 'lucide-react';

// ── Components ───────────────────────────────────────────────────────
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
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    hasError ? 'bg-red-500/20 text-red-500' : isMe ? 'bg-white/20 text-white' : 'bg-primary-cyan/20 text-primary-cyan'
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

                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest tabular-nums tabular-nums">
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

// ── Types ────────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  created_at?: string;
  type?: 'text' | 'image' | 'video' | 'voice' | 'file';
  file_path?: string;
  file_name?: string;
}

interface PendingMedia {
  file: File;
  objectUrl: string | null;
  msgType: 'image' | 'video' | 'voice' | 'file';
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
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, { status: 'online' | 'offline' | 'deleted' | 'inactive', last_seen?: string }>>({});
  const [receiverEmail, setReceiverEmail] = useState('');
  const [createError, setCreateError] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  // Limits
  const PLAN_LIMITS: any = { free: 5, professional: 50, enterprise: Infinity };
  const currentLimit = PLAN_LIMITS[user?.plan || 'free'] || 5;
  const totalCreated = user?.channels_created_total || channels.length;
  const isAtLimit = currentLimit !== Infinity && totalCreated >= currentLimit;

  // Media state
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Refs
  const channelAbortController = useRef<AbortController | null>(null);
  const messageAbortController = useRef<AbortController | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Seed presence state from initial channel list
      const initialPresence: Record<string, any> = {};
      data.forEach((ch: any) => {
          if (ch.other_presence) {
              const other = ch.sender === user?.email ? ch.receiver : ch.sender;
              initialPresence[other] = ch.other_presence;
          }
      });
      setPresence(prev => ({ ...initialPresence, ...prev }));
    } catch (err: any) {
      if (err.name === 'CanceledError') return;
      setChannelError(err.response?.data?.detail || 'Failed to sync mesh nodes');
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  // ── 3. Load Messages ──────────────────────────────────────────────
  const loadInitialMessages = useCallback(async (channel: Channel) => {
    if (!isSecurityReady) {
      console.warn('[Dashboard] loadInitialMessages called before security was ready. Aborting.');
      setMessageError('Handshake failed: Security mismatch');
      return;
    }

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
      await securityService.loadChannelKey(channel.id, keyData.wrapped_key, version);
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
  }, [isSecurityReady]);

  // ── 4. WebSockets ──────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChannel || keyStatus !== 'ready') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const rawBackendUrl = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000';
    const cleanUrl = rawBackendUrl.replace(/^https?:\/\//, '');
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
        } else if (payload.type === 'presence') {
            setPresence(prev => ({
                ...prev,
                [payload.user]: { status: payload.status, last_seen: payload.last_seen }
            }));
        } else if (payload.type === 'messages_cleared') {
          if (activeChannel && payload.channel_id === activeChannel.id) {
            setMessages([]);
          }
        } else if (payload.type === 'unread_increment') {
            if (payload.user === user?.email && activeChannel?.id !== payload.channel_id) {
                setChannels(prev => prev.map(c => c.id === payload.channel_id ? { ...c, unread_count: ((c as any).unread_count || 0) + 1 } : c));
            }
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

  // Auto-load messages if a channel was selected before the handshake finished
  useEffect(() => {
    if (isSecurityReady && activeChannel && keyStatus === 'idle') {
      loadInitialMessages(activeChannel);
    }
  }, [isSecurityReady, activeChannel, keyStatus, loadInitialMessages]);

  // ── 6. Media Helpers ──────────────────────────────────────────────
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
        setPendingMedia({
          file,
          objectUrl: URL.createObjectURL(audioBlob),
          msgType: 'voice'
        });
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[Dashboard] Recording failed:', err);
      setMessageError('Microphone access denied or error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // ── 7. Actions ────────────────────────────────────────────────────
  const handleSelectChannel = (channel: Channel) => {
    setActiveChannel(channel);
    setMobileView('chat');
    loadInitialMessages(channel);
    
    if ((channel as any).unread_count > 0) {
      api.post(`/channels/${channel.id}/read`).catch(console.error);
      setChannels(prev => prev.map(c => c.id === channel.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleClearChat = async (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isAdmin = user?.role === 'admin';
    const confirmMsg = isAdmin 
      ? 'WARNING: You are about to PERMANENTLY delete this chat history for ALL participants. Continue?' 
      : 'Clear chat history for your account? (This won\'t affect the other participant)';

    if (!window.confirm(confirmMsg)) return;

    try {
        if (isAdmin) {
          // Global Delete for Admin
          const { data } = await api.delete(`/channels/${channelId}/messages`);
          console.log(`[Dashboard] Admin Global Clear: ${data.deleted_count} messages deleted.`);
        } else {
          // Selective Clear for Client
          await api.post(`/channels/${channelId}/clear`);
          console.log(`[Dashboard] History cleared for user.`);
        }

        if (activeChannel?.id === channelId) {
            setMessages([]);
        }
    } catch (err: any) { 
        console.error("[Dashboard] Failed to clear history:", err);
        const detail = err.response?.data?.detail || "Protocol Interruption Detected";
        setMessageError(`FAILED: ${detail}`);
        setTimeout(() => setMessageError(''), 5000);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingMedia) || !activeChannel || keyStatus !== 'ready') return;

    setIsUploading(true);
    let fileMeta = null;

    try {
      // 1. Handle Media Upload if exists
      if (pendingMedia) {
        const formData = new FormData();
        formData.append('file', pendingMedia.file);
        const { data: uploadData } = await api.post(`/channels/${activeChannel.id}/upload`, formData);
        fileMeta = uploadData;
      }

      // 2. Prepare and Send Encrypted Message
      const content = newMessage.trim();
      const version = activeChannel.current_key_version || 1;
      
      const securePayload: any = await securityService.prepareOutgoing(content, activeChannel.id, version);
      
      if (fileMeta) {
        securePayload.msg_type = pendingMedia?.msgType || fileMeta.msg_type;
        securePayload.file_path = fileMeta.file_path;
        securePayload.file_name = fileMeta.file_name;
      }

      await api.post(`/channels/${activeChannel.id}/send`, securePayload);
      
      setNewMessage('');
      cancelPendingMedia();
    } catch (err) {
      console.error('[Dashboard] Send Failed:', err);
      setMessageError('Failed to send message or upload file');
    } finally {
      setIsUploading(false);
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
                        {totalCreated} / {currentLimit === Infinity ? '∞' : currentLimit}
                    </span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentLimit === Infinity ? 100 : (totalCreated / currentLimit) * 100}%` }}
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
                ) : (
                    filteredChannels.map(channel => {
                        const isActive = activeChannel?.id === channel.id;
                        const other = channel.sender === user?.email ? channel.receiver : channel.sender;
                        const peerStatus = presence[other]?.status;
                        
                        return (
                            <div
                                key={channel.id}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 group ${
                                    isActive 
                                        ? 'bg-primary-cyan/10 border-primary-cyan/30 text-white' 
                                        : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-gray-400'
                                }`}
                            >
                                <div 
                                    onClick={() => handleSelectChannel(channel)}
                                    className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                                >
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500 ${
                                        isActive ? 'bg-primary-cyan/20 border-primary-cyan/30 text-primary-cyan' : 'bg-black/30 border-white/10 text-gray-600 group-hover:text-gray-300'
                                    }`}>
                                        <Cpu size={20} className={isActive ? 'animate-pulse' : ''} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="text-[13px] font-black truncate uppercase tracking-tight flex items-center gap-2">
                                                {other.split('@')[0]}
                                                {peerStatus === 'deleted' && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[8px] uppercase tracking-widest line-through">DELETED</span>}
                                                {peerStatus === 'inactive' && <span className="px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[8px] uppercase tracking-widest">INACTIVE</span>}
                                            </span>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${
                                                channel.is_pending ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5'
                                            }`}>
                                                {channel.is_pending ? 'Sync' : 'Live'}
                                            </span>
                                        </div>
                                        <p className="m-0 text-[10px] text-gray-500 truncate font-mono">{other}</p>
                                    </div>
                                    {(channel as any).unread_count > 0 && !isActive && (
                                        <div className="shrink-0">
                                            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                                                {(channel as any).unread_count}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                
                                <button
                                    onClick={(e) => handleClearChat(channel.id, e)}
                                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 border-none cursor-pointer"
                                    title="Clear History"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        );
                    })
                )}
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
                                <h3 className="text-[17px] font-black text-white m-0 tracking-tight flex items-center gap-2">
                                    {(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender).split('@')[0]}
                                    {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.status === 'deleted' && (
                                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 text-[9px] uppercase tracking-widest">Deleted</span>
                                    )}
                                    {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.status === 'inactive' && (
                                        <span className="px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 text-[9px] uppercase tracking-widest">Inactive</span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.status === 'online' ? (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Online Now</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                                                {presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)]?.last_seen 
                                                   ? `Last seen ${new Date(presence[(activeChannel.sender === user?.email ? activeChannel.receiver : activeChannel.sender)].last_seen!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                                                   : 'Established P2P Link'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                                 {keyStatus === 'ready' ? (
                                    <div className="flex items-center gap-2">
                                        <Fingerprint size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Cipher Validated</span>
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-2">
                                        <RefreshCw size={16} className="animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Handshaking...</span>
                                    </div>
                                 )}
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
                                                <div className={`max-w-[80%] lg:max-w-[240px] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`rounded-xl shadow-lg transition-all overflow-hidden ${
                                                        isMe 
                                                            ? 'bg-blue-600 text-white rounded-tr-none' 
                                                            : 'bg-zinc-800 text-gray-200 rounded-tl-none'
                                                    }`}>
                                                        {/* Unified Media Renderer */}
                                                        {(() => {
                                                            const mediaUrl = msg.file_path?.startsWith('http') ? msg.file_path : `${(import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:8000'}/uploads/${msg.file_path}`;
                                                            switch (msg.type) {
                                                                case 'image':
                                                                    return (
                                                                        <div className="relative cursor-pointer hover:opacity-95 transition-opacity group/media" onClick={() => setPreviewImage(mediaUrl)}>
                                                                            <img src={mediaUrl} alt="attachment" className="w-full object-cover block" />
                                                                            {/* Overlay for image only (no caption) */}
                                                                            {(!msg.content || msg.content.trim() === "") && (
                                                                                <>
                                                                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                                                    <div className="absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-white">
                                                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        <Lock size={8} />
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                case 'video':
                                                                    // Fallback: If it's a recording but tagged as video by backend
                                                                    if (msg.file_path?.includes('recording-') || msg.file_path?.includes('rec-')) {
                                                                        return <VoiceNote url={mediaUrl} isMe={isMe} timestamp={msg.timestamp} />;
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
                                                                            {(!msg.content || msg.content.trim() === "") && (
                                                                                <>
                                                                                    <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                                                                                    <div className="absolute bottom-1.5 right-2 flex items-center gap-1 opacity-70 text-[9px] font-bold text-white">
                                                                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                        <Lock size={8} />
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                case 'voice':
                                                                    return <VoiceNote url={mediaUrl} isMe={isMe} timestamp={msg.timestamp} />;
                                                                case 'file':
                                                                    return (
                                                                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 no-underline text-inherit hover:opacity-80 transition-opacity">
                                                                            <div className={`p-1.5 rounded-lg ${isMe ? 'bg-blue-500' : 'bg-zinc-700'}`}>
                                                                                <FileText size={16} />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-[11px] font-black truncate m-0 uppercase tracking-tighter">{msg.file_name || 'FileAsset'}</p>
                                                                            </div>
                                                                            <Download size={14} className="opacity-40" />
                                                                        </a>
                                                                    );
                                                                default: return null;
                                                            }
                                                        })()}
                                                        
                                                        {/* Text Content - Only if exists */}
                                                        {msg.content && msg.content.trim() !== "" && (
                                                            <div className="px-3 py-2 relative bg-inherit">
                                                                <p className="m-0 text-[13px] leading-snug font-medium break-words">
                                                                    {msg.content}
                                                                </p>
                                                                <div className="flex items-center justify-end gap-1 opacity-30 text-[8px] font-black uppercase tracking-widest mt-1">
                                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    <Lock size={8} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {msg.type && msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'voice' && (
                                                        <div className="flex items-center gap-1.5 mt-1 px-1 opacity-30 text-[8px] font-black uppercase tracking-widest">
                                                            <Lock size={8} />
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-xl relative">
                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                            className="hidden" 
                        />

                        {/* Media Preview Overlay */}
                        <AnimatePresence>
                            {pendingMedia && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    className="absolute bottom-full left-6 right-6 mb-4 p-4 rounded-3xl bg-mesh-dark border border-white/10 shadow-2xl z-10"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center relative">
                                            {pendingMedia.msgType === 'image' && pendingMedia.objectUrl && (
                                                <img src={pendingMedia.objectUrl} alt="preview" className="w-full h-full object-cover" />
                                            )}
                                            {pendingMedia.msgType === 'video' && (
                                                <div className="text-primary-cyan"><Play size={24} /></div>
                                            )}
                                            {pendingMedia.msgType === 'voice' && (
                                                <div className="text-primary-cyan"><Mic size={24} /></div>
                                            )}
                                            {pendingMedia.msgType === 'file' && (
                                                <div className="text-primary-cyan"><FileText size={24} /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-white truncate uppercase tracking-tight">{pendingMedia.file.name}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{pendingMedia.msgType} Ready for encryption</p>
                                        </div>
                                        <button 
                                            onClick={cancelPendingMedia}
                                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all border-none cursor-pointer"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={sendMessage} className="flex gap-4 items-center">
                            {/* Attachment Button */}
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-primary-cyan hover:border-primary-cyan/30 transition-all cursor-pointer"
                            >
                                <Paperclip size={22} />
                            </button>

                            <div className="flex-1 relative group">
                                <Input 
                                    placeholder={isRecording ? 'RECORDING IN PROGRESS...' : "TRANSMIT SECURE PAYLOAD..."}
                                    icon={isRecording ? Radio : Zap}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    disabled={keyStatus !== 'ready' || isRecording || !!pendingMedia && pendingMedia.msgType === 'voice'}
                                    className={`h-14 bg-black/40 border-white/10 focus:bg-black/60 font-mono text-sm ${isRecording ? 'text-primary-cyan animate-pulse' : ''}`}
                                />
                                {isRecording && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                        <span className="text-[10px] font-black text-red-500 font-mono">
                                            {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Recording / Stop Button */}
                            {!isRecording ? (
                                <button 
                                    type="button"
                                    onClick={startRecording}
                                    disabled={keyStatus !== 'ready' || !!pendingMedia}
                                    className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-30"
                                >
                                    <Mic size={22} />
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    onClick={stopRecording}
                                    className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-500 animate-pulse cursor-pointer"
                                >
                                    <StopCircle size={22} />
                                </button>
                            )}

                            <Button 
                                type="submit"
                                disabled={(!newMessage.trim() && !pendingMedia) || keyStatus !== 'ready' || isRecording || isUploading}
                                className="w-14 h-14 p-0 shadow-mesh-glow rounded-2xl shrink-0"
                            >
                                {isUploading ? (
                                    <RefreshCw size={22} className="animate-spin" />
                                ) : (
                                    <Send size={22} className="ml-1" />
                                )}
                            </Button>
                        </form>
                    </div>
                </Card>
            )}
        </div>
      </div>


      {/* ── Modals & Overlays ── */}
      {showCreateChannel && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
              <Card className="w-full max-w-lg p-8 border-white/10 bg-mesh-dark shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setShowCreateChannel(false)} className="absolute top-6 right-6 p-2 text-gray-600 hover:text-white transition-colors bg-transparent border-none cursor-pointer">
                    <X size={20} />
                </button>
                
                <div className="mb-8">
                    <div className="w-16 h-16 rounded-[24px] bg-primary-cyan/10 border border-primary-cyan/20 flex items-center justify-center mb-6 text-primary-cyan">
                        <Plus size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight m-0">Establish Tunnel</h2>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 leading-relaxed">Input node identity for quantum-safe peer correlation.</p>
                </div>

                {!isAtLimit ? (
                    <form onSubmit={handleCreateChannel} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Recipient Email</label>
                            <Input 
                                placeholder="NODE::IDENTITY::EMAIL"
                                type="email"
                                value={receiverEmail}
                                onChange={e => setReceiverEmail(e.target.value)}
                                className="h-14 bg-black/40 border-white/10 text-sm font-mono focus:border-primary-cyan/50 focus:ring-4 focus:ring-primary-cyan/5"
                                required
                            />
                        </div>
                        
                        {createError && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                                <AlertTriangle size={14} className="inline mr-2 -mt-0.5" />
                                {createError}
                            </div>
                        )}

                        <div className="pt-2 flex gap-3">
                            <button 
                                type="submit" 
                                className="flex-1 h-14 rounded-2xl bg-mesh-gradient border border-primary-cyan/30 text-white font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-mesh-glow"
                            >
                                Initiate Mapping
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="pt-4 space-y-6 text-center">
                        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                            <AlertTriangle size={32} className="text-amber-500 mx-auto" />
                            <h4 className="text-lg font-black text-white tracking-tight m-0">Quota Reached</h4>
                            <p className="text-xs text-gray-400 leading-relaxed m-0 italic">
                                Your <span className="text-amber-500 font-bold uppercase">{user?.plan || 'Free'}</span> plan is currently restricted to {currentLimit} mesh nodes. Access to further mappings requires a higher clearance level.
                            </p>
                        </div>
                        <Button 
                            onClick={() => window.location.href = '/upgrade'}
                            className="w-full h-14 bg-amber-500 text-black hover:bg-white transition-all font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-500/20"
                        >
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

      {/* ── Image Lightbox ── */}
      {previewImage && (
          <div className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
              <button className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white border-none cursor-pointer">
                  <X size={24} />
              </button>
              <img src={previewImage} alt="preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95" onClick={e => e.stopPropagation()} />
          </div>
      )}
    </div>
  );
}
