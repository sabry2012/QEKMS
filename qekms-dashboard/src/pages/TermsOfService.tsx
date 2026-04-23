import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, Shield, Zap, Globe, ChevronLeft } from 'lucide-react';
import QuantumAnimation from '../components/QuantumAnimation';

const TermsOfService: React.FC = () => {
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
              <FileText className="text-primary-cyan" size={24} />
            </div>
            <p className="text-[10px] font-black tracking-[0.4em] text-primary-cyan uppercase">Governance Framework</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none mb-6">
            Terms of <span className="text-primary-cyan">Service.</span>
          </h1>
          <p className="text-gray-500 text-lg">Effective Date: {new Date().toLocaleDateString()}</p>
        </header>

        <div className="space-y-12 text-gray-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Zap size={20} className="text-primary-cyan" /> 1. Service Authorization
            </h2>
            <p>
              By accessing the QEKMS mesh, you certify that you are an authorized representative of your organization. The service is provided "as is" with the highest cryptographic guarantees mathematically possible. Use of the system for any illegal activities or unauthorized network intrusion is strictly prohibited and will result in immediate node termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield size={20} className="text-primary-cyan" /> 2. Cryptographic Responsibility
            </h2>
            <p>
              QEKMS provides the infrastructure for secure communication. You are solely responsible for the management of your local identity secrets and node access credentials. Loss of these secrets may result in permanent loss of access to encrypted data, as our architecture prevent any "backdoor" or administrative recovery of user keys.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Globe size={20} className="text-primary-cyan" /> 3. Service Level Agreements (SLA)
            </h2>
            <p>
              Professional and Enterprise tiers are covered by our 99.9% and 99.999% uptime guarantees, respectively. We ensure continuous quantum entropy injection into the mesh to maintain cryptographic integrity. Standard maintenance windows will be communicated 48 hours in advance through the system status node.
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <p className="text-sm italic">
              These terms are governed by international data protection laws. Any disputes will be resolved through professional cryptographic arbitration. For full enterprise legal documentation, please contact <Link to="/request-expert?plan=sales" className="text-primary-cyan hover:underline">sales@qekms.com</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
