import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Shield, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';
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
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-14 relative overflow-hidden bg-gradient-to-br from-[#0c1020] to-mesh-dark">
        {/* Ambient glow */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-primary-cyan/10 blur-[100px]" />
          <div className="absolute bottom-[-150px] right-[-100px] w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-[100px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-mesh-gradient">
            <Shield size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">QEKMS</span>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-primary-cyan mb-5">SECURE ACCESS TERMINAL</p>
            <h1 className="text-5xl font-black tracking-tight leading-tight mb-6 text-white">
              Sovereign<br />
              <span className="bg-clip-text text-transparent bg-mesh-gradient">
                Security
              </span><br />
              Protocol.
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              The enterprise standard for post-quantum cryptographic mesh governance and secure peer-to-peer intelligence.
            </p>
          </div>

          {/* Trust points */}
          <div className="space-y-4 pt-4 border-l-2 border-primary-cyan/20 pl-6">
            {[
              { dot: 'bg-primary-cyan', label: 'Verified Zero-Trust Architecture' },
              { dot: 'bg-violet-400', label: 'E2EE Mesh Handshakes' },
              { dot: 'bg-emerald-400', label: 'Quantum Entropy Infusion' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                <span className="text-xs font-semibold text-gray-500 tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs text-gray-500 bg-white/5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All Sessions are cryptographically audited
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center px-8 py-16 bg-mesh-dark">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-mesh-gradient">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-white">QEKMS</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">Access Terminal</h2>
            <p className="text-gray-500 text-sm">Verified node clearance required to proceed.</p>
          </div>

          {/* Role switcher */}
          <div className="flex p-1 rounded-xl mb-8 bg-white/5 border border-white/10">
            {([['account', 'Operator'], ['admin', 'Overseer']] as const).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRole(val)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  role === val ? 'bg-mesh-gradient text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              icon={Mail}
              required
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                icon={Lock}
                required
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm text-red-400 bg-red-400/10 border border-red-400/20">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-2" isLoading={submitting}>
              Authenticate <ArrowRight size={16} />
            </Button>
          </form>

          {/* Footer links */}
          <div className="mt-8 text-center space-y-4">
            <Link to="/register" className="text-sm text-gray-500 hover:text-primary-cyan transition-colors block">
              Don't have access? <span className="text-primary-cyan font-semibold">Request clearance →</span>
            </Link>
            <Link to="/status" className="text-sm text-gray-600 hover:text-gray-400 transition-colors block">
              Check application status
            </Link>
          </div>

          <p className="mt-12 text-center text-xs text-gray-700">
            All login attempts are cryptographically hashed and recorded in the audit ledger.
          </p>
        </div>
      </div>
    </div>
  );
}
