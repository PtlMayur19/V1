'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Check, ChevronDown, CircleAlert, FileAudio, Mail, Mic2, Play, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { analyzeAudio, type AnalysisResult } from '@/lib/analyzeAudio'
import GradientWaves from '@/components/GradientWaves'

const faqs = [
  ['What audio formats are supported?', 'VerifyVoice accepts MP3, WAV, M4A, FLAC, and OGG files up to 50MB.'],
  ['Is my audio stored?', 'No. Files are analyzed in memory and automatically discarded after the result is returned.'],
  ['How accurate is the detection?', 'The detector reports a probabilistic estimate. It is designed as a decision aid, not definitive proof.'],
  ['Can AI-generated audio fool the detector?', 'Detection improves continuously, but new or heavily edited synthesis can reduce confidence.'],
]

function ParticleSphere({ active }: { active: boolean }) {
  const points = useMemo(() => Array.from({ length: 260 }, (_, i) => {
    const phi = Math.acos(-1 + (2 * i) / 260)
    const theta = Math.sqrt(260 * Math.PI) * phi
    const x = Math.sin(phi) * Math.cos(theta)
    const y = Math.sin(phi) * Math.sin(theta)
    const z = Math.cos(phi)
    const scale = 0.72 + (z + 1) * 0.14

    // Round to 4 decimal places to prevent floating-point precision mismatches during hydration
    const rawX = 160 + x * 118 * scale
    const rawY = 160 + y * 118 * scale
    const rawR = 0.65 + (z + 1) * 0.45
    const rawOpacity = 0.24 + (z + 1) * 0.35

    return {
      x: Math.round(rawX * 10000) / 10000,
      y: Math.round(rawY * 10000) / 10000,
      r: Math.round(rawR * 10000) / 10000,
      opacity: Math.round(rawOpacity * 10000) / 10000
    }
  }), [])
  return <motion.div animate={{ rotate: 360, scale: active ? [1, 1.04, 1] : [0.98, 1.02, 0.98] }} transition={{ rotate: { repeat: Infinity, duration: active ? 7 : 22, ease: 'linear' }, scale: { repeat: Infinity, duration: active ? 1.8 : 4, ease: 'easeInOut' } }} className="relative size-[300px] sm:size-[360px]">
    <svg viewBox="0 0 320 320" className="size-full drop-shadow-[0_0_28px_rgba(0,91,255,.52)]" aria-hidden="true">
      <defs><radialGradient id="particleGlow"><stop stopColor="var(--accent)" stopOpacity=".45" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></radialGradient></defs>
      <circle cx="160" cy="160" r="120" fill="url(#particleGlow)" opacity={active ? .45 : .22} />
      {points.map((point, i) => <circle key={i} cx={point.x} cy={point.y} r={point.r} fill="var(--accent-bright)" opacity={point.opacity} />)}
    </svg>
  </motion.div>
}

function Waveform({ flagged = false }: { flagged?: boolean }) {
  // Round to integers to prevent floating-point precision mismatches during hydration
  const bars = useMemo(() => Array.from({ length: 64 }, (_, i) => Math.round(12 + Math.abs(Math.sin(i * 1.7)) * 27 + (i % 7) * 2)), [])
  return <div className="flex h-14 items-center gap-[3px] overflow-hidden rounded-xl bg-background/60 px-3" aria-label="Audio waveform preview">
    {bars.map((height, i) => <span key={i} className={`w-[3px] shrink-0 rounded-full ${flagged && (i > 14 && i < 28 || i > 42 && i < 52) ? 'bg-danger' : 'bg-accent/70'}`} style={{ height }} />)}
  </div>
}

