import { useEffect, useState, useCallback, useRef } from 'react';
import { Activity, KeyRound, RefreshCw, Cpu, Zap, Radio, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axiosConfig';
import { InlineLoader } from '../components/InlineLoader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface EntropyResult {
  source: string;
  bit_length: number;
  ones: number;
  zeros: number;
  ones_ratio: number;
  n_qubits: number;
  checked_at: string;
}

interface QuantumStatus {
  last_entropy_result: EntropyResult | null;
  passed: boolean | null;
  generated_keys: number;
}

const emptyStatus: QuantumStatus = {
  last_entropy_result: null,
  passed: null,
  generated_keys: 0,
};

export default function QuantumDashboard() {
  const [status, setStatus] = useState<QuantumStatus>(emptyStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadStatus = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError('');
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const { data } = await api.get<QuantumStatus>('/system/quantum-status', {
        signal: abortControllerRef.current.signal
      });
      setStatus(data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setError(err.response?.data?.detail || 'Quantum telemetry synchronization failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadStatus]);

  const entropy = status.last_entropy_result;
  const isPass = status.passed === true;
  const isFail = status.passed === false;
  const ratioPercent = entropy ? Math.round(entropy.ones_ratio * 100) : 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
         <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Quantum Telemetry</h1>
            <p className="text-sm text-gray-500 font-medium leading-relaxed m-0">Real-time entropic vitality and node synchronization mapping within the quantum-secured mesh network.</p>
         </div>
         <Button
            onClick={() => loadStatus()}
            isLoading={loading}
            className="h-[52px] shrink-0 font-bold"
         >
            {!loading && <RefreshCw size={18} />}
            SYNC MESH TELEMETRY
         </Button>
      </div>

      {error && !loading && (
        <ErrorState message={error} onRetry={() => loadStatus()} />
      )}

      {loading && !status.last_entropy_result ? (
        <Card className="px-6 py-32 flex justify-center items-center overflow-hidden relative shadow-inner">
          <InlineLoader message="Synchronizing High-Entropy Nodes..." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Main Status Hero */}
          <section className={`md:col-span-2 lg:col-span-3 border border-white/10 rounded-2xl p-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-12 border-l-[6px] bg-mesh-dark ${isPass ? 'border-l-emerald-500 bg-emerald-500/5' : isFail ? 'border-l-red-500 bg-red-500/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
             <div className="flex flex-col gap-2 relative z-10 text-center md:text-left">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Global Entropy Vitality</span>
                <h2 className={`text-6xl md:text-8xl font-black leading-none m-0 ${isPass ? 'text-emerald-500' : isFail ? 'text-red-500' : 'text-white'}`}>
                   {isPass ? 'OPERATIONAL' : isFail ? 'VIOLATION' : 'INITIALIZING'}
                </h2>
                <div className="flex items-center gap-2 mt-4 justify-center md:justify-start">
                   {isPass ? <CheckCircle className="text-emerald-500" size={16} /> : isFail ? <XCircle className="text-red-500" size={16} /> : <Activity className="text-amber-500" size={16} />}
                   <span className="text-xs font-bold text-gray-500 tracking-wide uppercase">Last Scan: {new Date(entropy?.checked_at || Date.now()).toLocaleTimeString()}</span>
                </div>
             </div>

             <div className="flex flex-col items-center md:items-end gap-2 relative z-10">
                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Generated Secure Keys</span>
                <p className="text-7xl font-black text-white leading-none m-0">{status.generated_keys}</p>
                <div className={`h-1.5 w-24 mt-2 md:mr-2 rounded-full ${isPass ? 'bg-emerald-500' : isFail ? 'bg-red-500' : 'bg-amber-500'}`} />
             </div>
             
             <div className={`absolute right-0 top-0 w-1/3 h-full pointer-events-none bg-gradient-to-l to-transparent ${isPass ? 'from-emerald-500/10' : isFail ? 'from-red-500/10' : 'from-amber-500/10'}`} />
          </section>

          {/* Metrics Grid */}
          <Card className="px-6 py-6 pb-2.5 relative flex flex-col justify-between overflow-hidden">
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 flex items-center justify-center bg-primary-cyan/10 rounded-xl text-primary-cyan border border-primary-cyan/30"><Zap size={22} /></div>
                   <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-[6px] uppercase tracking-widest">High Density</span>
                </div>
                <div>
                   <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Equilibrium Index</p>
                   <h3 className="text-4xl font-extrabold text-white m-0">{entropy ? `${ratioPercent}% Ones` : 'No Sample'}</h3>
                </div>
             </div>
             <div className="mt-8 relative z-10 mb-5">
                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                   <div 
                      className={`h-full transition-all duration-1000 ease-out shadow-mesh-glow rounded-full ${isFail ? 'bg-red-500' : 'bg-primary-cyan'}`} 
                      style={{ width: `${ratioPercent}%` }} 
                   />
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-cyan/20 rounded-full blur-3xl pointer-events-none" />
          </Card>

          <Card className="px-6 py-6 relative flex flex-col justify-between overflow-hidden">
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 flex items-center justify-center bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/30"><Radio size={22} /></div>
                   <span className="text-[10px] font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 px-2 py-1 rounded-[6px] uppercase tracking-widest">{entropy?.bit_length ?? 0} Bits</span>
                </div>
                <div>
                   <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Entropic Payload</p>
                   <h3 className="text-4xl font-extrabold text-white truncate m-0">{entropy?.source || 'Disconnected'}</h3>
                </div>
             </div>
             <div className="mt-8 flex items-center gap-5 relative z-10">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">H-Bits</span>
                   <span className="text-sm font-extrabold text-white mt-1">{entropy?.ones ?? 0}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">L-Bits</span>
                   <span className="text-sm font-extrabold text-white mt-1">{entropy?.zeros ?? 0}</span>
                </div>
             </div>
             <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
          </Card>

          <Card className="px-6 py-6 relative flex flex-col justify-between overflow-hidden border-primary-cyan/30 bg-primary-cyan/5 shadow-[0_0_30px_rgba(6,182,212,0.05)] md:col-span-2 lg:col-span-1">
             <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                   <div className="w-12 h-12 flex items-center justify-center bg-mesh-gradient rounded-xl text-white shadow-mesh-glow"><Cpu size={22} /></div>
                   <span className="text-[10px] font-bold text-primary-cyan bg-primary-cyan/20 border border-primary-cyan/40 px-2 py-1 rounded-[6px] uppercase tracking-widest">{entropy?.n_qubits ?? 0} Qubits</span>
                </div>
                <div>
                   <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Hardware Interface</p>
                   <h3 className="text-4xl font-extrabold text-white m-0">Isolated</h3>
                </div>
             </div>
             <p className="mt-8 mb-2 text-[11px] font-bold text-primary-cyan flex items-center gap-2 uppercase tracking-widest relative z-10">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-cyan animate-pulse shadow-[0_0_8px_cyan]" /> 
                System Neutrality: Verified
             </p>
             <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary-cyan/10 rounded-full blur-3xl pointer-events-none" />
          </Card>

          {/* Payload Inspection */}
          <section className="lg:col-span-3 space-y-4 mt-4">
             <div className="flex items-center gap-3 px-2">
                <KeyRound size={20} className="text-primary-cyan" />
                <h3 className="text-[13px] font-extrabold uppercase tracking-widest text-white m-0">Full Intelligence Telemetry</h3>
             </div>
             <Card className="p-0 overflow-hidden font-mono text-[13px] text-gray-400 bg-black/40">
                <pre className="p-8 m-0 leading-relaxed overflow-x-auto no-scrollbar whitespace-pre-wrap">
                   {JSON.stringify(entropy ?? { message: 'Zero samples identified in active ledger' }, null, 3)}
                </pre>
             </Card>
          </section>

        </div>
      )}
    </div>
  );
}
