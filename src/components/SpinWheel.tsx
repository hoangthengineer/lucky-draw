import { useRef, useState, useCallback } from 'react'
import type { Prize, Participant, DrawRecord } from '../types'
import './SpinWheel.css'

// Exclude already drawn (by history) from pool; if all drawn, use full list for display only
function getDrawPool(participants: Participant[], history: DrawRecord[]): Participant[] {
  const drawnIds = new Set(history.map((h) => h.participantId))
  const available = participants.filter((p) => !drawnIds.has(p.id))
  return available.length > 0 ? available : participants
}

const POINTER_SVG = (
  <svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 0L48 32H0L24 0Z" fill="url(#ptr)" />
    <defs>
      <linearGradient id="ptr" x1="24" y1="0" x2="24" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#f0d78c" />
        <stop offset="1" stopColor="#d4af37" />
      </linearGradient>
    </defs>
  </svg>
)

const CONFETTI_COLORS = ['#d4af37', '#e8c547', '#f5e6c8', '#c41e3a', '#7cb083', '#9a8f7f']

interface SpinWheelProps {
  prizes: Prize[]
  participants: Participant[]
  history: DrawRecord[]
  onDraw: (record: Omit<DrawRecord, 'id'>) => void
  disabled?: boolean
}

export default function SpinWheel({ prizes, participants, history, onDraw, disabled }: SpinWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(prizes[0]?.id ?? '')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<{ name: string; prizeName: string; displayNumber: number; phone?: string } | null>(null)
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number }[]>([])

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId)
  const availableParticipants = getDrawPool(participants, history)

  const addConfetti = useCallback(() => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.5,
    }))
    setConfetti(items)
    setTimeout(() => setConfetti([]), 2600)
  }, [])

  const spin = useCallback(() => {
    if (!selectedPrize || spinning || disabled) return
    const pool = availableParticipants.length ? [...availableParticipants] : [...participants]
    if (pool.length === 0) {
      setResult({ name: '— No participants —', prizeName: selectedPrize.name, displayNumber: history.length + 1, phone: undefined })
      return
    }
    const winner = pool[Math.floor(Math.random() * pool.length)]
    const fullRotation = 360 * (5 + Math.random() * 3)
    const segmentAngle = 360 / Math.max(prizes.length, 1)
    const prizeIndex = prizes.findIndex((p) => p.id === selectedPrizeId)
    const targetAngle = 360 - (prizeIndex * segmentAngle + segmentAngle / 2) + 90
    const finalRotation = rotation + fullRotation + targetAngle

    setSpinning(true)
    setResult(null)
    setRotation(finalRotation)

    const duration = 5200
    const t = setTimeout(() => {
      setSpinning(false)
      setResult({ name: winner.name, prizeName: selectedPrize.name, displayNumber: history.length + 1, phone: winner.phone })
      onDraw({
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        participantId: winner.id,
        participantName: winner.name,
        participantPhone: winner.phone,
        drawnAt: Date.now(),
      })
      addConfetti()
    }, duration)
    return () => clearTimeout(t)
  }, [selectedPrize, participants, history, availableParticipants, prizes, selectedPrizeId, spinning, disabled, rotation, onDraw, addConfetti])

  if (prizes.length === 0) {
    return (
      <div className="wheel-wrap">
        <p style={{ color: 'var(--text-muted)' }}>Add at least one prize to spin.</p>
      </div>
    )
  }

  const segmentAngle = 360 / prizes.length

  return (
    <div className="wheel-wrap">
      <div className="wheel-stage">
        <div className={`wheel-container ${spinning ? 'wheel-spinning' : ''}`}>
          <div className="wheel-pointer">{POINTER_SVG}</div>
          <div className="wheel-outer">
            <div ref={wheelRef} className="wheel-inner" style={{ transform: `rotate(${rotation}deg)` }}>
              {prizes.map((p, i) => (
                <div
                  key={p.id}
                  className="wheel-segment"
                  style={{
                    transform: `rotate(${i * segmentAngle}deg)`,
                    background: `linear-gradient(180deg, ${p.color} 0%, ${p.color}dd 100%)`,
                  }}
                >
                  <div className="wheel-segment-inner" style={{ transform: `rotate(${segmentAngle / 2}deg)` }}>
                    <span>{p.name}</span>
                  </div>
                </div>
              ))}
              <div className="wheel-center">Quay</div>
            </div>
          </div>
        </div>
      </div>

      <div className="wheel-controls">
        <div className="prize-select-wrap">
          <label>Giải:</label>
          <select
            value={selectedPrizeId}
            onChange={(e) => setSelectedPrizeId(e.target.value)}
            disabled={spinning}
          >
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-spin" onClick={spin} disabled={spinning || disabled}>
          {spinning ? 'Đang quay...' : 'Quay'}
        </button>
      </div>

      {result && (
        <div
          className="result-popup-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="result-popup-title"
          onClick={() => setResult(null)}
        >
          <div className="result-popup-backdrop" />
          <div className="result-popup-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="result-popup-close"
              onClick={() => setResult(null)}
              aria-label="Close"
            >
              ×
            </button>
            <div id="result-popup-title" className="result-popup-congrats">Chúc mừng!</div>
            <div className="result-popup-label">{result.prizeName}</div>
            <div className="result-popup-name-wrap">
              <span className="result-popup-name">{result.displayNumber} — {result.name}</span>
            </div>
            {result.phone && (
              <div className="result-popup-phone">SĐT: {result.phone}</div>
            )}
            <button type="button" className="result-popup-btn-close" onClick={() => setResult(null)}>
              OK
            </button>
          </div>
        </div>
      )}

      {confetti.length > 0 && (
        <div className="confetti-wrap">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="confetti"
              style={{
                left: `${c.left}%`,
                background: c.color,
                animationDelay: `${c.delay}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
