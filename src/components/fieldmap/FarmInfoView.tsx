import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Ruler, ArrowRight, Satellite } from 'lucide-react';
import { blurFade } from '../../animations/variants';
import { springDefault } from '../../animations/springs';

interface Props {
  onSubmit: (address: string, farmSize: string) => void;
}

export default function FarmInfoView({ onSubmit }: Props) {
  const [address, setAddress] = useState('');
  const [farmSize, setFarmSize] = useState('');

  const valid = address.trim().length > 3 && farmSize.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit(address.trim(), farmSize.trim());
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #060e06 0%, #0a160a 50%, #060a0a 100%)' }}
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Satellite icon */}
      <motion.div
        className="mb-8 flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          <Satellite size={26} className="text-green-400" />
        </div>
        <div className="text-center">
          <h1 className="text-[22px] font-bold text-white leading-tight">Tell us about your farm</h1>
          <p className="text-[13px] text-white/40 mt-1">We'll build your satellite layer analysis</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {/* Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <MapPin size={11} />
            Farm Address
          </label>
          <input
            type="text"
            placeholder="e.g. 1234 Farm Rd, Holtville, CA 92250"
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-[14px] text-white placeholder-white/20 outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: address.trim().length > 3
                ? '1px solid rgba(34,197,94,0.4)'
                : '1px solid rgba(255,255,255,0.1)',
            }}
            autoComplete="street-address"
          />
        </div>

        {/* Farm size */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
            <Ruler size={11} />
            Total Farm Size
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="e.g. 120"
              min="0.1"
              step="0.1"
              value={farmSize}
              onChange={e => setFarmSize(e.target.value)}
              className="flex-1 px-4 py-3.5 rounded-xl text-[14px] text-white placeholder-white/20 outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: farmSize.trim().length > 0
                  ? '1px solid rgba(34,197,94,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
              }}
            />
            <div
              className="px-4 py-3.5 rounded-xl text-[13px] font-medium text-white/40 shrink-0 flex items-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              acres
            </div>
          </div>
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={!valid}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-[15px] text-white mt-2 transition-opacity"
          style={{
            background: valid
              ? 'linear-gradient(135deg, #16a34a, #15803d)'
              : 'rgba(255,255,255,0.08)',
            color: valid ? 'white' : 'rgba(255,255,255,0.25)',
            cursor: valid ? 'pointer' : 'not-allowed',
            boxShadow: valid ? '0 4px 24px rgba(22,163,74,0.3)' : 'none',
          }}
          whileTap={valid ? { scale: 0.97 } : {}}
        >
          Analyze My Farm
          <ArrowRight size={16} />
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
