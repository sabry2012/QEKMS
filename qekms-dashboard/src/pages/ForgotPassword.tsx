import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowLeft, Mail, CheckCircle2, ChevronRight, Loader2, Send } from 'lucide-react';
import api from '../api/axiosConfig';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Note: Backend endpoint for initiating reset needs to exist
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Handshake failed. Email record not found in mesh.');
      // For security, some platforms always show success, but here we'll be direct.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg mx-auto px-8">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-mesh-gradient opacity-50" />
          
          <Link to="/login" className="inline-flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-primary-cyan transition-all mb-8 uppercase tracking-[0.2em]">
            <ArrowLeft size={14} /> Back to Gateway
          </Link>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl font-black tracking-tight mb-3">Key Recovery</h1>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    Initiate a cryptographically secured link to rotate your master cipher.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identity Locator</label>
                    <Input
                      type="email"
                      icon={Mail}
                      required
                      placeholder="operator@mesh.intel"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="bg-black/20 border-white/10 h-14"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-14 text-[12px] font-black uppercase tracking-[0.2em] shadow-mesh-glow shadow-primary-cyan/10"
                    isLoading={loading}
                  >
                    Transmit Link <Send size={16} className="ml-2" />
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-20 h-20 bg-emerald-500/10 mx-auto rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white mb-2">Transmission Sent</h2>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                    If an identity exists for <span className="text-white font-bold">{email}</span>, a secure recovery sequence has been dispatched.
                  </p>
                </div>
                <div className="pt-4">
                    <Link to="/login">
                        <Button variant="secondary" className="w-full h-12 text-[11px] font-bold uppercase tracking-widest">
                            Return to Connection
                        </Button>
                    </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-[10px] text-gray-600 mt-10 uppercase tracking-[0.3em] font-medium">
          QEKMS · SECURE RECOVERY PROTOCOL · PERSISTENCE ID: {Math.random().toString(36).substring(7).toUpperCase()}
        </p>
      </div>
    </div>
  );
}
