'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Step = 'name' | 'email' | 'referral' | 'done';

const REFERRAL_OPTIONS = [
  { id: 'google',        label: 'Google',             icon: '🔍' },
  { id: 'instagram',     label: 'Instagram',          icon: '📸' },
  { id: 'facebook',      label: 'Facebook',           icon: '👍' },
  { id: 'tiktok',        label: 'TikTok',             icon: '🎵' },
  { id: 'word_of_mouth', label: 'Friend or family',   icon: '👥' },
  { id: 'leaflet',       label: 'Leaflet / Flyer',    icon: '📮' },
  { id: 'local_press',   label: 'Local press',        icon: '🗞️' },
  { id: 'shop',          label: 'Saw it in a shop',   icon: '🛍️' },
  { id: 'email',         label: 'Email newsletter',   icon: '✉️' },
  { id: 'other',         label: 'Something else',     icon: '✨' },
];

const STEP_INDEX: Record<Step, number> = { name: 0, email: 1, referral: 2, done: 3 };

const slide = {
  enter:  (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (d: number) => ({ x: d * -48, opacity: 0 }),
};

export default function StartPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>('name');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [nameErr, setNameErr]   = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [dir, setDir]           = useState(1);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Skip onboarding if already completed
  useEffect(() => {
    if (localStorage.getItem('kk_lead')) {
      router.replace('/configure');
    }
  }, [router]);

  // Auto-focus input when step changes
  useEffect(() => {
    if (step === 'name' || step === 'email') {
      setTimeout(() => inputRef.current?.focus(), 280);
    }
  }, [step]);

  const advance = (next: Step, d = 1) => { setDir(d); setStep(next); };

  const submitName = () => {
    if (!name.trim()) { setNameErr('Please enter your name'); return; }
    setNameErr('');
    advance('email');
  };

  const submitEmail = () => {
    if (!email.trim()) { setEmailErr('Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('That doesn\'t look like a valid email'); return;
    }
    setEmailErr('');
    advance('referral');
  };

  const submitReferral = async (source: string) => {
    const payload = { name: name.trim(), email: email.trim(), referralSource: source };
    localStorage.setItem('kk_lead', JSON.stringify(payload));
    // Fire-and-forget — don't block the UX on network
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    advance('done');
    setTimeout(() => router.push('/configure'), 1400);
  };

  const firstName = name.split(' ')[0] || name;
  const currentStepIndex = STEP_INDEX[step];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-16"
      style={{ background: 'linear-gradient(160deg, #F5F0E8 0%, #EDE8DC 100%)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-14 group">
        <div className="w-10 h-10 bg-coral rounded-[12px] flex items-center justify-center text-white text-xl font-black shadow-lg shadow-coral/20 group-hover:scale-105 transition-transform">
          K
        </div>
        <span className="font-heading font-bold text-navy text-xl tracking-tight">
          Kustom <span className="text-coral">Kreations</span>
        </span>
      </Link>

      {/* Step pill progress */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-12">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: i === currentStepIndex ? 32 : 8,
                background: i <= currentStepIndex ? '#4A7C3F' : '#D0E8C8',
              }}
            />
          ))}
        </div>
      )}

      {/* Step content area */}
      <div className="w-full max-w-[440px]" style={{ minHeight: 340 }}>
        <AnimatePresence custom={dir} mode="wait">

          {/* ── Step 1: Name ───────────────────────── */}
          {step === 'name' && (
            <motion.div
              key="name"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-coral text-sm font-semibold uppercase tracking-widest mb-3">
                Step 1 of 3
              </p>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-navy mb-3 leading-tight">
                Hello! What's<br />your name?
              </h1>
              <p className="text-text-secondary mb-8">
                We'd love to know who we're creating for.
              </p>
              <input
                ref={inputRef}
                type="text"
                placeholder="Your first name"
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(''); }}
                onKeyDown={e => e.key === 'Enter' && submitName()}
                className="w-full px-5 py-4 rounded-2xl border-2 bg-white text-navy text-lg placeholder:text-border focus:outline-none transition-all duration-200"
                style={{ borderColor: nameErr ? '#DC2626' : name ? '#4A7C3F' : '#D8D3C8' }}
              />
              {nameErr && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {nameErr}
                </p>
              )}
              <button
                onClick={submitName}
                className="w-full mt-4 py-4 rounded-2xl font-bold text-white text-lg shadow-xl shadow-coral/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #4A7C3F 0%, #6AAD5A 100%)' }}
              >
                Continue →
              </button>
            </motion.div>
          )}

          {/* ── Step 2: Email ──────────────────────── */}
          {step === 'email' && (
            <motion.div
              key="email"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-coral text-sm font-semibold uppercase tracking-widest mb-3">
                Step 2 of 3
              </p>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-navy mb-3 leading-tight">
                Nice to meet<br />you, {firstName}!
              </h1>
              <p className="text-text-secondary mb-8">
                Where should we send your order confirmation?
              </p>
              <input
                ref={inputRef}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                onKeyDown={e => e.key === 'Enter' && submitEmail()}
                className="w-full px-5 py-4 rounded-2xl border-2 bg-white text-navy text-lg placeholder:text-border focus:outline-none transition-all duration-200"
                style={{ borderColor: emailErr ? '#DC2626' : email ? '#4A7C3F' : '#D8D3C8' }}
              />
              {emailErr && (
                <p className="text-red-600 text-sm mt-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {emailErr}
                </p>
              )}
              <button
                onClick={submitEmail}
                className="w-full mt-4 py-4 rounded-2xl font-bold text-white text-lg shadow-xl shadow-coral/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #4A7C3F 0%, #6AAD5A 100%)' }}
              >
                Continue →
              </button>
              <button
                onClick={() => advance('name', -1)}
                className="w-full mt-3 py-2 text-sm text-text-secondary hover:text-navy transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Referral source ────────────── */}
          {step === 'referral' && (
            <motion.div
              key="referral"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-coral text-sm font-semibold uppercase tracking-widest mb-3">
                Step 3 of 3
              </p>
              <h1 className="text-4xl sm:text-5xl font-heading font-bold text-navy mb-3 leading-tight">
                One last<br />thing!
              </h1>
              <p className="text-text-secondary mb-6">
                How did you hear about Kustom Kreations?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {REFERRAL_OPTIONS.map((opt, i) => (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => submitReferral(opt.id)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left border-2 border-border bg-white hover:border-coral hover:bg-coral-light/40 hover:-translate-y-0.5 transition-all group"
                  >
                    <span className="text-2xl leading-none">{opt.icon}</span>
                    <span className="text-sm font-semibold text-navy group-hover:text-coral leading-tight">
                      {opt.label}
                    </span>
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => advance('email', -1)}
                className="w-full mt-5 py-2 text-sm text-text-secondary hover:text-navy transition-colors"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {/* ── Done / redirect ────────────────────── */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="text-center py-10"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', damping: 10 }}
                className="text-8xl mb-6 select-none"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl sm:text-4xl font-heading font-bold text-navy mb-3">
                You're all set, {firstName}!
              </h2>
              <p className="text-text-secondary text-lg">
                Taking you to the designer…
              </p>
              <div className="mt-8 flex justify-center">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.8 }}
                      className="w-2.5 h-2.5 rounded-full bg-coral"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Privacy note */}
      {step !== 'done' && (
        <p className="mt-10 text-xs text-text-secondary text-center max-w-xs">
          Your details are only used to personalise your experience and send order updates.
          We never share them with third parties.
        </p>
      )}
    </div>
  );
}
