import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, Lock, Eye, Server, ChevronLeft } from 'lucide-react';
import QuantumAnimation from '../components/QuantumAnimation';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-mesh-dark text-white font-sans relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <QuantumAnimation />
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-8 py-24">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-cyan transition-colors mb-12 text-xs font-bold uppercase tracking-widest">
          <ChevronLeft size={16} /> Return to mesh
        </Link>

        <header className="mb-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-primary-cyan/10 border border-primary-cyan/20 rounded-2xl flex items-center justify-center">
              <Eye className="text-primary-cyan" size={24} />
            </div>
            <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan uppercase">Security Protocol</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-6">
            Privacy <span className="text-primary-cyan">Policy.</span>
          </h1>
          <p className="text-gray-500 text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </header>

        <div className="space-y-12 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Lock size={20} className="text-primary-cyan" /> Data Encryption Standards
            </h2>
            <p>
              QEKMS operates on a zero-knowledge architecture. Your plaintext data is never stored on our servers. All information transmitted through the mesh is protected by AES-256-GCM encryption with quantum-resistant key exchange (QKD) protocols. We do not have the technical capability to decrypt your communications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield size={20} className="text-primary-cyan" /> Information Collection
            </h2>
            <p>
              We collect minimal metadata required to maintain your secure node connection. This includes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Verified phone number for multi-factor identity proofing.</li>
              <li>Encrypted organization identity secrets.</li>
              <li>Node connection logs (retained for 30 days for security auditing).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Server size={20} className="text-primary-cyan" /> Sovereign Hosting
            </h2>
            <p>
              Your data resides in isolated, mathematically segmented mesh channels. We do not share, sell, or monetize user data. All data processing occurs within secure, audited environments that comply with international security standards (ISO 27001, SOC2).
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <p className="text-sm italic">
              For any privacy-related inquiries or to request a full cryptographic audit of your data footprint, please contact our Security Architects at <Link to="/request-expert?plan=support" className="text-primary-cyan hover:underline">experts@qekms.com</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
