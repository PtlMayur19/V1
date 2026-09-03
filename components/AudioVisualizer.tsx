'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { type SuspiciousRegion } from '@/lib/analyzeAudio'

interface AudioVisualizerProps {
  file: File | Blob
  currentTime?: number
  duration?: number
  suspiciousRegions?: SuspiciousRegion[]
  selectedRegionId?: string | null
  onSeek?: (time: number) => void
  onSelectRegion?: (region: SuspiciousRegion) => void
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function AudioVisualizer({
  file,
  currentTime = 0,
  duration = 0,
  suspiciousRegions,
  selectedRegionId,
  onSeek,
  onSelectRegion,
}: AudioVisualizerProps) {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    let audioCtx: AudioContext | null = null

    async function decodeAudio() {
      try {
        setLoading(true)
        setError(null)

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextClass) {
          throw new Error('Web Audio API is not supported in this browser.')
        }

        audioCtx = new AudioContextClass()
        const arrayBuffer = await file.arrayBuffer()

        if (isCancelled) return

        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        if (isCancelled) return

        setAudioBuffer(decodedBuffer)
        setLoading(false)
      } catch (err: any) {
        console.error('Audio decoding error:', err)
        if (!isCancelled) {
          setError('Visualization unavailable')
          setLoading(false)
        }
      } finally {
        if (audioCtx && audioCtx.state !== 'closed') {
          try {
            await audioCtx.close()
          } catch (e) {
            // ignore close error
          }
        }
      }
    }

    decodeAudio()

