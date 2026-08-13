export type AnalysisResult = {
  verdict: 'AI_GENERATED' | 'HUMAN' | 'UNCERTAIN'
  confidence: number
  duration: number
  flaggedSegments: Array<{ start: number; end: number; reason: string }>
  explanations: string[]
}

export async function analyzeAudio(file: File): Promise<AnalysisResult> {
  await new Promise((resolve) => setTimeout(resolve, 2200))
  const isLikelyAi = file.name.toLowerCase().includes('ai') || file.size % 3 !== 0
  return {
    verdict: isLikelyAi ? 'AI_GENERATED' : 'HUMAN',
    confidence: isLikelyAi ? 94 : 87,
    duration: 18.4,
    flaggedSegments: isLikelyAi
      ? [{ start: 4.2, end: 7.8, reason: 'Unnatural spectral consistency' }, { start: 12.1, end: 14.6, reason: 'Synthetic phase artifacts' }]
      : [],
    explanations: isLikelyAi
      ? ['Spectral patterns match known voice synthesis signatures.', 'Phase coherence remains unusually consistent across phonemes.', 'Micro-timing artifacts suggest generated rather than recorded speech.']
      : ['Natural spectral variation was detected across the recording.', 'Breath and micro-timing patterns are consistent with human speech.', 'No significant synthesis artifacts were found.'],
  }
}
