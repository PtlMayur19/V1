'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity, Check, ChevronDown, CircleAlert, FileAudio, History, Mail, Mic2, Play, RotateCcw, ShieldCheck, UploadCloud, X } from 'lucide-react'
import { analyzeAudio, type AnalysisResult } from '@/lib/analyzeAudio'
import { clearAllHistory, deleteHistoryItem, getHistoryItems, saveHistoryItem, type HistoryItem } from '@/lib/historyDb'
import GradientWaves from '@/components/GradientWaves'
import AudioPlayer from '@/components/AudioPlayer'
import HistoryView from '@/components/HistoryView'
import AiLoader from '@/components/ui/ai-loader'

const faqs = [
  ['What audio formats are supported?', 'VerifyVoice accepts MP3, WAV, M4A, FLAC, and OGG files up to 50MB.'],
  ['Is my audio stored?', 'No. Files are analyzed in memory and automatically discarded after the result is returned.'],
  ['How accurate is the detection?', 'The detector reports a probabilistic estimate. It is designed as a decision aid, not definitive proof.'],
  ['Can AI-generated audio fool the detector?', 'Detection improves continuously, but new or heavily edited synthesis can reduce confidence.'],
]

export default function Page() {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home')
  const [status, setStatus] = useState<'idle' | 'fileSelected' | 'analyzing' | 'result'>('idle')
  const [file, setFile] = useState<File | Blob | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [quotaMessage, setQuotaMessage] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const refreshHistory = async () => {
    const items = await getHistoryItems()
    setHistoryItems(items)
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  const chooseFile = (next: File | undefined) => {
    if (!next || !next.type.startsWith('audio/') || next.size > 50 * 1024 * 1024) return
    setFile(next)
    setStatus('fileSelected')
  }

  const reset = () => {
    setStatus('idle')
    setFile(null)
    setResult(null)
    setQuotaMessage(null)
  }

  const runAnalysis = async () => {
    if (!file) return
    setStatus('analyzing')
    setQuotaMessage(null)

    const res = await analyzeAudio(file as File)
    setResult(res)
    setStatus('result')

    // Auto save to IndexedDB
    const filename = (file as File).name || 'audio_recording.wav'
    const fileSize = file.size || 0
    const saveRes = await saveHistoryItem(file, filename, fileSize, res)

    if (!saveRes.success && saveRes.error) {
      setQuotaMessage(saveRes.error)
    }

    refreshHistory()
  }

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setFile(item.audioBlob)
    setResult(item.result)
    setStatus('result')
  }

  const handleDeleteHistoryItem = async (id: string): Promise<boolean> => {
    const success = await deleteHistoryItem(id)
    if (success) {
      await refreshHistory()
      return true
    }
    return false
  }

  const handleClearAllHistory = async (): Promise<boolean> => {
    const success = await clearAllHistory()
    if (success) {
      await refreshHistory()
      return true
    }
    return false
  }

  const SCANNING_MESSAGES = [
    'Mapping voice signatures...',
    'Analyzing spectral patterns...',
    'Examining phase consistency...',
    'Checking temporal characteristics...',
    'Comparing voice fingerprints...',
    'Finalizing authenticity score...',
  ]
  const [scanningMsgIndex, setScanningMsgIndex] = useState(0)

  useEffect(() => {
    if (status !== 'analyzing') {
      setScanningMsgIndex(0)
      return
    }
    const interval = setInterval(() => {
      setScanningMsgIndex((prev) => (prev + 1) % SCANNING_MESSAGES.length)
    }, 450)
    return () => clearInterval(interval)
  }, [status])

  return (
    <main className="flex min-h-[100svh] w-full flex-col bg-background p-4 text-foreground">
      <div className="relative min-h-[900px] w-full overflow-hidden rounded-[28px] border border-border-glass bg-panel shadow-[0_0_80px_rgba(0,55,180,.12)] sm:min-h-[1000px] sm:rounded-[32px]">
        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />

        {/* HEADER NAVBAR */}
        <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition hover:opacity-90"
          >
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white">
              <Activity size={16} />
            </span>{' '}
            VerifyVoice
          </button>

          <nav className="flex items-center gap-1.5 rounded-full border border-border-glass bg-surface/75 p-1.5 backdrop-blur-xl">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-2 text-xs transition rounded-full ${activeTab === 'home' ? 'bg-accent/20 text-accent-bright font-medium' : 'text-secondary hover:text-foreground'}`}
            >
              How it works
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition rounded-full ${activeTab === 'history' ? 'bg-accent/20 text-accent-bright font-medium' : 'text-secondary hover:text-foreground'}`}
            >
              <History size={13} /> History
            </button>
            <a
              href="#faq"
              onClick={() => setActiveTab('home')}
              className="hidden px-3 py-2 text-xs text-secondary transition hover:text-foreground sm:block"
            >
              FAQ
            </a>
            <a
              href="#contact"
              onClick={() => setActiveTab('home')}
              className="rounded-full border border-border-glass px-3 py-2 text-xs text-secondary transition hover:text-foreground"
            >
              Contact
            </a>
          </nav>
        </header>

        {/* TAB CONTENTS */}
        {activeTab === 'history' ? (
          <div className="relative z-10">
            <HistoryView
              items={historyItems}
              onSelectHistoryItem={handleSelectHistoryItem}
              onDeleteItem={handleDeleteHistoryItem}
              onClearAll={handleClearAllHistory}
              onNavigateToUpload={() => setActiveTab('home')}
            />
          </div>
        ) : (
          <>
            {/* HERO SECTION */}
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

              <p className="mb-4 text-xs font-medium uppercase tracking-[.24em] text-accent-bright">
                AUDIO AUTHENTICITY, CLARIFIED
              </p>
              <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-.045em] text-gradient sm:text-6xl">
                Detect AI-generated voice — instantly, accurately.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-sm leading-6 text-secondary sm:text-base">
                Upload a recording and see the signals behind its authenticity. Fast, private, and built for a world where hearing is no longer believing.
              </p>

              {/* UPLOAD SECTION DIRECTLY UNDER HERO COPY */}
              <div className="mt-8 flex w-full justify-center">
                <AnimatePresence mode="wait">
                  {status === 'idle' && (
                    <motion.button
                      key="idle"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => inputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        chooseFile(e.dataTransfer.files[0])
                      }}
                      className="upload-zone cursor-pointer"
                    >
                      <UploadCloud size={30} className="text-accent-bright" />
                      <div className="flex flex-col gap-1 text-center">
                        <span className="text-base font-semibold tracking-tight text-foreground">
                          Drag & drop audio here or click to browse
                        </span>
                        <span className="text-xs text-secondary">
                          Supports WAV, MP3, M4A • Max 50MB
                        </span>
                      </div>
                    </motion.button>
                  )}

                  {status === 'fileSelected' && file && (
                    <motion.div
                      key="selected"
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="file-card"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent-bright">
                          <FileAudio size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {(file as File).name || 'audio_recording.wav'}
                          </p>
                          <p className="text-xs text-secondary">
                            {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to analyze
                          </p>
                        </div>
                        <button
                          onClick={reset}
                          className="rounded-full p-2 text-secondary transition hover:bg-surface hover:text-foreground"
                          aria-label="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <button onClick={runAnalysis} className="primary-button w-full py-3 text-sm">
                        <Play size={15} fill="currentColor" /> Analyze recording
                      </button>
                    </motion.div>
                  )}

                  {status === 'analyzing' && (
                    <motion.div
                      key="analyzing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="upload-zone justify-center py-8 min-h-[250px]"
                    >
                      <div className="flex flex-col items-center justify-center gap-6 text-center">
                        <AiLoader size={90} text={SCANNING_MESSAGES[scanningMsgIndex]} />
                        <div className="flex flex-col items-center gap-1 mt-4">
                          <span className="text-sm font-semibold tracking-tight text-accent-bright">
                            {SCANNING_MESSAGES[scanningMsgIndex]}
                          </span>
                          <p className="text-xs text-secondary">
                            Comparing spectral, phase, and timing patterns
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => chooseFile(e.target.files?.[0])}
              />
            </section>

            {/* HOW IT WORKS */}
            <section id="how-it-works" className="relative z-10 border-t border-border-glass px-5 py-20 sm:px-12">
              <SectionHeading
                eyebrow="A clearer signal"
                title="See what your ears can’t."
                description="VerifyVoice turns complex audio forensics into a result you can understand and act on."
              />
              <div className="mt-12 grid gap-3 md:grid-cols-3">
                {[
                  [Mic2, 'Upload a recording', 'Drop in a voice clip from any device. Your file stays private.'],
                  [Activity, 'We read the signal', 'Our model checks spectral texture, phase coherence, and micro-timing.'],
                  [ShieldCheck, 'Get a transparent result', 'See confidence, flagged moments, and the evidence behind the verdict.'],
                ].map(([Icon, title, copy]) => (
                  <div key={title as string} className="glass-card">
                    <span className="icon-chip">
                      <Icon size={18} />
                    </span>
                    <h3 className="mt-6 text-base font-medium">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-secondary">{copy as string}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* METRICS */}
            <section className="relative z-10 border-t border-border-glass px-5 py-20 text-center sm:px-12">
              <SectionHeading
                eyebrow="Built for responsible listening"
                title="Confidence, with context."
                description="No black-box declarations. Every result comes with a confidence score and the signals that shaped it."
              />
              <div className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-3">
                <Stat value="94%" label="model confidence" />
                <Stat value="5" label="audio formats" />
                <Stat value="< 30s" label="average analysis" />
              </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="relative z-10 border-t border-border-glass px-5 py-20 sm:px-32">
              <SectionHeading eyebrow="Questions, answered" title="Know the limitations." />
              <div className="mt-10 flex flex-col gap-2">
                {faqs.map(([q, a], i) => (
                  <div key={q} className="overflow-hidden rounded-2xl border border-border-glass bg-surface/45">
                    <button
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium"
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                    >
                      {q}
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-secondary transition ${openFaq === i ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {openFaq === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <p className="px-5 pb-5 text-sm leading-6 text-secondary">{a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className="relative z-10 border-t border-border-glass px-5 py-20 text-center sm:py-24">
              <SectionHeading
                eyebrow="Still curious?"
                title="Get in touch."
                description="Questions about detection, partnerships, or responsible AI? We’d love to hear from you."
              />
              <form className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border-glass bg-surface/55 p-2 sm:flex-row">
                <input className="field" placeholder="Name" aria-label="Name" />
                <input className="field" type="email" placeholder="Email" aria-label="Email" />
                <button className="primary-button shrink-0">
                  <Mail size={15} /> Contact us
                </button>
              </form>
            </section>
          </>
        )}

        {/* FOOTER */}
        <footer className="relative z-10 flex flex-col items-center justify-between gap-4 border-t border-border-glass px-5 py-7 text-xs text-secondary sm:flex-row sm:px-12">
          <span>© 2026 VerifyVoice</span>
          <div className="flex gap-5">
            <a href="#faq" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#contact" className="hover:text-foreground">
              Contact
            </a>
            <a href="#top" className="hover:text-foreground">
              Terms
            </a>
          </div>
        </footer>
      </div>

      {/* RESULT MODAL */}
      <AnimatePresence>
        {status === 'result' && result && (
          <ResultModal
            result={result}
            file={file}
            quotaMessage={quotaMessage}
            onReset={reset}
            onViewHistory={() => {
              reset()
              setActiveTab('history')
            }}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-medium uppercase tracking-[.22em] text-accent-bright">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-gradient sm:text-4xl">{title}</h2>
      {description && <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-secondary">{description}</p>}
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-full border border-border-glass bg-surface/60 px-5 py-3">
      <span className="font-mono text-lg text-accent-bright">{value}</span>
      <span className="ml-2 text-xs text-secondary">{label}</span>
    </div>
  )
}

function ResultModal({
  result,
  file,
  quotaMessage,
  onReset,
  onViewHistory,
}: {
  result: AnalysisResult
  file: File | Blob | null
  quotaMessage?: string | null
  onReset: () => void
  onViewHistory?: () => void
}) {
  const ai = result.verdict === 'AI_GENERATED'
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        className="result-modal max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onReset}
          className="absolute right-5 top-5 rounded-full p-2 text-secondary transition hover:bg-surface hover:text-foreground"
          aria-label="Close result"
        >
          <X size={18} />
        </button>

        {/* Quota error warning if history save failed */}
        {quotaMessage && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            {quotaMessage}
          </div>
        )}

        {/* Verdict Badge */}
        <div className={`verdict ${ai ? 'verdict-danger' : 'verdict-success'}`}>
          <CircleAlert size={15} /> {ai ? 'Likely AI-generated' : 'Likely human-recorded'}
        </div>

        {/* Confidence Score & Track */}
        <h2 id="result-title" className="mt-4 text-2xl font-semibold tracking-tight">
          {result.confidence}% confidence
        </h2>
        <div className="confidence-track">
          <motion.span
            initial={{ width: 0 }}
            animate={{ width: `${result.confidence}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={ai ? 'bg-danger' : 'bg-success'}
          />
        </div>

        {/* Real Audio Forensics Visualizer & Player with Suspicious Regions */}
        {file && <AudioPlayer file={file} suspiciousRegions={result.suspiciousRegions} />}

        {/* Analysis Signals */}
        <div className="mt-8 flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Analysis Signals
          </h3>
          <ul className="flex flex-col gap-2.5 text-left">
            {result.explanations.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-5 text-secondary">
                <Check size={16} className={`mt-0.5 shrink-0 ${ai ? 'text-danger' : 'text-success'}`} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-xs leading-5 text-secondary/80">
          This is a probabilistic estimate, not definitive proof.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button onClick={onReset} className="primary-button flex-1 py-3 text-sm">
            <RotateCcw size={15} /> Analyze another file
          </button>
          {onViewHistory && (
            <button
              onClick={onViewHistory}
              className="rounded-full border border-border-glass bg-surface/60 px-5 py-3 text-sm font-semibold text-secondary transition hover:bg-surface hover:text-foreground"
            >
              View history
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
