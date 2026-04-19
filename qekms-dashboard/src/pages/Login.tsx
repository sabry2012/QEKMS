import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'account' | 'admin'>('account');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/login', { email, password, role });
      await login();
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Access Denied.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-8 flex gap-12 items-center justify-center h-full py-8">
        {/* ── Left: Main Login Card ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex-1 max-w-2xl bg-white/[0.02] border border-white/5 rounded-3xl p-10 backdrop-blur-3xl overflow-hidden shadow-2xl"
        >
          <div className="mb-8">
            <p className="text-[10px] font-bold tracking-[0.3em] text-primary-cyan mb-3 uppercase">Secure Authentication</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[1.1] mb-5">
              <span className="text-white block">Quantum Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Authentication.
              </span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Split Roles Grid */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`p-4 rounded-2xl transition-all duration-300 border flex flex-col items-center justify-center gap-2 ${role === 'admin'
                  ? 'border-primary-cyan/40 bg-primary-cyan/10 shadow-mesh-glow'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${role === 'admin' ? 'text-primary-cyan' : 'text-gray-500'}`}>Overseer</span>
                {role === 'admin' && <div className="w-1 h-1 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />}
              </button>
              <button
                type="button"
                onClick={() => setRole('account')}
                className={`p-4 rounded-2xl transition-all duration-300 border flex flex-col items-center justify-center gap-2 ${role === 'account'
                  ? 'border-primary-cyan/40 bg-primary-cyan/10 shadow-mesh-glow'
                  : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.05]'
                  }`}
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${role === 'account' ? 'text-primary-cyan' : 'text-gray-500'}`}>Operator</span>
                {role === 'account' && <div className="w-1 h-1 rounded-full bg-primary-cyan shadow-[0_0_8px_cyan]" />}
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 group">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Session Locator</label>
                <Input
                  type="email"
                  icon={Mail}
                  required
                  placeholder="operator@mesh.intel"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-black/20 border-white/5 h-12"
                />
              </div>

              <div className="space-y-1.5 group">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cipher Key</label>
                  <Link to="/forgot-password" className="text-[10px] font-bold text-primary-cyan hover:underline transition-all">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    icon={Lock}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-black/20 border-white/5 h-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-primary-cyan transition-all border-none bg-transparent cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] font-bold"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                type="submit"
                className="w-full h-14 text-[12px] font-black uppercase tracking-[0.2em] shadow-mesh-glow shadow-primary-cyan/10"
                isLoading={submitting}
              >
                Establish Connection <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>

            <div className="flex justify-center items-center gap-6 pt-2">
              <Link to="/register" className="text-[11px] font-bold text-gray-600 hover:text-white transition-colors">Apply Clearance</Link>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <Link to="/status" className="text-[11px] font-bold text-gray-600 hover:text-white transition-colors">Audit Status</Link>
            </div>
          </form>
        </motion.div>

        {/* ── Right: Side Info Panel ── */}
        <div className="hidden lg:flex flex-col gap-8 max-w-xs shrink-0 h-full justify-center">
          <h3 className="text-xs font-black text-primary-cyan uppercase tracking-[0.3em] mb-2">Protocol Architecture</h3>
          <div className="space-y-6">
            {[
              { step: '01', title: 'Review', desc: 'Team reviews organization profile' },
              { step: '02', title: 'Provision', desc: 'Secure node setup & key generation' },
              { step: '03', title: 'Access', desc: 'Credentials delivered encrypted' },
            ].map(s => (
              <div key={s.step} className="flex gap-4">
                <span className="text-[10px] font-black text-gray-700 shrink-0 border border-white/10 w-6 h-6 flex items-center justify-center rounded-lg mt-0.5">
                  {s.step}
                </span>
                <div>
                  <p className="text-xs font-bold text-white mb-0.5">{s.title}</p>
                  <p className="text-[10px] text-gray-600 leading-snug">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 grayscale opacity-30">
              <Shield size={14} className="text-white shadow-mesh-glow" />
              <span className="text-[10px] font-black text-white tracking-widest">ISO-27001 SECURE</span>
            </div>
            <p className="text-[10px] text-gray-700 font-medium">Activity is monitored under strictly regulated governance.</p>
          </div>
        </div>
      </div>

      {/* ── Footer Decorative Audit Info ── */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 opacity-30 pointer-events-none">
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.5em]"></span>
      </div>
    </div>
  );
}
