'use client'

import { Activity, AlertCircle, CheckCircle2, Play, ShieldAlert } from 'lucide-react'
import { type SuspiciousRegion } from '@/lib/analyzeAudio'

interface SuspiciousRegionsPanelProps {
  suspiciousRegions?: SuspiciousRegion[]
  selectedRegionId?: string | null
  onSelectRegion?: (region: SuspiciousRegion) => void
  onPlayRegion?: (region: SuspiciousRegion) => void
}

function formatDetailedTime(seconds: number): string {
  if (seconds === undefined || isNaN(seconds)) return '00:00.0'
  const mins = Math.floor(seconds / 60)
  const secs = (seconds % 60).toFixed(1)
  const padSecs = parseFloat(secs) < 10 ? `0${secs}` : secs
  return `${mins < 10 ? '0' : ''}${mins}:${padSecs}`
}

export default function SuspiciousRegionsPanel({
  suspiciousRegions,
  selectedRegionId,
  onSelectRegion,
  onPlayRegion,
}: SuspiciousRegionsPanelProps) {
  // State 1: Localized analysis unavailable
  if (suspiciousRegions === undefined) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Suspicious Regions
          </h3>
          <span className="text-[11px] font-medium text-secondary/70">
            Localized Analysis Unavailable
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border-glass bg-surface/40 p-4 text-secondary">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-secondary/70" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-foreground/90">
              Localized analysis unavailable
            </p>
            <p className="text-[11px] leading-5 text-secondary">
              The current analysis provides an overall authenticity estimate but does not identify specific timestamps.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // State 2: No localized anomalies detected
  if (suspiciousRegions.length === 0) {
    return (
      <div className="mt-8 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Suspicious Regions
          </h3>
          <span className="text-[11px] font-medium text-success/80 flex items-center gap-1">
            <CheckCircle2 size={13} /> Clean signal
          </span>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-border-glass bg-success/5 p-4 text-secondary">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-foreground/90">
              No localized anomalies detected
            </p>
            <p className="text-[11px] leading-5 text-secondary">
              Your recording did not contain segments that exceeded the current localized analysis threshold.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // State 3: Localized regions present
  return (
    <div className="mt-8 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary">
          Suspicious Regions
        </h3>
        <span className="text-[11px] font-medium text-accent-bright flex items-center gap-1">
          <ShieldAlert size={13} /> {suspiciousRegions.length} potentially unusual segment{suspiciousRegions.length > 1 ? 's' : ''} detected
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {suspiciousRegions.map((region) => {
          const isSelected = selectedRegionId === region.id
          const signalPercent = Math.round(region.score * 100)

          return (
            <div
              key={region.id}
              role="button"
              tabIndex={0}
              aria-label={`Potential anomaly from ${region.startTime.toFixed(1)} seconds to ${region.endTime.toFixed(1)} seconds`}
              onClick={() => onSelectRegion?.(region)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectRegion?.(region)
                }
              }}
              className={`flex flex-col gap-3 rounded-2xl border p-4 transition cursor-pointer ${
                isSelected
                  ? 'border-accent-bright bg-accent/15 shadow-[0_0_20px_rgba(23,103,255,0.2)]'
                  : 'border-border-glass bg-surface/50 hover:border-accent-bright/50 hover:bg-surface/80'
              }`}
            >
              {/* Region Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-accent-bright">
                    {formatDetailedTime(region.startTime)} – {formatDetailedTime(region.endTime)}
                  </span>
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent-bright">
                    Potential anomaly
                  </span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs text-secondary">
                  <Activity size={13} className="text-accent-bright" />
                  <span>Signal strength: <strong className="text-foreground">{signalPercent}%</strong></span>
                </div>
              </div>

              {/* Signal Type & Explanation */}
              <div className="flex flex-col gap-1 text-left">
                <h4 className="text-sm font-semibold tracking-tight text-foreground">
                  {region.type}
                </h4>
                <p className="text-xs leading-5 text-secondary">
                  {region.explanation}
                </p>
              </div>

              {/* Play Region Action */}
              <div className="flex items-center justify-between pt-2 border-t border-border-glass/40">
                <span className="text-[11px] text-secondary/70">
                  Segment duration: {(region.endTime - region.startTime).toFixed(1)}s
                </span>
                <button
                  type="button"
                  aria-label="Play suspicious region"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectRegion?.(region)
                    onPlayRegion?.(region)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 border border-accent-bright/30 px-3 py-1.5 text-xs font-semibold text-accent-bright transition hover:bg-accent hover:text-white"
                >
                  <Play size={12} fill="currentColor" /> Play region
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
