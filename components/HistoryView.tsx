'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight, ChevronDown, CircleAlert, FileAudio, Headphones, Search, Trash2, Upload, X } from 'lucide-react'
import { type HistoryItem } from '@/lib/historyDb'

interface HistoryViewProps {
  items: HistoryItem[]
  onSelectHistoryItem: (item: HistoryItem) => void
  onDeleteItem: (id: string) => Promise<boolean> | void
  onClearAll: () => Promise<boolean> | void
  onNavigateToUpload: () => void
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const isYesterday =
    new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString()

  const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    return `Today, ${timeStr}`
  }
  if (isYesterday) {
    return `Yesterday, ${timeStr}`
  }

  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  return `${dateStr}, ${timeStr}`
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function HistoryView({
  items,
  onSelectHistoryItem,
  onDeleteItem,
  onClearAll,
  onNavigateToUpload,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'HUMAN' | 'AI_GENERATED' | 'UNCERTAIN'>('ALL')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_confidence' | 'lowest_confidence'>('newest')

  const [deletingItem, setDeletingItem] = useState<HistoryItem | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // 1. Calculate Global Statistics from COMPLETE IndexedDB dataset
  const globalStats = useMemo(() => {
    const total = items.length
    let human = 0
    let ai = 0
    let uncertain = 0

    items.forEach((item) => {
      if (item.result.verdict === 'HUMAN') human++
      else if (item.result.verdict === 'AI_GENERATED') ai++
      else if (item.result.verdict === 'UNCERTAIN') uncertain++
    })

    return { total, human, ai, uncertain }
  }, [items])

  // 2. Data Pipeline: Search -> Filter -> Sort
  const filteredItems = useMemo(() => {
    let list = [...items]

    // Search by filename (case-insensitive)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter((item) => item.filename.toLowerCase().includes(q))
    }

    // Filter by verdict
    if (verdictFilter !== 'ALL') {
      list = list.filter((item) => item.result.verdict === verdictFilter)
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp
      if (sortBy === 'oldest') return a.timestamp - b.timestamp
      if (sortBy === 'highest_confidence') return b.result.confidence - a.result.confidence
      if (sortBy === 'lowest_confidence') return a.result.confidence - b.result.confidence
      return 0
    })

    return list
  }, [items, searchQuery, verdictFilter, sortBy])

  const isFilteringActive = searchQuery.trim() !== '' || verdictFilter !== 'ALL'

  const handleConfirmSingleDelete = async () => {
    if (!deletingItem) return
    setDeleteError(null)
    try {
      const res = await onDeleteItem(deletingItem.id)
      if (res === false) {
        setDeleteError(`Failed to delete analysis for "${deletingItem.filename}".`)
      } else {
        setDeletingItem(null)
      }
    } catch (err) {
      console.error('Delete error:', err)
      setDeleteError(`Failed to delete analysis for "${deletingItem.filename}".`)
    }
  }

  const handleConfirmClearAll = async () => {
    setDeleteError(null)
    try {
      const res = await onClearAll()
      if (res === false) {
        setDeleteError('Failed to clear history from browser storage.')
      } else {
        setShowClearConfirm(false)
        setSearchQuery('')
        setVerdictFilter('ALL')
        setSortBy('newest')
      }
    } catch (err) {
      console.error('Clear all error:', err)
      setDeleteError('Failed to clear history from browser storage.')
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between gap-4 border-b border-border-glass pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[.22em] text-accent-bright">
            ANALYSIS ARCHIVE
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-gradient sm:text-4xl">
            Analysis History
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Review your previous voice authenticity analyses.
          </p>
        </div>

        {globalStats.total > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 self-start rounded-full border border-border-glass bg-surface/60 px-4 py-2 text-xs font-medium text-secondary transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger sm:self-auto"
            aria-label="Clear all history"
          >
            <Trash2 size={14} /> Clear all history
          </button>
        )}
      </div>

      {/* CONTROLS TOOLBAR */}
      {globalStats.total > 0 && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              aria-label="Search files by filename"
              className="w-full rounded-full border border-border-glass bg-surface/60 pl-10 pr-9 py-2.5 text-xs text-foreground placeholder:text-secondary/70 outline-none backdrop-blur-md transition hover:border-accent-bright/50 hover:bg-surface/80 focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground"
                aria-label="Clear search query"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Glassmorphism Dropdowns Row */}
          <div className="flex items-center gap-2.5">
            {/* Verdict Filter Select Container */}
            <div className="relative min-w-[165px] sm:w-[175px]">
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as any)}
                aria-label="Filter by verdict"
                className="w-full appearance-none rounded-full border border-border-glass bg-surface/60 pl-4 pr-9 py-2.5 text-xs text-foreground outline-none cursor-pointer backdrop-blur-md transition hover:border-accent-bright/50 hover:bg-surface/80 focus:border-accent"
              >
                <option value="ALL" className="bg-[#070b18] text-foreground">
                  All results
                </option>
                <option value="HUMAN" className="bg-[#070b18] text-foreground">
                  Likely human-recorded
                </option>
                <option value="AI_GENERATED" className="bg-[#070b18] text-foreground">
                  Likely AI-generated
                </option>
                <option value="UNCERTAIN" className="bg-[#070b18] text-foreground">
                  Uncertain
                </option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>

            {/* Sort Select Container */}
            <div className="relative min-w-[145px] sm:w-[155px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort analyses"
                className="w-full appearance-none rounded-full border border-border-glass bg-surface/60 pl-4 pr-9 py-2.5 text-xs text-foreground outline-none cursor-pointer backdrop-blur-md transition hover:border-accent-bright/50 hover:bg-surface/80 focus:border-accent"
              >
                <option value="newest" className="bg-[#070b18] text-foreground">
                  Newest first
                </option>
                <option value="oldest" className="bg-[#070b18] text-foreground">
                  Oldest first
                </option>
                <option value="highest_confidence" className="bg-[#070b18] text-foreground">
                  Highest confidence
                </option>
                <option value="lowest_confidence" className="bg-[#070b18] text-foreground">
                  Lowest confidence
                </option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary"
              />
            </div>
          </div>
        </div>
      )}

      {/* ERROR BANNER IF DELETION FAILS */}
      {deleteError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <AlertCircle size={15} /> {deleteError}
        </div>
      )}

      {/* GLOBAL STATISTICS SECTION */}
      {globalStats.total > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border-glass bg-surface/40 p-4 backdrop-blur-md">
          <div className="flex items-center gap-2 border-r border-border-glass/60 pr-4">
            <span className="font-mono text-base font-semibold text-accent-bright">
              {globalStats.total}
            </span>
            <span className="text-xs text-secondary">
              analys{globalStats.total === 1 ? 'is' : 'es'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-success" />
              <span className="text-secondary">Likely human</span>
              <span className="font-mono font-semibold text-foreground">{globalStats.human}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-danger" />
              <span className="text-secondary">Likely AI</span>
              <span className="font-mono font-semibold text-foreground">{globalStats.ai}</span>
            </div>

            {globalStats.uncertain > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" />
                <span className="text-secondary">Uncertain</span>
                <span className="font-mono font-semibold text-foreground">{globalStats.uncertain}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT COUNT HEADER */}
      {globalStats.total > 0 && (
        <div className="mt-6 text-xs text-secondary">
          {isFilteringActive ? (
            <span>
              Showing <strong className="text-foreground">{filteredItems.length}</strong> of{' '}
              <strong className="text-foreground">{globalStats.total}</strong> analyses
            </span>
          ) : (
            <span>
              <strong className="text-foreground">{globalStats.total}</strong> analyses
            </span>
          )}
        </div>
      )}

      {/* CONTENT LIST / DUAL EMPTY STATES */}
      <div className="mt-4">
        {/* STATE A: NO HISTORY AT ALL */}
        {globalStats.total === 0 ? (
          <div className="my-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-glass bg-surface/30 p-12 text-center backdrop-blur-md">
            <div className="grid size-14 place-items-center rounded-2xl bg-accent/10 text-accent-bright">
              <Headphones size={28} />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">No analyses yet</h3>
            <p className="mt-2 max-w-sm text-sm text-secondary">
              Upload an audio recording to start your first analysis.
            </p>
            <button onClick={onNavigateToUpload} className="primary-button mt-6 text-sm">
              <Upload size={16} /> Analyze audio
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          /* STATE B: SEARCH/FILTER RETURNS 0 MATCHES */
          <div className="my-10 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border-glass bg-surface/20 p-10 text-center backdrop-blur-sm">
            <Search size={32} className="text-secondary/60" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight">No matching analyses</h3>
            <p className="mt-1 text-xs text-secondary">
              Try a different filename or change the filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setVerdictFilter('ALL')
              }}
              className="mt-5 rounded-full border border-border-glass bg-surface/60 px-4 py-2 text-xs font-semibold text-accent-bright transition hover:bg-surface hover:text-foreground"
            >
              Clear search
            </button>
          </div>
        ) : (
          /* HISTORY CARDS LIST */
          <div className="flex flex-col gap-4">
            {filteredItems.map((item) => {
              const ai = item.result.verdict === 'AI_GENERATED'
              const uncertain = item.result.verdict === 'UNCERTAIN'

              let verdictClass = 'verdict-success'
              let verdictText = 'Likely human-recorded'
              if (ai) {
                verdictClass = 'verdict-danger'
                verdictText = 'Likely AI-generated'
              } else if (uncertain) {
                verdictClass = 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                verdictText = 'Uncertain verdict'
              }

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="glass-card flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center"
                >
                  {/* File & Metadata Info */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-bright">
                      <FileAudio size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {item.filename}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {formatDate(item.timestamp)} • {(item.fileSize / 1024 / 1024).toFixed(2)} MB • {formatDuration(item.duration)}
                      </p>
                    </div>
                  </div>

                  {/* Verdict & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-glass/40 sm:border-t-0 sm:pt-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`verdict ${verdictClass}`}>
                        <CircleAlert size={14} /> {verdictText}
                      </span>
                      <span className="font-mono text-xs font-semibold text-accent-bright">
                        {item.result.confidence}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeletingItem(item)}
                        className="rounded-full p-2 text-secondary transition hover:bg-danger/15 hover:text-danger"
                        title={`Delete analysis for ${item.filename}`}
                        aria-label={`Delete analysis for ${item.filename}`}
                      >
                        <Trash2 size={15} />
                      </button>
                      <button
                        onClick={() => onSelectHistoryItem(item)}
                        className="primary-button text-xs py-2 px-3.5"
                      >
                        View analysis <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL FOR SINGLE ITEM DELETION */}
      {deletingItem && (
        <div className="modal-backdrop">
          <div className="result-modal max-w-md text-center">
            <h3 className="text-xl font-semibold tracking-tight">Delete analysis?</h3>
            <p className="mt-2 text-sm text-secondary">
              Are you sure you want to delete <strong className="text-foreground">"{deletingItem.filename}"</strong>?
              <br />
              This will remove the saved analysis and audio from your history.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingItem(null)}
                className="rounded-full border border-border-glass px-5 py-2.5 text-xs font-medium text-secondary transition hover:bg-surface hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                className="rounded-full bg-danger px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-danger/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR CLEAR ALL HISTORY */}
      {showClearConfirm && (
        <div className="modal-backdrop">
          <div className="result-modal max-w-md text-center">
            <h3 className="text-xl font-semibold tracking-tight">Clear all history?</h3>
            <p className="mt-2 text-sm text-secondary">
              This will permanently remove all saved analyses and audio recordings from your history.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-full border border-border-glass px-5 py-2.5 text-xs font-medium text-secondary transition hover:bg-surface hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="rounded-full bg-danger px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition hover:bg-danger/90"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
