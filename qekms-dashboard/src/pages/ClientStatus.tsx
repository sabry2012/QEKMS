import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { Shield, ShieldAlert, Search, CheckCircle2, Clock, XCircle, CreditCard, ArrowLeft, Terminal, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

interface StatusResponse {
  exists: boolean;
  status: 'pending' | 'approved' | 'rejected';
  payment_status: 'pending' | 'paid';
  plan: string;
  rejection_reason?: string;
}

export default function ClientStatus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [emailInput, setEmailInput] = useState(searchParams.get('email') || '');
  
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isNewlySubmitted = searchParams.get('newly_submitted') === 'true';

  useEffect(() => {
    // Auto query if email is present in URL (e.g., coming from request access form)
    if (emailInput && isNewlySubmitted) {
      handleSearch();
    }
  }, []);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim()) return;

    setLoading(true);
    setError('');
    setStatusData(null);
    
    // Update URL quietly so user can bookmark it
    setSearchParams({ email: emailInput.trim() });

    try {
      const { data } = await api.get(`/client/status/${encodeURIComponent(emailInput.trim())}`);
      setStatusData(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No active request or account was found under this email.');
      } else {
        setError('An error occurred querying your status.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 flex gap-12 items-center justify-center h-full py-8">
        
        {/* ── Left: Main Status Card ── */}
        <div className="flex-1 max-w-3xl bg-white/[0.02] border border-white/5 rounded-3xl p-10 backdrop-blur-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          <div className="shrink-0">
            <Link to="/" className="inline-flex items-center gap-2 text-[10px] font-black tracking-widest text-primary-cyan hover:text-white transition-all uppercase mb-8">
              <ArrowLeft className="w-3.5 h-3.5"/> Return to Intelligence Core
            </Link>

            <div className="mb-10">
              <p className="text-[10px] font-bold tracking-[0.3em] text-primary-cyan mb-3 uppercase">Deployment Ledger</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] mb-5">
                <span className="text-white block">Status Oracle</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  Locator Audit.
                </span>
              </h1>
              <p className="text-gray-500 font-medium m-0 border-l-2 border-primary-cyan/20 pl-4 text-xs max-w-md">Verify organization clearance and node deployment status via the registered business locator.</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-3 mb-10">
              <Input 
                type="email" 
                icon={Search}
                required 
                placeholder="LOCATOR@MESH.INTEL"
                value={emailInput} 
                onChange={e => setEmailInput(e.target.value)}
                className="flex-1 h-14 bg-black/20"
              />
              <Button type="submit" isLoading={loading} className="h-14 px-10 shadow-mesh-glow text-xs font-black uppercase tracking-widest whitespace-nowrap">
                Query Access
              </Button>
            </form>
          </div>

          {/* Results Area (Scrollable if very long) */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
            {error && (
              <div className="p-8 text-center bg-red-500/5 border border-red-500/10 rounded-2xl animate-in fade-in zoom-in duration-300">
                <XCircle className="w-12 h-12 text-red-500 mb-4 mx-auto" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Locator Failure</h3>
                <p className="text-red-400/80 text-xs font-bold mb-0">{error}</p>
              </div>
            )}

            {isNewlySubmitted && !statusData && !error && (
               <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-4 animate-in slide-in-from-top-2">
                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                 <p className="text-[11px] font-bold text-emerald-400 m-0">Transmission captured. Monitoring ledger for provisioning parameters...</p>
               </div>
            )}

            {statusData && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* State Card */}
                <div className={`p-8 rounded-2xl border transition-all flex items-center justify-between ${
                  statusData.status === 'approved' ? 'border-emerald-500/30 bg-emerald-500/5' : 
                  statusData.status === 'rejected' ? 'border-red-500/30 bg-red-500/5' : 
                  'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-xl ${ 
                      statusData.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                      statusData.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                      'bg-amber-500/10 text-amber-500' 
                    }`}>
                      {statusData.status === 'approved' ? <CheckCircle2 size={32} /> :
                       statusData.status === 'rejected' ? <XCircle size={32} /> :
                       <Clock size={32} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest m-0">Node Clearance State</p>
                      <h2 className="text-3xl font-black text-white mt-1 capitalize m-0">{statusData.status}</h2>
                    </div>
                  </div>
                  
                  {statusData.status === 'pending' && (
                     <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${
                        statusData.payment_status === 'paid' 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                          : 'border-primary-cyan/30 bg-primary-cyan/10 text-primary-cyan'
                     }`}>
                        {statusData.payment_status} Ledger
                     </div>
                  )}
                </div>

                {/* Outcome Components */}
                {statusData.status === 'approved' && (
                  <div className="p-10 text-center border-double border-4 border-emerald-500/20 bg-emerald-500/5 rounded-3xl shadow-mesh-glow">
                     <Terminal className="w-14 h-14 text-emerald-500 mb-6 mx-auto" />
                     <h3 className="text-xl font-black text-white mb-3 uppercase tracking-tight">Connectivity Matrix Initialized</h3>
                     <p className="text-gray-500 text-xs font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                       AES-GCM pathways have been successfully mapped to your target node.
                     </p>
                     <Link to="/login" className="inline-flex items-center gap-3 bg-mesh-gradient hover:opacity-90 text-white font-black py-4 px-10 rounded-xl transition-all shadow-mesh-glow text-xs uppercase tracking-widest group">
                       Initialize Session <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                     </Link>
                  </div>
                )}

                {statusData.status === 'rejected' && (
                  <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
                     <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">Cryptographic Denial Log:</p>
                     <div className="p-5 bg-black/40 rounded-xl border border-white/5 font-mono text-xs text-red-300/80 leading-relaxed">
                        {statusData.rejection_reason || "DELETION COMMAND EXECUTED BY OPERATIONS CENTER. SECURITY INVENTORY UNAVAILABLE."}
                     </div>
                  </div>
                )}

                {statusData.status === 'pending' && statusData.payment_status === 'pending' && (
                  <div className="space-y-6">
                    <p className="text-gray-500 text-[11px] font-bold leading-relaxed m-0 border-l-2 border-primary-cyan/20 pl-4">
                      Capital transmission required to activate the <strong className="text-white uppercase">{statusData.plan}</strong> node tier.
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-black/30 border border-white/5 p-5 rounded-2xl hover:border-primary-cyan/30 transition-colors group">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600 mb-2 group-hover:text-primary-cyan transition-colors">Operational SWIFT Vault</p>
                        <p className="font-mono text-[13px] font-bold text-white break-all mb-1">CH-8800-QEKMS-BANK-54</p>
                        <p className="text-[9px] font-bold text-gray-700 uppercase">QEKMS SECURITY HOLDING LLC</p>
                      </div>

                      <div className="bg-black/30 border border-white/5 p-5 rounded-2xl hover:border-emerald-500/30 transition-colors group">
                        <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gray-600 mb-2 group-hover:text-emerald-400 transition-colors">USDT (TRC20) Target</p>
                        <p className="font-mono text-[13px] font-bold text-white break-all mb-1">TEz1c3u9YVb...Xp9Qekms</p>
                        <p className="text-[9px] font-bold text-gray-700 uppercase tracking-widest">DECENTRALIZED CLEARING</p>
                      </div>
                    </div>
                  </div>
                )}

                {statusData.status === 'pending' && statusData.payment_status === 'paid' && (
                  <div className="p-8 text-center bg-emerald-500/5 border border-emerald-500/10 rounded-3xl">
                     <div className="w-16 h-16 bg-emerald-500/10 mx-auto rounded-3xl flex items-center justify-center border border-emerald-500/20 mb-6">
                        <CheckCircle2 size={32} className="text-emerald-500 shadow-mesh-glow" />
                     </div>
                     <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Capital Cleared</h3>
                     <p className="text-gray-500 text-xs font-bold leading-relaxed m-0">Vault handshake verified. Awaiting administrative node clearance.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Side Info Panel (Matched to Login/Register) ── */}
        <div className="hidden lg:flex flex-col gap-8 max-w-xs shrink-0 h-full justify-center">
            <h3 className="text-xs font-black text-primary-cyan uppercase tracking-[0.3em] mb-2">System Integrity</h3>
            <div className="space-y-8">
              {[
                { step: '01', title: 'Search', desc: 'Queries organizational deployment records.' },
                { step: '02', title: 'Verify', desc: 'Automated cryptographic ledger validation.' },
                { step: '03', title: 'Connect', desc: 'Secure landing on the isolated terminal.' },
              ].map(s => (
                <div key={s.step} className="flex gap-5">
                  <span className="text-[10px] font-black text-gray-700 shrink-0 border border-white/10 w-8 h-8 flex items-center justify-center rounded-xl mt-0.5 bg-white/[0.02]">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-white mb-1 uppercase tracking-widest">{s.title}</p>
                    <p className="text-[10px] text-gray-700 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-10 border-t border-white/5 space-y-4">
               <div className="flex items-center gap-3 opacity-30">
                  <Terminal size={16} className="text-white" />
                  <span className="text-[10px] font-black text-white tracking-[0.3em] uppercase">Status Protocol v4.0</span>
               </div>
               <p className="text-[10px] text-gray-800 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Shield size={10} /> Authorized Access Only
               </p>
            </div>
        </div>
      </div>
    </div>
  );
}
