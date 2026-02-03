import { useState, useCallback, useEffect, useRef } from 'react'
import type { Prize, Participant, DrawRecord } from '../types'
import './NameDraw.css'

function getDrawPool(participants: Participant[], history: DrawRecord[]): Participant[] {
  const drawnIds = new Set(history.map((h) => h.participantId))
  const available = participants.filter((p) => !drawnIds.has(p.id))
  return available.length > 0 ? available : participants
}

const CONFETTI_COLORS = ['#d4af37', '#e8c547', '#f5e6c8', '#c41e3a', '#7cb083', '#9a8f7f']

interface NameDrawProps {
  prizes: Prize[]
  participants: Participant[]
  history: DrawRecord[]
  onDraw: (record: Omit<DrawRecord, 'id'>) => void
  disabled?: boolean
}

// Thời gian quay lâu hơn cho kịch tính (~7 giây)
const SHUFFLE_DURATION = 7000
// Tốc độ đổi tên nhanh hơn một chút
const SHUFFLE_INTERVAL = 90

export default function NameDraw({ prizes, participants, history, onDraw, disabled }: NameDrawProps) {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(prizes[0]?.id ?? '')
  const [drawing, setDrawing] = useState(false)
  const [displayName, setDisplayName] = useState<string>('')
  const [result, setResult] = useState<{ name: string; code?: string; prizeName: string; displayNumber: number; phone?: string } | null>(null)
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number }[]>([])
  const shuffleRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId)
  const availableParticipants = getDrawPool(participants, history)

  useEffect(() => () => {
    if (shuffleRef.current) clearInterval(shuffleRef.current)
  }, [])

  const addConfetti = useCallback(() => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 0.3,
    }))
    setConfetti(items)
    setTimeout(() => setConfetti([]), 2000)
  }, [])

  const draw = useCallback(() => {
    if (!selectedPrize || drawing || disabled) return
    const pool = availableParticipants.length ? [...availableParticipants] : [...participants]
    if (pool.length === 0) {
      setResult({ name: '— Chưa có người tham gia —', prizeName: selectedPrize.name, displayNumber: history.length + 1, phone: undefined })
      return
    }

    const winner = pool[Math.floor(Math.random() * pool.length)]
    if (shuffleRef.current) clearInterval(shuffleRef.current)
    setDrawing(true)
    setResult(null)

    let elapsed = 0
    shuffleRef.current = setInterval(() => {
      elapsed += SHUFFLE_INTERVAL
      const randomPerson = pool[Math.floor(Math.random() * pool.length)]
      const randomLabel = randomPerson.code
        ? `${randomPerson.code} - ${randomPerson.name}`
        : randomPerson.name
      setDisplayName(randomLabel)
      if (elapsed >= SHUFFLE_DURATION) {
        if (shuffleRef.current) clearInterval(shuffleRef.current)
        shuffleRef.current = null
        const winnerLabel = winner.code
          ? `${winner.code} - ${winner.name}`
          : winner.name
        setDisplayName(winnerLabel)
        setDrawing(false)
        setResult({
          name: winner.name,
          code: winner.code,
          prizeName: selectedPrize.name,
          displayNumber: history.length + 1,
          phone: winner.phone,
        })
        onDraw({
          prizeId: selectedPrize.id,
          prizeName: selectedPrize.name,
          participantId: winner.id,
          participantCode: winner.code,
          participantName: winner.name,
          participantPhone: winner.phone,
          drawnAt: Date.now(),
        })
        addConfetti()
      }
    }, SHUFFLE_INTERVAL)
  }, [selectedPrize, participants, history, availableParticipants, prizes, drawing, disabled, onDraw, addConfetti])

  useEffect(() => {
    if (!drawing && !result) setDisplayName('')
  }, [drawing, result])

  if (prizes.length === 0) {
    return (
      <div className="name-draw-wrap">
        <p className="name-draw-empty-msg">Thêm ít nhất một giải để quay.</p>
      </div>
    )
  }

  const placeholder = result ? '' : drawing ? '' : 'Chọn giải & nhấn Quay'
  const isPlaceholder = !displayName && !result && !drawing
  const marqueeText = result
    ? `${(result.code || String(result.displayNumber)).toUpperCase()} - ${result.name.toUpperCase()}`
    : drawing
      ? displayName
      : placeholder
  const prizeLabel = selectedPrize ? selectedPrize.name.toUpperCase() : ''
  const hasWinner = !!result

  return (
    <div className="name-draw-wrap">
      <div className="name-draw-stage">
        <div className={`name-draw-marquee ${hasWinner ? 'name-draw-marquee-win' : ''}`}>
          <div className="name-draw-lights" aria-hidden />
          <div className="name-draw-inner">
            <div className="name-draw-prize-label">{prizeLabel}</div>
            <div className="name-draw-main">
              <span
                className={`name-draw-text ${drawing ? 'name-draw-shuffle' : ''} ${result ? 'name-draw-winner' : ''} ${isPlaceholder ? 'name-draw-placeholder' : ''}`}
              >
                {marqueeText}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="name-draw-controls">
        <div className="prize-select-wrap">
          <label>Giải:</label>
          <select
            value={selectedPrizeId}
            onChange={(e) => setSelectedPrizeId(e.target.value)}
            disabled={drawing}
          >
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-draw" onClick={draw} disabled={drawing || disabled}>
          {drawing ? 'Đang quay...' : 'Quay'}
        </button>
      </div>

      {confetti.length > 0 && (
        <div className="confetti-wrap">
          {confetti.map((c) => (
            <div key={c.id} className="confetti" style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }} />
          ))}
        </div>
      )}
    </div>
  )
}