    return () => {
      isCancelled = true
    }
  }, [file])

  if (loading) {
    return (
      <div className="my-4 flex h-48 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-border-glass bg-background/50 text-secondary">
        <Loader2 size={24} className="animate-spin text-accent-bright" />
        <span className="text-xs">Processing audio signal for visualization...</span>
      </div>
    )
  }

  if (error || !audioBuffer) {
    return (
      <div className="my-4 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-glass bg-background/40 p-6 text-center text-secondary">
        <AlertTriangle size={20} className="text-secondary/70" />
        <p className="text-xs font-medium text-foreground/80">{error || 'Visualization unavailable'}</p>
        <p className="text-[11px] text-secondary/60">Could not extract spectral data from the file format.</p>
      </div>
    )
  }

  const effectiveDuration = duration || audioBuffer.duration

  return (
    <div className="mt-2 flex flex-col gap-6">
      {/* Waveform Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-secondary">
          <span>Audio Waveform</span>
          <span className="text-[11px] font-normal tracking-normal text-secondary/70">
            {formatTime(effectiveDuration)} duration
          </span>
        </div>
        <WaveformCanvas
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={effectiveDuration}
          suspiciousRegions={suspiciousRegions}
          selectedRegionId={selectedRegionId}
          onSeek={onSeek}
          onSelectRegion={onSelectRegion}
        />
      </div>

      {/* Spectrogram Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-secondary">
          <span>Spectrogram</span>
          <span className="text-[11px] font-normal tracking-normal text-secondary/70">
            Time-Frequency Analysis
          </span>
        </div>
        <SpectrogramCanvas
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={effectiveDuration}
          suspiciousRegions={suspiciousRegions}
          selectedRegionId={selectedRegionId}
          onSeek={onSeek}
          onSelectRegion={onSelectRegion}
        />
      </div>
    </div>
  )
}

function WaveformCanvas({
  audioBuffer,
  currentTime,
  duration,
  suspiciousRegions,
  selectedRegionId,
  onSeek,
  onSelectRegion,
}: {
  audioBuffer: AudioBuffer
  currentTime: number
  duration: number
  suspiciousRegions?: SuspiciousRegion[]
  selectedRegionId?: string | null
  onSeek?: (time: number) => void
  onSelectRegion?: (region: SuspiciousRegion) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef<boolean>(false)
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number } | null>(null)

  const findRegionAtX = (x: number, width: number): SuspiciousRegion | null => {
    if (!suspiciousRegions || suspiciousRegions.length === 0 || duration <= 0) return null
    const clickRatio = x / width
    const timeAtX = clickRatio * duration

    return (
      suspiciousRegions.find(
        (r) => timeAtX >= r.startTime && timeAtX <= r.endTime
      ) || null
    )
  }

  const handleSeekFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const container = containerRef.current
    if (!container || duration <= 0) return
    const rect = container.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const seekRatio = x / rect.width
    const seekTime = seekRatio * duration

    // Check if clicked inside a suspicious region
    const hitRegion = findRegionAtX(x, rect.width)
    if (hitRegion && onSelectRegion) {
      onSelectRegion(hitRegion)
      onSeek?.(hitRegion.startTime)
    } else {
      onSeek?.(seekTime)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true
    handleSeekFromEvent(e)
  }

  const handleMouseMoveContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !suspiciousRegions || suspiciousRegions.length === 0 || duration <= 0) {
      setHoverTooltip(null)
      return
    }
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const hitRegion = findRegionAtX(x, rect.width)

    if (hitRegion) {
      setHoverTooltip({
        text: `Potential anomaly | ${formatTime(hitRegion.startTime)} – ${formatTime(hitRegion.endTime)} | Signal strength: ${Math.round(hitRegion.score * 100)}%`,
        x,
      })
    } else {
      setHoverTooltip(null)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSeekFromEvent(e)
      }
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [duration, onSeek, suspiciousRegions])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return
    const step = Math.max(1, duration * 0.02)
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      onSeek(Math.max(0, currentTime - step))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      onSeek(Math.min(duration, currentTime + step))
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const render = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.floor(rect.width)
      const height = 90

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Background
      ctx.fillStyle = '#070b18'
      ctx.fillRect(0, 0, width, height)

      // Render Suspicious Regions Background Overlays
      if (suspiciousRegions && suspiciousRegions.length > 0 && duration > 0) {
        suspiciousRegions.forEach((region) => {
          const rStartX = (region.startTime / duration) * width
          const rEndX = (region.endTime / duration) * width
          const rWidth = Math.max(4, rEndX - rStartX)
          const isSelected = selectedRegionId === region.id

          ctx.fillStyle = isSelected
            ? 'rgba(100, 173, 255, 0.35)'
            : 'rgba(100, 173, 255, 0.18)'
          ctx.fillRect(rStartX, 0, rWidth, height)

          // Boundaries
          ctx.strokeStyle = isSelected ? '#64adff' : 'rgba(100, 173, 255, 0.5)'
          ctx.lineWidth = isSelected ? 1.5 : 1
          ctx.beginPath()
          ctx.moveTo(rStartX, 0)
          ctx.lineTo(rStartX, height)
          ctx.moveTo(rEndX, 0)
          ctx.lineTo(rEndX, height)
          ctx.stroke()
        })
      }

      const pcmData = audioBuffer.getChannelData(0)
      const bufferLength = pcmData.length

      const barWidth = 3
      const gap = 1.5
      const step = barWidth + gap
      const numBars = Math.floor(width / step)
      const samplesPerBar = Math.floor(bufferLength / numBars)

      const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
      const cursorX = progressRatio * width
      const centerY = height / 2

      for (let i = 0; i < numBars; i++) {
        const start = Math.floor(i * samplesPerBar)
        let min = 1.0
        let max = -1.0

        for (let j = 0; j < samplesPerBar; j += 4) {
          const val = pcmData[start + j] || 0
          if (val < min) min = val
          if (val > max) max = val
        }

        const amplitude = Math.max(0.04, (max - min) / 2)
        const barHeight = amplitude * (height - 16)
        const x = i * step
        const y = centerY - barHeight / 2

        const barProgressRatio = x / width
        if (barProgressRatio <= progressRatio) {
          ctx.fillStyle = '#64adff'
          ctx.shadowBlur = 6
          ctx.shadowColor = 'rgba(100, 173, 255, 0.5)'
        } else {
          ctx.fillStyle = 'rgba(100, 173, 255, 0.22)'
          ctx.shadowBlur = 0
        }

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, Math.max(2, barHeight), 1.5)
        ctx.fill()
      }

      // Render vertical playback cursor line
      ctx.shadowBlur = 0
      if (progressRatio > 0 && progressRatio <= 1) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cursorX, 0)
        ctx.lineTo(cursorX, height)
        ctx.stroke()

        ctx.fillStyle = '#64adff'
        ctx.shadowBlur = 8
        ctx.shadowColor = '#64adff'
        ctx.beginPath()
        ctx.arc(cursorX, centerY, 3.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    render()

    const observer = new ResizeObserver(() => render())
    observer.observe(container)

    return () => observer.disconnect()
  }, [audioBuffer, currentTime, duration, suspiciousRegions, selectedRegionId])

  const timestamps = [
    '0:00',
    formatTime(duration * 0.25),
    formatTime(duration * 0.5),
    formatTime(duration * 0.75),
    formatTime(duration),
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Audio waveform timeline"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveContainer}
        onMouseLeave={() => setHoverTooltip(null)}
        onKeyDown={handleKeyDown}
        className="relative w-full overflow-hidden rounded-xl border border-border-glass cursor-pointer select-none focus:outline-none focus:ring-1 focus:ring-accent-bright"
      >
        <canvas ref={canvasRef} className="block w-full pointer-events-none" />

        {/* Hover Tooltip for Suspicious Regions */}
        {hoverTooltip && (
          <div
            style={{ left: Math.min(Math.max(10, hoverTooltip.x - 100), 280) }}
            className="absolute top-1 pointer-events-none rounded-lg bg-surface/95 border border-accent-bright/40 px-2.5 py-1 text-[10px] font-mono text-accent-bright shadow-lg backdrop-blur-md z-10"
          >
            {hoverTooltip.text}
          </div>
        )}
      </div>
      <div className="flex justify-between px-1 text-[10px] font-mono text-secondary/70">
        {timestamps.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>
    </div>
  )
}

