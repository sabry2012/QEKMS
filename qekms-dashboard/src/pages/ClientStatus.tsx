import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { ShieldAlert, Search, CheckCircle2, Clock, XCircle, CreditCard, ArrowLeft, Terminal, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-mesh-dark text-white relative overflow-hidden flex flex-col items-center py-20 font-sans">
      
      {/* Background aesthetics */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-cyan/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full px-6 md:px-8 lg:px-12 relative z-10">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-3 text-primary-cyan text-xs font-bold hover:text-white transition-all transform hover:-translate-x-1 mb-12">
            <ArrowLeft className="w-4 h-4"/> Return to Intelligence Core
          </Link>

          {isNewlySubmitted && !error && (
            <Card className="p-5 flex items-center gap-4 border-emerald-500/30 bg-emerald-500/5 text-emerald-500 mb-10">
               <CheckCircle2 className="w-6 h-6 shrink-0" />
               <p className="text-sm font-bold leading-relaxed m-0 text-emerald-400">Transmission captured. Review provisioning parameters below.</p>
            </Card>
          )}

          <div className="flex flex-col md:flex-row gap-8 mb-12 items-end justify-between border-b border-white/5 pb-12">
            <div className="max-w-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-mesh-gradient rounded-xl flex items-center justify-center">
                   <ShieldAlert size={26} className="text-white" />
                </div>
                <h1 className="text-3xl font-black text-white m-0">Status Oracle</h1>
              </div>
              <p className="text-[13px] text-gray-400 font-medium leading-relaxed m-0 mt-2">
                Verify your organizational clearance and node deployment status via the registered business locator.
              </p>
            </div>
            
            <form onSubmit={handleSearch} className="flex gap-3 w-full md:w-auto items-center">
              <Input 
                type="email" 
                icon={Search}
                required 
                placeholder="LOCATOR@MESH.INTEL"
                value={emailInput} 
                onChange={e => setEmailInput(e.target.value)}
                className="w-full md:w-[320px]"
              />
              <Button type="submit" isLoading={loading} className="px-5">
                Query
              </Button>
            </form>
          </div>

          {error && (
            <Card className="p-12 text-center border-red-500/30 bg-red-500/5">
              <XCircle className="w-16 h-16 text-red-500 mb-6 mx-auto" />
              <h3 className="text-xl font-bold text-white mb-2">Locator Failure</h3>
              <p className="text-red-400 text-sm font-medium max-w-xs mx-auto mb-0">{error}</p>
            </Card>
          )}

          {statusData && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* High level status banner */}
              <Card className={`p-8 border-l-[6px] transition-all ${
                statusData.status === 'approved' ? 'border-l-emerald-500 border-y-emerald-500/20 border-r-emerald-500/20 bg-emerald-500/5' : 
                statusData.status === 'rejected' ? 'border-l-red-500 border-y-red-500/20 border-r-red-500/20 bg-red-500/5' : 
                'border-l-amber-500 border-y-amber-500/20 border-r-amber-500/20 bg-amber-500/5'
              }`}>
                <div className="flex items-center gap-6">
                  <div className={`p-5 rounded-xl shrink-0 ${ 
                    statusData.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 
                    statusData.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 
                    'bg-amber-500/10 text-amber-500' 
                  }`}>
                    {statusData.status === 'approved' ? <CheckCircle2 size={36} /> :
                     statusData.status === 'rejected' ? <XCircle size={36} /> :
                     <Clock size={36} />}
                  </div>
                   
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Node Clearance State</span>
                    <h2 className="text-4xl font-black text-white mt-1 capitalize m-0">
                      {statusData.status}
                    </h2>
                  </div>
                </div>
              </Card>

              {/* Specific result cards */}
              {statusData.status === 'approved' && (
                <Card className="p-10 text-center border-double border-4 border-emerald-500/30 bg-emerald-500/5 shadow-mesh-glow">
                   <Terminal className="w-16 h-16 text-emerald-500 mb-8 mx-auto" />
                   <h3 className="text-2xl font-black text-white mb-4">Inbound Matrix Provisioned</h3>
                   <p className="text-gray-400 text-[15px] font-medium mb-10 max-w-sm mx-auto leading-relaxed">
                     The administration team has mapped your credentials. Post-quantum AES-GCM pathways have been initialized on your dedicated node.
                   </p>
                   <Link to="/login" className="inline-flex items-center gap-3 bg-mesh-gradient hover:opacity-90 text-white font-extrabold py-4 rounded-xl transition-all h-14 px-12 justify-center group">
                     ACCESS QUANTUM CORE <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                   </Link>
                </Card>
              )}

              {statusData.status === 'rejected' && (
                <Card className="p-8 text-center border-red-500/30 bg-red-500/5">
                   <h3 className="text-red-400 text-xs uppercase tracking-widest font-bold mb-6 m-0">Denial Parameter:</h3>
                   <div className="p-8 bg-black/40 rounded-xl border border-red-500/20 text-left relative group">
                      <div className="absolute top-4 right-4 opacity-20"><ShieldAlert size={20} className="text-red-500" /></div>
                      <p className="text-red-300 font-mono text-sm leading-relaxed m-0">
                        {statusData.rejection_reason || "NO EXPLICIT CRYPTOGRAPHIC OVERRIDE REASONING DETECTED. OPERATIONS CENTER DECLINED DEPLOYMENT INVENTORY."}
                      </p>
                   </div>
                </Card>
              )}

              {statusData.status === 'pending' && (
                <Card className="overflow-hidden p-0 border-white/10">
                  <div className="bg-white/5 border-b border-white/10 px-8 py-5 flex items-center justify-between">
                    <div className="text-xs font-bold text-white flex items-center gap-3 uppercase tracking-widest">
                      <CreditCard size={14} className="text-primary-cyan" />
                      Ledger Validation Required
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest font-extrabold px-3 py-1.5 rounded-lg border ${
                      statusData.payment_status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-primary-cyan/10 text-primary-cyan border-primary-cyan/30'
                    }`}>
                      {statusData.payment_status}
                    </div>
                  </div>
                  
                  <div className="p-10">
                    {statusData.payment_status === 'paid' ? (
                      <div className="text-center py-10 space-y-6">
                         <div className="w-20 h-20 bg-emerald-500/10 mx-auto rounded-[2rem] flex items-center justify-center border border-emerald-500/30">
                            <CheckCircle2 size={32} className="text-emerald-500" />
                         </div>
                         <div className="space-y-2">
                           <h3 className="text-2xl font-black text-white m-0">Capital Cleared</h3>
                           <p className="text-gray-400 text-sm font-medium leading-relaxed m-0">Capital transmission verified. Awaiting executive node clearance.</p>
                         </div>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <p className="text-gray-400 text-[15px] font-medium leading-relaxed m-0">
                          To activate the <strong className="text-white capitalize">{statusData.plan}</strong> tier collectively, manual ledger validation is required. Execute transfer to the operational vault below.
                        </p>

                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="bg-black/30 border border-white/10 p-6 rounded-xl hover:border-primary-cyan/50 transition-colors">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">Operational SWIFT Vault</div>
                            <div className="font-mono text-[15px] font-bold text-primary-cyan mb-4 break-all">CH-8800-QEKMS-BANK-54</div>
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">QEKMS SECURITY HOLDING LLC</div>
                          </div>

                          <div className="bg-black/30 border border-white/10 p-6 rounded-xl hover:border-emerald-500/50 transition-colors">
                            <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-3">USDT (TRC20) Vault Target</div>
                            <div className="font-mono text-[15px] font-bold text-emerald-400 mb-4 break-all">TEz1c3u9YVb...Xp9Qekms</div>
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">DECENTRALIZED CLEARING // TRON</div>
                          </div>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-xl flex items-start gap-4">
                          <Clock size={20} className="text-amber-500 mt-1 shrink-0" />
                          <div className="text-sm font-medium text-amber-500/80 leading-relaxed">
                            <strong className="text-amber-500 block mb-1">Administrative Evaluation:</strong> 
                            Monitoring ledger for capital influx. Clearance will be issued automatically upon blockchain verification.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
