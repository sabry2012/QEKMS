import React, { useEffect, useState } from 'react';
import { X, ArrowDown, Lock, Key, Hash, ShieldCheck, Zap } from 'lucide-react';
import { Card } from './ui/Card';

interface AuditLog {
  id?: string;
  event: string;
  user_id?: string | null;
  details?: any;
  timestamp: string;
}

interface CryptoVisualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLog | null;
}

function parseCiphertext(fullCipher: string) {
  try {
    const parts = fullCipher.split(':');
    const actualCipherB64 = parts[0];
    
    const rawData = window.atob(actualCipherB64);
    const bytes = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
    
    if (bytes.length < 16) return { cipherHex: actualCipherB64, tagHex: 'N/A (Too short)' };
    
    const cipherBytes = bytes.slice(0, bytes.length - 16);
    const tagBytes = bytes.slice(bytes.length - 16);
    
    const toHex = (buf: Uint8Array) => Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return {
      cipherHex: toHex(cipherBytes),
      tagHex: toHex(tagBytes)
    };
  } catch (e) {
    return { cipherHex: fullCipher, tagHex: 'Parsing Error' };
  }
}

export function CryptoVisualizerModal({ isOpen, onClose, log }: CryptoVisualizerModalProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsRendered(true), 50);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  if (!isOpen || !log) return null;

  const { details } = log;

  const renderKeyGenerated = () => {
    const rawBits = details?.raw_bitstring || 'N/A';
    const finalKey = details?.final_key_hex || 'N/A';
    const quality = details?.quality || 'N/A';

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white">Quantum Key Generation</h2>
          <p className="text-primary-cyan text-sm uppercase tracking-widest font-bold mt-2">Entropy Source: {details?.source}</p>
        </div>

        <div className="flex flex-col items-center gap-4 relative">
          {/* Step 1: Raw Bits */}
          <Card className="w-full p-6 border border-emerald-500/30 bg-black/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="text-emerald-400" size={24} />
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Step 1: Quantum Entropy (Raw Bits)</h3>
              </div>
              <p className="font-mono text-gray-400 text-xs break-all bg-black/50 p-4 rounded-lg border border-white/5 h-32 overflow-y-auto">
                {rawBits}
              </p>
              <div className="mt-3 flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <span>Length: {details?.bit_length} bits</span>
                <span>Quality Score: {quality}</span>
              </div>
            </div>
          </Card>

          <ArrowDown className="text-emerald-500/50" size={32} />

          {/* Step 2: Final Key */}
          <Card className="w-full p-6 border border-primary-cyan/30 bg-black/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary-cyan/5 blur-xl group-hover:bg-primary-cyan/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Key className="text-primary-cyan" size={24} />
                <h3 className="text-primary-cyan font-bold uppercase tracking-widest text-sm">Step 2: Final Derived Key (Hex)</h3>
              </div>
              <p className="font-mono text-white text-sm break-all bg-primary-cyan/10 p-4 rounded-lg border border-primary-cyan/20">
                {finalKey}
              </p>
              <div className="mt-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                256-bit Cryptographic Key
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderMessageSent = () => {
    const plaintext = details?.plaintext || '<Hidden or unavailable>';
    const ciphertextBase64 = details?.ciphertext || '';
    const { cipherHex, tagHex } = parseCiphertext(ciphertextBase64);
    const keyUsed = details?.encryption_key_hex || 'N/A';
    const nonceBase64 = details?.nonce || 'N/A';
    const signature = details?.signature || 'N/A';

    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white">Cryptographic Telemetry Flow</h2>
          <p className="text-primary-cyan text-sm uppercase tracking-widest font-bold mt-2">AES-GCM Encryption & HMAC Verification</p>
        </div>

        <div className="flex flex-col items-center gap-4 relative">
          
          {/* Step 1: Plaintext */}
          <Card className="w-full p-6 border border-white/10 bg-black/60 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white font-bold text-xs">1</span>
              </div>
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">Original Plaintext</h3>
            </div>
            <p className="font-mono text-gray-300 text-sm break-all bg-black/50 p-4 rounded-lg border border-white/5">
              {plaintext}
            </p>
          </Card>

          <ArrowDown className="text-white/20" size={24} />

          {/* Step 2: Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
             <Card className="p-5 border border-purple-500/30 bg-black/60">
                <div className="flex items-center gap-2 mb-3">
                   <Key size={16} className="text-purple-400" />
                   <h4 className="text-purple-400 font-bold text-xs uppercase tracking-widest">Encryption Key</h4>
                </div>
                <p className="font-mono text-gray-400 text-[10px] break-all">{keyUsed}</p>
             </Card>
             <Card className="p-5 border border-amber-500/30 bg-black/60">
                <div className="flex items-center gap-2 mb-3">
                   <Hash size={16} className="text-amber-400" />
                   <h4 className="text-amber-400 font-bold text-xs uppercase tracking-widest">Initialization Vector (IV)</h4>
                </div>
                <p className="font-mono text-gray-400 text-[10px] break-all">{details?.ciphertext?.split(':')[1] || 'N/A'}</p>
             </Card>
          </div>

          <ArrowDown className="text-white/20" size={24} />

          {/* Step 3: AES-GCM Output */}
          <Card className="w-full p-6 border border-emerald-500/40 bg-black/80 relative overflow-hidden group shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <div className="absolute inset-0 bg-mesh-gradient opacity-10 mix-blend-screen pointer-events-none" />
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/50">
                <Lock size={16} />
              </div>
              <h3 className="text-emerald-400 font-bold uppercase tracking-widest text-sm">AES-GCM Encryption Result</h3>
            </div>
            
            <div className="space-y-4 relative z-10">
               <div>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Encrypted Ciphertext (Hex)</h4>
                  <p className="font-mono text-emerald-100/70 text-xs break-all bg-emerald-950/30 p-3 rounded-lg border border-emerald-500/20 max-h-32 overflow-y-auto">
                    {cipherHex}
                  </p>
               </div>
               
               <div>
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <ShieldCheck size={14} /> AES-GCM Authentication Tag (Integrity Proof)
                  </h4>
                  <p className="font-mono text-emerald-400 font-bold text-sm break-all bg-emerald-900/40 p-3 rounded-lg border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    {tagHex}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">This 16-byte tag inherently guarantees the ciphertext has not been tampered with during transmission.</p>
               </div>
            </div>
          </Card>

          <ArrowDown className="text-white/20" size={24} />

          {/* Step 4: Additional HMAC Signature */}
          <Card className="w-full p-6 border border-primary-cyan/30 bg-black/60 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary-cyan/20 text-primary-cyan flex items-center justify-center border border-primary-cyan/50">
                <ShieldCheck size={16} />
              </div>
              <div>
                 <h3 className="text-primary-cyan font-bold uppercase tracking-widest text-sm">HMAC-SHA256 Signature</h3>
                 <p className="text-[10px] text-gray-400 font-medium mt-1">Secondary layer of authenticity ensuring freshness (Nonce + Timestamp bind)</p>
              </div>
            </div>
            <div className="bg-black/50 p-4 rounded-lg border border-white/5">
               <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                     <span className="text-gray-500">Nonce:</span>
                     <span className="text-gray-300 break-all ml-4 text-right">{nonceBase64}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 py-2">
                     <span className="text-gray-500">Timestamp:</span>
                     <span className="text-gray-300">{details?.timestamp}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                     <span className="text-primary-cyan/70">Signature:</span>
                     <span className="text-primary-cyan font-bold break-all ml-4 text-right">{signature}</span>
                  </div>
               </div>
            </div>
          </Card>

        </div>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isRendered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl transition-all duration-300 ease-out no-scrollbar ${isRendered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
        
        {/* Header Actions */}
        <div className="sticky top-0 right-0 p-4 flex justify-end z-20 pointer-events-none">
           <button 
             onClick={onClose}
             className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors pointer-events-auto border border-white/10 backdrop-blur-md"
           >
             <X size={20} />
           </button>
        </div>

        <div className="p-6 sm:p-10 pt-0">
          {(() => {
            const eventName = String(log.event || (log as any).event_type || (log as any).type || '').toUpperCase().trim();
            if (eventName === 'KEY_GENERATED') return renderKeyGenerated();
            if (eventName === 'MESSAGE_SENT') return renderMessageSent();
            return (
              <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest">
                No visualizer available for this event type: {eventName}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
