import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, PauseCircle, RefreshCw, AlertTriangle, Lock } from 'lucide-react';

interface VoiceNoteProps {
    url: string;
    isMe: boolean;
    timestamp?: string;
}

export const VoiceNote = ({ url, isMe, timestamp }: VoiceNoteProps) => {
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
