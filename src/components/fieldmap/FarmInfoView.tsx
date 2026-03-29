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
      className="app-page"
      variants={blurFade}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
      transition={springDefault}
    >
      <div className="page-header">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.14)' }}
          >
            <Satellite size={24} color="white" />
          </div>
          <div>
            <p className="page-header-kicker">Satellite Setup</p>
            <h1 className="page-header-title">Tell us about your farm</h1>
          </div>
        </div>
        <p className="page-header-copy">We&rsquo;ll build your satellite layer analysis from these details.</p>
      </div>

      <div className="page-content flex-1 flex items-start">
        <motion.form
          onSubmit={handleSubmit}
          className="w-full app-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="app-card p-5">
            <label className="app-label flex items-center gap-2 mb-3">
              <MapPin size={18} color="#2D5A27" />
              Farm Address
            </label>
            <input
              type="text"
              placeholder="e.g. 1234 Farm Rd, Holtville, CA 92250"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="app-input"
              autoComplete="street-address"
            />
          </div>

          <div className="app-card p-5">
            <label className="app-label flex items-center gap-2 mb-3">
              <Ruler size={18} color="#2D5A27" />
              Total Farm Size
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="e.g. 120"
                min="0.1"
                step="0.1"
                value={farmSize}
                onChange={e => setFarmSize(e.target.value)}
                className="app-input"
              />
              <div
                className="flex items-center justify-center rounded-xl border-2 px-4"
                style={{ borderColor: '#2D5A27', color: '#2D5A27', minWidth: 88, fontSize: 16, fontWeight: 700 }}
              >
                acres
              </div>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={!valid}
            className="app-button-primary app-button-cta"
            whileTap={valid ? { scale: 0.98 } : {}}
          >
            Analyze My Farm
            <ArrowRight size={18} />
          </motion.button>
        </motion.form>
      </div>
    </motion.div>
  );
}