export default function Page() {
  const [status, setStatus] = useState<'idle' | 'fileSelected' | 'analyzing' | 'result'>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const chooseFile = (next: File | undefined) => {
    if (!next || !next.type.startsWith('audio/') || next.size > 50 * 1024 * 1024) return
    setFile(next); setStatus('fileSelected')
  }
  const reset = () => { setStatus('idle'); setFile(null); setResult(null) }
  const runAnalysis = async () => { if (!file) return; setStatus('analyzing'); setResult(await analyzeAudio(file)); setStatus('result') }

  return <main className="min-h-[100svh] w-full bg-background p-4 text-foreground flex flex-col">
    <div className="relative min-h-[900px] w-full overflow-hidden rounded-[28px] border border-border-glass bg-panel shadow-[0_0_80px_rgba(0,55,180,.12)] sm:min-h-[1000px] sm:rounded-[32px]">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />

      <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight"><span className="grid size-7 place-items-center rounded-lg bg-accent text-white"><Activity size={16} /></span> VerifyVoice</a>
        <nav className="flex items-center gap-2 rounded-full border border-border-glass bg-surface/75 p-1.5 backdrop-blur-xl"><a href="#how-it-works" className="hidden px-3 py-2 text-xs text-secondary transition hover:text-foreground sm:block">How it works</a><a href="#faq" className="hidden px-3 py-2 text-xs text-secondary transition hover:text-foreground sm:block">FAQ</a><a href="#contact" className="rounded-full border border-border-glass px-3 py-2 text-xs text-secondary transition hover:text-foreground">Contact</a></nav>
      </header>

      <section
        id="top"
        className="relative z-10 flex flex-col items-center overflow-hidden px-5 pb-24 pt-12 text-center sm:px-8 sm:pt-20"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <GradientWaves
            horizonColor="#020308"
            waveColor="#0b1630"
            crestColor="#2563eb"
            speed={0.4}
            amplitude={2.5}
            waveScale={0.6}
            waveRatio={0.9}
            swell={35}
            turbulence={20}
            tilt={1.11}
            zoom={1.0}
            height={5.5}
            fogDepth={15}
            detail="medium"
            brightness={1.0}
            opacity={0.7}
            mouseInteraction={true}
            parallaxStrength={0.5}
            grain={true}
            grainIntensity={0.05}
          />
        </div>

        {/* everything below stays here */}
        <p className="mb-6 text-xs font-medium uppercase tracking-[.24em] text-accent-bright">Audio authenticity, clarified</p>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-.045em] text-gradient sm:text-6xl">Detect AI-generated voice — instantly, accurately.</h1>
        <p className="mt-6 max-w-xl text-pretty text-sm leading-6 text-secondary sm:text-base">Upload a recording and see the signals behind its authenticity. Fast, private, and built for a world where hearing is no longer believing.</p>
        <div className="mt-8"><ParticleSphere active={status === 'analyzing'} /></div>
        <AnimatePresence mode="wait">
          {status === 'idle' && <motion.button key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files[0]) }} className="upload-zone"><UploadCloud size={22} className="text-accent-bright" /><span className="text-sm font-medium">Drop audio here or click to browse</span><span className="text-xs text-secondary">MP3, WAV, M4A, FLAC, OGG · up to 50MB</span></motion.button>}
          {status === 'fileSelected' && file && <motion.div key="selected" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="file-card"><div className="flex items-center gap-3 text-left"><span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-bright"><FileAudio size={20} /></span><div className="min-w-0"><p className="max-w-[190px] truncate text-sm font-medium">{file.name}</p><p className="text-xs text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze</p></div><button onClick={reset} className="ml-auto rounded-full p-2 text-secondary hover:bg-surface hover:text-foreground" aria-label="Remove file"><X size={16} /></button></div><Waveform /><button onClick={runAnalysis} className="primary-button w-full"><Play size={15} fill="currentColor" /> Analyze recording</button></motion.div>}
          {status === 'analyzing' && <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3"><div className="flex items-center gap-2 text-sm text-accent-bright"><span className="loading-dot" /> Mapping voice signatures...</div><p className="text-xs text-secondary">Comparing spectral, phase, and timing patterns</p></motion.div>}
        </AnimatePresence>
        <input ref={inputRef} type="file" accept="audio/*" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} />
      </section>

      <section id="how-it-works" className="relative z-10 border-t border-border-glass px-5 py-20 sm:px-12"><SectionHeading eyebrow="A clearer signal" title="See what your ears can’t." description="VerifyVoice turns complex audio forensics into a result you can understand and act on." /><div className="mt-12 grid gap-3 md:grid-cols-3">{[[Mic2, 'Upload a recording', 'Drop in a voice clip from any device. Your file stays private.'], [Activity, 'We read the signal', 'Our model checks spectral texture, phase coherence, and micro-timing.'], [ShieldCheck, 'Get a transparent result', 'See confidence, flagged moments, and the evidence behind the verdict.']].map(([Icon, title, copy]) => <div key={title as string} className="glass-card"><span className="icon-chip"><Icon size={18} /></span><h3 className="mt-6 text-base font-medium">{title as string}</h3><p className="mt-2 text-sm leading-6 text-secondary">{copy as string}</p></div>)}</div></section>
      <section className="relative z-10 border-t border-border-glass px-5 py-20 text-center sm:px-12"><SectionHeading eyebrow="Built for responsible listening" title="Confidence, with context." description="No black-box declarations. Every result comes with a confidence score and the signals that shaped it." /><div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-3"><Stat value="94%" label="model confidence" /><Stat value="5" label="audio formats" /><Stat value="< 30s" label="average analysis" /></div></section>
      <section id="faq" className="relative z-10 border-t border-border-glass px-5 py-20 sm:px-32"><SectionHeading eyebrow="Questions, answered" title="Know the limitations." /><div className="mt-10 flex flex-col gap-2">{faqs.map(([q, a], i) => <div key={q} className="overflow-hidden rounded-2xl border border-border-glass bg-surface/45"><button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>{q}<ChevronDown size={16} className={`shrink-0 text-secondary transition ${openFaq === i ? 'rotate-180' : ''}`} /></button><AnimatePresence initial={false}>{openFaq === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p className="px-5 pb-5 text-sm leading-6 text-secondary">{a}</p></motion.div>}</AnimatePresence></div>)}</div></section>
      <section id="contact" className="relative z-10 border-t border-border-glass px-5 py-20 text-center sm:py-24"><SectionHeading eyebrow="Still curious?" title="Get in touch." description="Questions about detection, partnerships, or responsible AI? We’d love to hear from you." /><form className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border-glass bg-surface/55 p-2 sm:flex-row"><input className="field" placeholder="Name" aria-label="Name" /><input className="field" type="email" placeholder="Email" aria-label="Email" /><button className="primary-button shrink-0"><Mail size={15} /> Contact us</button></form></section>
      <footer className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-border-glass px-5 py-7 text-xs text-secondary sm:flex-row sm:px-12"><span>© 2026 VerifyVoice</span><div className="flex gap-5"><a href="#faq" className="hover:text-foreground">Privacy</a><a href="#contact" className="hover:text-foreground">Contact</a><a href="#top" className="hover:text-foreground">Terms</a></div></footer>
    </div>
    <AnimatePresence>{status === 'result' && result && <ResultModal result={result} onReset={reset} />}</AnimatePresence>
  </main>
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) { return <div className="mx-auto max-w-2xl text-center"><p className="text-xs font-medium uppercase tracking-[.22em] text-accent-bright">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-gradient sm:text-4xl">{title}</h2>{description && <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-secondary">{description}</p>}</div> }
function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-full border border-border-glass bg-surface/60 px-5 py-3"><span className="font-mono text-lg text-accent-bright">{value}</span><span className="ml-2 text-xs text-secondary">{label}</span></div> }
function ResultModal({ result, onReset }: { result: AnalysisResult; onReset: () => void }) { const ai = result.verdict === 'AI_GENERATED'; return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop"><motion.div initial={{ opacity: 0, scale: .95, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} role="dialog" aria-modal="true" aria-labelledby="result-title" className="result-modal"><button onClick={onReset} className="absolute right-4 top-4 rounded-full p-2 text-secondary hover:bg-surface hover:text-foreground" aria-label="Close result"><X size={18} /></button><div className={`verdict ${ai ? 'verdict-danger' : 'verdict-success'}`}><CircleAlert size={15} /> {ai ? 'Likely AI-generated' : 'Likely human-recorded'}</div><h2 id="result-title" className="mt-5 text-2xl font-semibold tracking-tight">{result.confidence}% confidence</h2><div className="confidence-track"><motion.span initial={{ width: 0 }} animate={{ width: `${result.confidence}%` }} transition={{ duration: .8, ease: 'easeOut' }} className={ai ? 'bg-danger' : 'bg-success'} /></div><div className="mt-6"><Waveform flagged={ai} /></div><ul className="mt-6 flex flex-col gap-3 text-left">{result.explanations.map((item) => <li key={item} className="flex gap-3 text-sm leading-5 text-secondary"><Check size={16} className={`mt-0.5 shrink-0 ${ai ? 'text-danger' : 'text-success'}`} />{item}</li>)}</ul><p className="mt-6 text-xs leading-5 text-secondary">This is a probabilistic estimate, not definitive proof.</p><button onClick={onReset} className="primary-button mt-6 w-full"><RotateCcw size={15} /> Analyze another file</button></motion.div></motion.div> }