function SpectrogramCanvas({
  audioBuffer,
  currentTime,
  duration,
  suspiciousRegions,
  selectedRegionId,
  onSeek,
  onSelectRegion,
}: {
  audioBuffer: AudioBuffer
  currentTime: number
  duration: number
  suspiciousRegions?: SuspiciousRegion[]
  selectedRegionId?: string | null
  onSeek?: (time: number) => void
  onSelectRegion?: (region: SuspiciousRegion) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current
    if (!container || !suspiciousRegions || suspiciousRegions.length === 0 || duration <= 0) return
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickRatio = x / rect.width
    const timeAtX = clickRatio * duration

    const hitRegion = suspiciousRegions.find(
      (r) => timeAtX >= r.startTime && timeAtX <= r.endTime
    )
    if (hitRegion) {
      onSelectRegion?.(hitRegion)
      onSeek?.(hitRegion.startTime)
    } else {
      onSeek?.(timeAtX)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const render = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      const width = Math.floor(rect.width)
      const height = 140

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      ctx.fillStyle = '#070b18'
      ctx.fillRect(0, 0, width, height)

      const pcmData = audioBuffer.getChannelData(0)
      const totalSamples = pcmData.length

      const fftSize = 256
      const halfFFT = fftSize / 2
      const numCols = Math.min(width, 300)
      const colWidth = width / numCols
      const samplesPerCol = Math.floor(totalSamples / numCols)

      const hanning = new Float32Array(fftSize)
      for (let i = 0; i < fftSize; i++) {
        hanning[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)))
      }

      const numBins = 48
      const cosTable: number[][] = []
      const sinTable: number[][] = []
      for (let k = 0; k < numBins; k++) {
        cosTable[k] = []
        sinTable[k] = []
        const freqBin = Math.floor((k / numBins) * halfFFT)
        for (let n = 0; n < fftSize; n++) {
          const angle = (2 * Math.PI * freqBin * n) / fftSize
          cosTable[k][n] = Math.cos(angle)
          sinTable[k][n] = Math.sin(angle)
        }
      }

      for (let col = 0; col < numCols; col++) {
        const startSample = Math.floor(col * samplesPerCol)
        if (startSample + fftSize > totalSamples) break

        const magnitudes = new Float32Array(numBins)
        for (let k = 0; k < numBins; k++) {
          let real = 0
          let imag = 0
          for (let n = 0; n < fftSize; n += 2) {
            const val = pcmData[startSample + n] * hanning[n]
            real += val * cosTable[k][n]
            imag -= val * sinTable[k][n]
          }
          const mag = Math.sqrt(real * real + imag * imag)
          magnitudes[k] = Math.min(1, Math.max(0, Math.log10(1 + mag * 12) / 1.2))
        }

        const x = col * colWidth
        const binHeight = height / numBins

        for (let k = 0; k < numBins; k++) {
          const mag = magnitudes[k]
          const y = height - (k + 1) * binHeight

          let color: string
          if (mag < 0.15) {
            color = '#070b18'
          } else if (mag < 0.35) {
            color = '#0d2149'
          } else if (mag < 0.6) {
            color = '#1767ff'
          } else if (mag < 0.85) {
            color = '#3b82f6'
          } else {
            color = '#64adff'
          }

          ctx.fillStyle = color
          ctx.fillRect(x, y, colWidth + 0.5, binHeight + 0.5)
        }
      }

      // Render Suspicious Region Overlays on Spectrogram
      if (suspiciousRegions && suspiciousRegions.length > 0 && duration > 0) {
        suspiciousRegions.forEach((region) => {
          const rStartX = (region.startTime / duration) * width
          const rEndX = (region.endTime / duration) * width
          const rWidth = Math.max(4, rEndX - rStartX)
          const isSelected = selectedRegionId === region.id

          ctx.fillStyle = isSelected
            ? 'rgba(100, 173, 255, 0.35)'
            : 'rgba(100, 173, 255, 0.18)'
          ctx.fillRect(rStartX, 0, rWidth, height)

          ctx.strokeStyle = isSelected ? '#64adff' : 'rgba(100, 173, 255, 0.5)'
          ctx.lineWidth = isSelected ? 1.5 : 1
          ctx.beginPath()
          ctx.moveTo(rStartX, 0)
          ctx.lineTo(rStartX, height)
          ctx.moveTo(rEndX, 0)
          ctx.lineTo(rEndX, height)
          ctx.stroke()
        })
      }

      // Synchronized Vertical Playback Line
      const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
      if (progressRatio > 0 && progressRatio <= 1) {
        const cursorX = progressRatio * width
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.shadowBlur = 6
        ctx.shadowColor = '#64adff'
        ctx.beginPath()
        ctx.moveTo(cursorX, 0)
        ctx.lineTo(cursorX, height)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
    }

    render()

    const observer = new ResizeObserver(() => render())
    observer.observe(container)

    return () => observer.disconnect()
  }, [audioBuffer, currentTime, duration, suspiciousRegions, selectedRegionId])

  const timestamps = [
    '0:00',
    formatTime(duration * 0.25),
    formatTime(duration * 0.5),
    formatTime(duration * 0.75),
    formatTime(duration),
  ]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {/* Frequency Y-Axis Labels */}
        <div className="flex flex-col justify-between py-1 text-[10px] font-mono text-secondary/80 select-none">
          <span>8 kHz ┤</span>
          <span>6 kHz ┤</span>
          <span>4 kHz ┤</span>
          <span>2 kHz ┤</span>
          <span>0 Hz  ┤</span>
        </div>

        {/* Spectrogram Canvas Container */}
        <div
          ref={containerRef}
          onClick={handleCanvasClick}
          className="relative flex-1 overflow-hidden rounded-xl border border-border-glass cursor-pointer select-none"
        >
          <canvas ref={canvasRef} className="block w-full pointer-events-none" />
        </div>
      </div>

      {/* Time X-Axis */}
      <div className="flex justify-between pl-12 pr-1 text-[10px] font-mono text-secondary/70">
        {timestamps.map((t, idx) => (
          <span key={idx}>{t}</span>
        ))}
      </div>
      <div className="text-center text-[10px] tracking-wider uppercase text-secondary/60">
        Time
      </div>
    </div>
  )
}
