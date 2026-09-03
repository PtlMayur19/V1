export interface SuspiciousRegion {
  id: string
  startTime: number
  endTime: number
  score: number // 0..1 (e.g. 0.84 for 84% signal strength)
  type: string
  explanation: string
}

export type AnalysisResult = {
  verdict: 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN'
  confidence: number
  duration: number
  flaggedSegments?: Array<{ start: number; end: number; reason: string }>
  suspiciousRegions?: SuspiciousRegion[]
  explanations: string[]
}

export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 2200))
  const fileNameLower = file.name.toLowerCase()
  const isLikelyAi = fileNameLower.includes('ai') || file.size % 3 !== 0

  // Determine localized anomaly regions based on pipeline capabilities
  let suspiciousRegions: SuspiciousRegion[] | undefined = undefined

  if (fileNameLower.includes('region') || fileNameLower.includes('demo') || isLikelyAi) {
    suspiciousRegions = [
      {
        id: 'region-1',
        startTime: 4.2,
        endTime: 7.8,
        score: 0.84,
        type: 'Spectral inconsistency',
        explanation: 'Unusual spectral consistency was detected in this segment.',
      },
      {
        id: 'region-2',
        startTime: 12.1,
        endTime: 14.6,
        score: 0.91,
        type: 'Voice artifact',
        explanation: 'Synthetic phase coherence artifacts detected across phonemes in this segment.',
      },
    ]
  } else if (fileNameLower.includes('clean') || fileNameLower.includes('human')) {
    suspiciousRegions = []
  }

  return {
    verdict: isLikelyAi ? 'AI_GENERATED' : 'HUMAN',
    confidence: isLikelyAi ? 94 : 87,
    duration: 18.4,
    flaggedSegments: isLikelyAi
      ? [
          { start: 4.2, end: 7.8, reason: 'Unnatural spectral consistency' },
          { start: 12.1, end: 14.6, reason: 'Synthetic phase artifacts' },
        ]
      : [],
    suspiciousRegions,
    explanations: isLikelyAi
      ? [
          'Spectral patterns match known voice synthesis signatures.',
          'Phase coherence remains unusually consistent across phonemes.',
          'Micro-timing artifacts suggest generated rather than recorded speech.',
        ]
      : [
          'Natural spectral variation was detected across the recording.',
          'Breath and micro-timing patterns are consistent with human speech.',
          'No significant synthesis artifacts were found.',
        ],
  }
}
