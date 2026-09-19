import { useState } from 'react'

interface PiPVideoModalProps {
  exerciseName: string
  instructions: string
  onClose: () => void
}

export default function PiPVideoModal({ exerciseName, instructions, onClose }: PiPVideoModalProps) {
  const [playing, setPlaying] = useState(false)
  const [minimized, setMinimized] = useState(false)

  const thumb = `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=640&h=360&fit=crop&auto=format`

  if (minimized) {
    return (
      <div
        className="fixed bottom-20 md:bottom-6 right-4 z-50 rounded-xl overflow-hidden cursor-pointer shadow-2xl"
        style={{ background: '#111116', border: '1px solid #2a2a35', width: 200 }}
        onClick={() => setMinimized(false)}
      >
        <div className="relative">
          <img src={thumb} alt={exerciseName} className="w-full h-24 object-cover opacity-60" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#e63946' }}>
              <span className="text-white text-sm">▶</span>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 text-xs font-medium truncate" style={{ color: '#c0c0cc' }}>
          {exerciseName}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-50 rounded-xl overflow-hidden shadow-2xl"
      style={{ background: '#111116', border: '1px solid #2a2a35', width: 320, maxWidth: 'calc(100vw - 32px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #2a2a35' }}>
        <span className="text-sm font-semibold" style={{ fontFamily: 'Barlow Condensed, sans-serif', color: '#f0f0f5', letterSpacing: '0.04em' }}>
          {exerciseName.toUpperCase()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized(true)}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-colors hover:bg-white/5"
            style={{ color: '#888899' }}
          >
            _
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-colors hover:bg-white/5"
            style={{ color: '#888899' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="relative" style={{ aspectRatio: '16/9', background: '#0a0a0c' }}>
        <img src={thumb} alt={exerciseName} className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setPlaying(!playing)}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105"
            style={{ background: playing ? 'rgba(0,0,0,0.7)' : '#e63946', border: playing ? '2px solid #e63946' : 'none' }}
          >
            <span className="text-white text-xl">{playing ? '⏸' : '▶'}</span>
          </button>
        </div>
        {playing && (
          <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#2a2a35' }}>
              <div className="h-full rounded-full w-1/3" style={{ background: '#e63946' }} />
            </div>
            <span className="text-xs" style={{ color: '#888899', fontFamily: 'JetBrains Mono, monospace' }}>0:12 / 0:45</span>
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold" style={{ background: '#e63946', color: '#fff', fontFamily: 'Barlow Condensed, sans-serif', letterSpacing: '0.06em' }}>
          TUTORIAL
        </div>
      </div>

      {/* Instructions */}
      <div className="px-4 py-3">
        <div className="text-xs leading-relaxed" style={{ color: '#888899' }}>
          {instructions}
        </div>
      </div>
    </div>
  )
}
