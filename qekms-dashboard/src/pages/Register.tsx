import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import {
  Shield, User, Building, Phone, Mail, Lock,
  ArrowRight, CheckCircle2, ChevronRight, Star
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/month',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$49',
    period: '/mo',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '/Contact',
  },
];

export default function Register() {
  const [searchParams] = useSearchParams();
  const planFromUrl = searchParams.get('plan') || 'starter';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    otp_code: '',
    plan: planFromUrl,
  });

  const [step, setStep] = useState(1); // 1: Identity, 2: OTP
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-jssdk')) return;
      const script = document.createElement('script');
      script.id = 'google-jssdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signup-button'),
            { theme: 'outline', size: 'large', width: '400' }
          );
        }
      };
    };
    loadGoogleScript();
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/auth/google', { token: response.credential });
      if (res.data.profile_incomplete) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    const { full_name, email, password, phone_number } = formData;

    // Strict Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{10,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 10 characters long and include uppercase, lowercase, numbers, and symbols.');
      return;
    }

    const checkPhone = phone_number.startsWith('+') ? phone_number : '+' + phone_number;
    if (!isValidPhoneNumber(checkPhone)) {
      setError('Invalid phone number format.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/request-otp', { 
        phone_number: formData.phone_number,
        email: formData.email
      });
      setStep(2);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (formData.otp_code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // First verify OTP
      await api.post('/auth/verify-otp', {
        phone_number: formData.phone_number,
        otp_code: formData.otp_code
      });

      // Then immediately register
      await api.post('/auth/register', formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification or registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOtp();
    } else {
      handleVerifyAndRegister();
    }
  };

  /* ── Success Screen ── */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-mesh-dark font-sans">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">Account Provisioned</h1>
        <p className="text-gray-400 text-lg max-w-md leading-relaxed mb-10">
          Your secure node has been successfully established. You can now access the quantum mesh.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/login"
            className="flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white bg-mesh-gradient hover:opacity-90 transition-opacity"
          >
            Access Dashboard <ChevronRight size={16} />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row gap-12 lg:gap-32 items-center justify-center">
        {/* Left Side: Brand Identity */}
        <div className="hidden lg:block max-w-xl shrink-0">
          <div className="mb-8 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-cyan/10 border border-primary-cyan/20 rounded-2xl flex items-center justify-center">
              <Shield className="text-primary-cyan" size={24} />
            </div>
            <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan uppercase opacity-80">Enterprise Protocol</p>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] m-0 mb-8">
            <span className="text-white block">Quantum Access</span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              Registration.
            </span>
          </h1>
          <p className="text-gray-500 text-lg font-medium leading-relaxed max-w-md">
            Initialize your organization's presence on the quantum mesh. Provision secure nodes and establish encrypted links.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-xl bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-cyan/5 rounded-full blur-[80px]" />

          <div className="mb-10 text-left lg:hidden">
            <p className="text-[9px] font-black tracking-[0.4em] text-primary-cyan mb-2 uppercase opacity-80">Enterprise Protocol</p>
            <h1 className="text-4xl font-black tracking-tighter leading-[0.95] m-0">
              <span className="text-white block">Quantum Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500">Registration.</span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center items-center mb-10 gap-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${step === s ? 'bg-primary-cyan text-black shadow-mesh-glow' :
                      step > s ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                        'bg-white/5 text-gray-600 border border-white/10'
                    }`}>
                    {step > s ? '✓' : s}
                  </div>
                  {s < 2 && <div className={`w-12 h-[1px] mx-2 ${step > s ? 'bg-emerald-500/20' : 'bg-white/5'}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Identity Secret</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                      <input
                        type="email"
                        required
                        className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                        placeholder="email@quantum.node"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Access Cipher</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                      <input
                        type="password"
                        required
                        className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary-cyan transition-colors" size={18} />
                      <input
                        type="text"
                        required
                        className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-4 text-sm outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5"
                        placeholder="Officer Name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Node</label>
                    <PhoneInput
                      country={'eg'}
                      value={formData.phone_number}
                      onChange={val => setFormData({ ...formData, phone_number: val })}
                      placeholder="Verification Number"
                      containerClass="!w-full"
                      inputClass="!w-full !h-14 !bg-white/[0.02] !border-white/10 !rounded-2xl !text-sm !text-white !pl-14 !outline-none !transition-all focus:!border-primary-cyan/40 focus:!bg-white/5"
                      buttonClass="!bg-transparent !border-white/10 !rounded-l-2xl"
                      dropdownClass="!bg-[#0a0a0c] !border-white/10 !text-white !rounded-xl"
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-sm mx-auto space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Verify Phone Node</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest italic">6-digit code was sent to your device</p>
                  </div>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-cyan/40" size={18} />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      className="w-full h-16 bg-white/[0.02] border border-white/10 rounded-2xl text-center text-2xl tracking-[0.3em] font-black outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5 pl-10"
                      placeholder="000000"
                      value={formData.otp_code}
                      onChange={(e) => setFormData({ ...formData, otp_code: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <button type="button" onClick={() => setStep(1)} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Edit Number</button>
                    <button type="button" disabled={countdown > 0} onClick={handleSendOtp} className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${countdown > 0 ? 'text-gray-700' : 'text-primary-cyan hover:text-primary-cyan/80'}`}>
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="p-4 rounded-xl text-[10px] text-red-500 bg-red-500/5 border border-red-500/10 font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full h-14 bg-mesh-gradient shadow-mesh-glow font-black text-xs uppercase tracking-[0.2em] rounded-2xl"
                isLoading={submitting}
              >
                {step === 1 ? 'Verify Identity' : 'Provision Account'} <ArrowRight size={18} className="ml-2" />
              </Button>
              <GoogleAuthButton id="google-signup-button" text="Initialize with Google" />
              <p className="text-center text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-4">
                Already have node? <Link to="/login" className="text-primary-cyan hover:underline">Secure Login</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

// Global overrides for react-phone-input-2 to match the theme
const style = document.createElement('style');
style.innerHTML = `
  .react-tel-input .country-list {
    background-color: #0a0a0c !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    margin-top: 8px !important;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
  }
  .react-tel-input .country-list .country:hover {
    background-color: rgba(6, 182, 212, 0.1) !important;
    color: #fff !important;
  }
  .react-tel-input .country-list .country.highlight {
    background-color: rgba(6, 182, 212, 0.2) !important;
  }
  .react-tel-input .selected-flag {
    background-color: transparent !important;
    border-radius: 12px 0 0 12px !important;
    width: 44px !important;
  }
  .react-tel-input .selected-flag:hover {
    background-color: rgba(255, 255, 255, 0.05) !important;
  }
  .react-tel-input .flag-dropdown.open .selected-flag {
    background: transparent !important;
  }
  .react-tel-input .search {
    background-color: #0a0a0c !important;
    padding: 10px !important;
  }
  .react-tel-input .search-box {
    background-color: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border-radius: 8px !important;
    width: 90% !important;
  }
`;
document.head.appendChild(style);
