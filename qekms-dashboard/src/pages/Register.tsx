import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import {
  Shield, User, Building, Phone, Mail, Lock,
  ArrowRight, CheckCircle2, ChevronRight, Star,
  CreditCard, Calendar, Hash
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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone_number: '',
    otp_code: '',
    card_holder: '',
    card_number: '',
    card_expiry: '',
    card_cvv: '',
    plan: 'professional',
  });

  const [step, setStep] = useState(1); // 1: Identity, 2: OTP, 3: Payment
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

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Formatting for Card Number
    if (field === 'card_number') {
        value = value.replace(/\D/g, '').substring(0, 16);
        value = value.match(/.{1,4}/g)?.join(' ') || value;
    }
    
    // Formatting for Expiry
    if (field === 'card_expiry') {
        value = value.replace(/\D/g, '').substring(0, 4);
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2);
        }
    }

    // Formatting for CVV
    if (field === 'card_cvv') {
        value = value.replace(/\D/g, '').substring(0, 4);
    }

    setFormData({ ...formData, [field]: value });
  };

  const handleSendOtp = async () => {
    setError('');
    const { phone_number } = formData;
    const checkPhone = phone_number.startsWith('+') ? phone_number : '+' + phone_number;
    if (!isValidPhoneNumber(checkPhone)) {
      setError('Invalid phone number format.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/request-otp', { phone_number: formData.phone_number });
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

  const handleVerifyOtp = async () => {
    if (formData.otp_code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
        await api.post('/auth/verify-otp', { 
            phone_number: formData.phone_number, 
            otp_code: formData.otp_code 
        });
        setStep(3); // Move to Payment only if verified
    } catch (err: any) {
        setError(err.response?.data?.detail || 'Invalid OTP code. Access Denied.');
    } finally {
        setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOtp();
      return;
    }
    if (step === 2) {
      handleVerifyOtp();
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      // Clean data for backend
      const cleanData = {
        ...formData,
        card_number: formData.card_number.replace(/\s/g, ''),
      };
      await api.post('/auth/register', cleanData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Success Screen ── */
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 bg-mesh-dark font-sans">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={40} className="text-emerald-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">Request Received</h1>
        <p className="text-gray-400 text-lg max-w-md leading-relaxed mb-10">
          Your enterprise access request is now under review. Our cryptographic engineering team will
          contact you within <span className="text-white font-semibold">24–48 hours</span>.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/status"
            className="flex items-center gap-2 font-bold px-8 py-3.5 rounded-xl text-white bg-mesh-gradient hover:opacity-90 transition-opacity"
          >
            Track Application <ChevronRight size={16} />
          </Link>
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ← Return to home
          </Link>
        </div>
      </div>
    );
  }

  /* ── Main Registration ── */
  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row gap-12 lg:gap-32 items-center justify-center">
        {/* ── Login-Synced Form Card ── */}
        <div className="w-full max-w-xl bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] p-8 md:p-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-primary-cyan/5 rounded-full blur-[80px]" />
          
          <div className="mb-8 text-left">
            <p className="text-[9px] font-black tracking-[0.4em] text-primary-cyan mb-2 uppercase opacity-80">Enterprise Protocol</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-[0.95] m-0">
              <span className="text-white block">Quantum Access</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                Registration.
              </span>
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
            {/* Step Indicators */}
            <div className="flex justify-between items-center mb-8 px-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                    step === s ? 'bg-primary-cyan text-black shadow-mesh-glow' : 
                    step > s ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                    'bg-white/5 text-gray-600 border border-white/10'
                  }`}>
                    {step > s ? '✓' : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-[1px] mx-2 ${step > s ? 'bg-emerald-500/20' : 'bg-white/5'}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
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
                        placeholder="Encryption Officer Name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Phone Node</label>
                    <div className="phone-input-wrapper">
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
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-sm mx-auto space-y-6"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Verify Phone Node</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">A 6-digit code was sent to your device</p>
                  </div>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-cyan/40" size={18} />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      className="w-full h-16 bg-white/[0.02] border border-white/10 rounded-2xl text-center text-2xl tracking-[0.3em] font-black outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5 pl-10 placeholder:tracking-normal placeholder:text-gray-700"
                      placeholder="000000"
                      value={formData.otp_code}
                      onChange={(e) => setFormData({ ...formData, otp_code: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <button 
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Edit Number
                    </button>
                    <button 
                      type="button"
                      disabled={countdown > 0}
                      onClick={handleSendOtp}
                      className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${countdown > 0 ? 'text-gray-700' : 'text-primary-cyan hover:text-primary-cyan/80'}`}
                    >
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center space-y-2 mb-4">
                    <h3 className="text-xl font-bold">Financial Handshake</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest italic">Encrypted Secure Transmission</p>
                  </div>
                  
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-4 relative overflow-hidden">
                    <div className="absolute top-4 right-4 text-white/20">
                        <CreditCard size={32} />
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.2em] ml-1">Card Holder</label>
                        <input
                            type="text"
                            required
                            className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary-cyan/40 transition-all uppercase"
                            placeholder="NAME AS SHOWN"
                            value={formData.card_holder}
                            onChange={update('card_holder')}
                        />
                        </div>

                        <div className="space-y-2">
                        <label className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.2em] ml-1">Card Number</label>
                        <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                            <input
                                type="text"
                                required
                                className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl pl-12 pr-4 text-sm font-mono tracking-[0.2em] outline-none focus:border-primary-cyan/40 transition-all"
                                placeholder="0000 0000 0000 0000"
                                value={formData.card_number}
                                onChange={update('card_number')}
                            />
                        </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.2em] ml-1">Expiry</label>
                            <input
                                type="text"
                                required
                                className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary-cyan/40 text-center"
                                placeholder="MM / YY"
                                value={formData.card_expiry}
                                onChange={update('card_expiry')}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.2em] ml-1">CVV</label>
                            <input
                                type="password"
                                maxLength={4}
                                required
                                className="w-full h-12 bg-white/[0.05] border border-white/10 rounded-xl px-4 text-sm outline-none focus:border-primary-cyan/40 text-center"
                                placeholder="***"
                                value={formData.card_cvv}
                                onChange={update('card_cvv')}
                            />
                        </div>
                        </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            {error && (
              <div className="p-4 rounded-xl text-xs text-red-500 bg-red-500/5 border border-red-500/10 font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-4">
                <Button 
              type="submit" 
              className="w-full h-14 bg-mesh-gradient shadow-mesh-glow font-black text-xs uppercase tracking-[0.2em] rounded-2xl" 
              isLoading={submitting}
            >
              {step === 1 ? 'Request Verification' : step === 2 ? 'Verify Code' : 'Establish Connection'} <ArrowRight size={18} className="ml-2" />
            </Button>

                {/* Google Divider */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">
                    <span className="bg-[#0d0d0f] px-4">Fast-Track Identity</span>
                  </div>
                </div>

                <GoogleAuthButton id="google-signup-button" text="Fast-Track Identity" />
                
                <div className="flex justify-center items-center gap-6">
                    <Link to="/login" className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">SignIn Instead</Link>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <Link to="/status" className="text-[10px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Track Status</Link>
                </div>
            </div>
          </form>
        </div>

        {/* ── Right: Side Info (Protocol Pipeline) ── */}
        <div className="hidden lg:flex flex-col gap-8 max-w-sm shrink-0 h-full justify-center">
            <div className="space-y-2">
                <p className="text-[10px] font-black text-primary-cyan uppercase tracking-[0.4em] opacity-80">System Flow</p>
                <h3 className="text-2xl font-black text-white tracking-tighter">Protocol Pipeline</h3>
            </div>
            
            <div className="space-y-8">
              {[
                { step: '01', title: 'Identity Audit', desc: 'Administrative review of organization credentials and node eligibility.' },
                { step: '02', title: 'Provision Mesh', desc: 'Secure quantum key generation and mesh node allocation.' },
                { step: '03', title: 'Establish Access', desc: 'Encrypted delivery of system credentials via secure handshake.' },
              ].map(s => (
                <div key={s.step} className="flex gap-6 group">
                  <span className="text-[10px] font-black text-gray-500 shrink-0 border border-white/10 w-10 h-10 flex items-center justify-center rounded-xl group-hover:border-primary-cyan/40 group-hover:text-primary-cyan transition-all duration-300">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white mb-1 group-hover:text-primary-cyan transition-colors">{s.title}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium uppercase tracking-wider">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5 space-y-6">
               <div className="flex items-center gap-4 group">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all">
                    <Shield size={14} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black text-white/60 tracking-[0.2em] uppercase">ISO-27001 Certified Node</span>
               </div>
               <p className="text-[10px] text-gray-600 font-bold uppercase leading-loose tracking-widest italic opacity-50">
                    Proprietary Quantum Governance Protocol Alpha-v4
               </p>
            </div>
        </div>
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
