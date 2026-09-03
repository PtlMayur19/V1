'use client'

import * as React from 'react'

interface LoaderProps {
  size?: number
  text?: string
}

export const Component: React.FC<LoaderProps> = ({ size = 90, text = 'Scanning' }) => {
  const letters = text.split('')

  // 7 equalizer bars simulating voice signal signature scanning
  const barHeights = [18, 36, 52, 42, 28, 46, 22]

  return (
    <div className="relative flex flex-col items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Outer Glowing Energy Ring */}
      <div
        className="absolute inset-0 rounded-full animate-loaderCircle pointer-events-none"
        aria-hidden="true"
      />

      {/* Voice Signal Equalizer Bars */}
      <div className="relative flex items-center justify-center gap-[4px] z-10">
        {barHeights.map((h, index) => (
          <span
            key={index}
            className="w-[3.5px] rounded-full bg-gradient-to-t from-[#1767ff] via-[#38bdf8] to-[#64adff] animate-barPulse shadow-[0_0_8px_rgba(100,173,255,0.7)]"
            style={{
              height: `${h}px`,
              animationDelay: `${index * 0.12}s`,
              animationDuration: `${1.1 + (index % 3) * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Animated Text */}
      <div className="absolute -bottom-6 flex items-center gap-[1px] text-[11px] font-medium tracking-wide text-accent-bright whitespace-nowrap z-10">
        {letters.map((letter, index) => (
          <span
            key={index}
            className="inline-block opacity-70 animate-loaderLetter"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(0deg);
            box-shadow:
              0 4px 10px 0 #38bdf8 inset,
              0 8px 14px 0 #1767ff inset,
              0 20px 24px 0 #0b1630 inset,
              0 0 12px 2px rgba(56, 189, 248, 0.4),
              0 0 20px 4px rgba(23, 103, 255, 0.25);
          }
          50% {
            transform: rotate(180deg);
            box-shadow:
              0 4px 10px 0 #60a5fa inset,
              0 8px 10px 0 #0284c7 inset,
              0 18px 24px 0 #1767ff inset,
              0 0 14px 3px rgba(100, 173, 255, 0.5),
              0 0 24px 6px rgba(23, 103, 255, 0.3);
          }
          100% {
            transform: rotate(360deg);
            box-shadow:
              0 4px 10px 0 #38bdf8 inset,
              0 8px 14px 0 #1767ff inset,
              0 20px 24px 0 #0b1630 inset,
              0 0 12px 2px rgba(56, 189, 248, 0.4),
              0 0 20px 4px rgba(23, 103, 255, 0.25);
          }
        }

        @keyframes barPulse {
          0%, 100% {
            transform: scaleY(0.4);
            opacity: 0.5;
          }
          50% {
            transform: scaleY(1.15);
            opacity: 1;
          }
        }

        @keyframes loaderLetter {
          0%, 100% {
            opacity: 0.5;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        .animate-loaderCircle {
          animation: loaderCircle 4s linear infinite;
        }

        .animate-barPulse {
          animation: barPulse 1.2s ease-in-out infinite;
        }

        .animate-loaderLetter {
          animation: loaderLetter 2.4s infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-loaderCircle,
          .animate-barPulse,
          .animate-loaderLetter {
            animation: none !important;
            transform: none !important;
            opacity: 0.9 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default Component
