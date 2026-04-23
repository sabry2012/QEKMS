import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Shield, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { motion, AnimatePresence } from 'framer-motion';

export default function CompleteProfile() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSendOtp = async () => {
    setError('');
    const checkPhone = phone.startsWith('+') ? phone : '+' + phone;
    if (!isValidPhoneNumber(checkPhone)) {
      setError('Invalid phone number format.');
      setIsPhoneValid(false);
      return;
    }
    setIsPhoneValid(true);

    setSubmitting(true);
    try {
      await api.post('/auth/request-otp', { phone_number: phone });
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
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await api.patch('/auth/complete-profile', {
        phone_number: phone,
        otp_code: otp
      });
      await login(); // Refresh user data
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleSendOtp();
    } else {
      handleFinalSubmit();
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh-dark font-sans text-white relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary-cyan/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md p-8 md:p-10 bg-[#0d0d0f]/80 border border-white/10 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl"
      >
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary-cyan/10 border border-primary-cyan/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="text-primary-cyan" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-2">Final Step</h1>
          <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold">Secure Node Provisioning</p>
        </div>

        <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
          To complete your quantum-secure enrollment, we require a unique phone number for two-factor verification.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="p1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="phone-input-wrapper">
                <PhoneInput
                  country={'eg'}
                  value={phone}
                  onChange={val => setPhone(val)}
                  placeholder="Primary Phone Node"
                  containerClass="!w-full"
                  inputClass={`!w-full !h-14 !bg-white/[0.02] !border-white/10 !rounded-2xl !text-sm !text-white !pl-14 !outline-none !transition-all focus:!border-primary-cyan/40 focus:!bg-white/5 ${!isPhoneValid ? '!border-red-500' : ''}`}
                  buttonClass="!bg-transparent !border-white/10 !rounded-l-2xl"
                  dropdownClass="!bg-[#0a0a0c] !border-white/10 !text-white !rounded-xl"
                  autoFormat={true}
                />
              </motion.div>
            ) : (
              <motion.div key="p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-cyan/40" size={18} />
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full h-14 bg-white/[0.02] border border-white/10 rounded-2xl text-center text-2xl tracking-[0.3em] font-black text-white placeholder:text-gray-700 placeholder:tracking-normal outline-none transition-all focus:border-primary-cyan/40 focus:bg-white/5 pl-10"
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

          <Button
            type="submit"
            className="w-full h-14 bg-mesh-gradient shadow-mesh-glow font-black text-xs uppercase tracking-[0.2em] rounded-2xl"
            isLoading={submitting}
          >
            {step === 1 ? 'Send Verification Code' : 'Establish Connection'} <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
          <CheckCircle2 size={12} className="text-emerald-500" />
          ISO-27001 Protocol Active
        </div>
      </motion.div>
    </div>
  );
}
