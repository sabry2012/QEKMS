import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw, Layers, Clock, Globe } from 'lucide-react';
import api from '../api/axiosConfig';
import { InlineLoader } from '../components/InlineLoader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CryptoVisualizerModal } from '../components/CryptoVisualizerModal';

interface AuditLog {
  id?: string;
  event: string;
  user_id?: string | null;
  details?: Record<string, unknown>;
  timestamp: string;
}

export default function AuditLogsDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleOpenVisualizer = (log: AuditLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const loadLogs = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const { data } = await api.get<AuditLog[]>('/system/audit-logs', {
        signal: abortControllerRef.current.signal
      });
      setLogs(data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err.response?.data?.detail || 'Security ledger synchronization failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadLogs]);

  const formatTimestamp = (value: string) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
         <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Operator Ledger</h1>
            <p className="text-sm text-gray-400 font-medium leading-relaxed m-0">
              Synchronized immutable record of all mesh handshakes, node transmissions, and cryptographic signatures within the collective sovereign intelligence framework.
            </p>
         </div>
         <Button
            onClick={() => loadLogs()}
            isLoading={loading}
            className="h-[52px] shrink-0 font-bold"
         >
            {!loading && <RefreshCw size={18} />}
            SYNC LEDGER
         </Button>
      </div>

      {error && !loading && (
        <ErrorState message={error} onRetry={() => loadLogs()} />
      )}

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="px-6 py-6 flex items-center gap-6 group hover:border-emerald-500/30 transition-colors">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Layers size={26} />
            </div>
            <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 m-0">Total Transactions</p>
               <h3 className="text-3xl font-extrabold text-white m-0">{logs.length}</h3>
            </div>
         </Card>
         <Card className="px-6 py-6 flex items-center gap-6 group hover:border-primary-cyan/30 transition-colors">
            <div className="w-14 h-14 bg-primary-cyan/10 rounded-xl text-primary-cyan border border-primary-cyan/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Globe size={26} />
            </div>
            <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 m-0">Nodes Active</p>
               <h3 className="text-3xl font-extrabold text-white m-0">
                  {new Set(logs.map(l => l.user_id)).size}
               </h3>
            </div>
         </Card>
         <Card className="px-6 py-6 flex items-center gap-6 group hover:border-purple-500/30 transition-colors">
            <div className="w-14 h-14 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
               <Clock size={26} />
            </div>
            <div>
               <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 m-0">Last Signature</p>
               <h3 className="text-2xl font-extrabold text-white m-0">
                  {logs.length > 0 ? new Date(logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting'}
               </h3>
            </div>
         </Card>
      </div>

      {/* Main Ledger Table */}
      <Card className="p-0 overflow-hidden relative">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-bold text-gray-500">Event Signature</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-gray-500">Operator Identity</th>
                <th className="px-6 py-5 text-[11px] uppercase tracking-widest font-bold text-gray-500">Epoch Timestamp</th>
                <th className="px-8 py-5 text-[11px] uppercase tracking-widest font-bold text-right text-gray-500">Payload Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center relative overflow-hidden">
                    <div className="absolute inset-0" />
                    <InlineLoader message="Decrypting Historical Ledger Fragments..." />
                  </td>
                </tr>
              ) : logs.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-gray-600 font-bold opacity-30 text-sm">
                     No mesh handshakes recorded in active ledger.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const eventName = String(log.event || (log as any).event_type || (log as any).type || '').toUpperCase().trim();
                  return (
                  <tr key={log.id || `${eventName}-${index}`} className="hover:bg-white/[0.03] transition-all group align-top">
                    <td className="px-8 py-6">
                       <span className="inline-flex items-center gap-2 bg-mesh-gradient text-white px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transform group-hover:-translate-y-0.5 transition-all shadow-mesh-glow/50">
                          {eventName}
                       </span>
                    </td>
                    <td className="px-6 py-6 pt-7">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${log.user_id ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-primary-cyan shadow-[0_0_8px_rgba(6,182,212,0.5)]'}`} />
                          <span className="text-xs font-bold text-white">{log.user_id || 'MESH_INTERNAL'}</span>
                       </div>
                    </td>
                    <td className="px-6 py-6 pt-7 text-xs font-bold text-gray-500">
                       {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex justify-end w-full">
                          <pre className="bg-black/40 border border-white/10 rounded-xl p-5 text-[11px] text-gray-400 font-mono leading-relaxed w-full max-w-3xl whitespace-pre-wrap break-all group-hover:border-primary-cyan/30 transition-all shadow-inner no-scrollbar">
                             {JSON.stringify(log.details || {}, null, 3)}
                          </pre>
                       </div>
                       {(eventName === 'MESSAGE_SENT' || eventName === 'KEY_GENERATED') && (
                          <div className="flex justify-end mt-4">
                            <Button onClick={() => { console.log('Opening modal for log:', log); handleOpenVisualizer(log); }} className="h-8 text-xs font-bold px-4">
                              {eventName === 'MESSAGE_SENT' ? 'Analyze Cryptographic Flow' : 'Analyze Quantum Entropy'}
                            </Button>
                          </div>
                       )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        
        {/* Subtle decorative elements */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      </Card>

      <footer className="text-center py-6 opacity-30 pointer-events-none">
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-white m-0">
             Sovereign Ledger Ops // Cryptographically Signed & Immutable
          </p>
      </footer>
      <CryptoVisualizerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        log={selectedLog} 
      />
    </div>
  );
}
