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

// Thời gian quay 10 giây
const SHUFFLE_DURATION = 10000
// Tốc độ đổi tên nhanh hơn một chút
const SHUFFLE_INTERVAL = 90

const BASE = import.meta.env.BASE_URL
const SPIN_FADE_OUT = 0.3

/** Phát nhạc quay; trả về hàm để tắt mượt (fade out) khi win */
function playSpinSound(): Promise<() => void> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    const audio = new Audio(`${BASE}sounds/spin.mp3`)
    audio.volume = 1
    audio.play().catch(() => playSpinBeep())
    return Promise.resolve(() => {
      audio.pause()
      audio.currentTime = 0
    })
  }
  const ctx = new Ctx()
  return fetch(`${BASE}sounds/spin.mp3`)
    .then((r) => r.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .then((buffer) => {
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()
      source.buffer = buffer
      source.connect(gain)
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(1, ctx.currentTime)
      source.start(0)
      const stopSpin = () => {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + SPIN_FADE_OUT)
        source.stop(ctx.currentTime + SPIN_FADE_OUT)
      }
      return stopSpin
    })
    .catch(() => {
      new Audio(`${BASE}sounds/spin.mp3`).play().catch(() => playSpinBeep())
      return () => {}
    })
}

function playWinSound() {
  const audio = new Audio(`${BASE}sounds/win.mp3`)
  audio.volume = 1
  audio.play().catch(() => {})
}

function playSpinBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 520
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.2)
  } catch {
    // ignore
  }
}

export default function NameDraw({ prizes, participants, history, onDraw, disabled }: NameDrawProps) {
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(prizes[0]?.id ?? '')
  const [drawing, setDrawing] = useState(false)
  const [displayName, setDisplayName] = useState<string>('')
  const [result, setResult] = useState<{ name: string; code?: string; prizeName: string; displayNumber: number; phone?: string } | null>(null)
  const [confetti, setConfetti] = useState<{ id: number; left: number; color: string; delay: number }[]>([])
  const [fireworksActive, setFireworksActive] = useState(false)
  const shuffleRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopSpinRef = useRef<(() => void) | null>(null)

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
    setFireworksActive(true)
    setTimeout(() => {
      setConfetti([])
      setFireworksActive(false)
    }, 2200)
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
    stopSpinRef.current = null
    playSpinSound().then((stopSpin) => {
      stopSpinRef.current = stopSpin
    })

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
        stopSpinRef.current?.()
        stopSpinRef.current = null
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
        setTimeout(() => playWinSound(), 100)
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
    ? ''
    : drawing
      ? displayName
      : placeholder
  const winnerCodeLabel = result ? (result.code || String(result.displayNumber)).toUpperCase() : ''
  const winnerNameLabel = result ? result.name.toUpperCase() : ''
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
              {result ? (
                <div className="name-draw-winner-block">
                  <div className="name-draw-winner-code-row">
                    <span className="name-draw-winner-code">
                      {winnerCodeLabel}
                    </span>
                  </div>
                  <div className="name-draw-winner-name-row">
                    <span className="name-draw-text name-draw-winner">
                      {winnerNameLabel}
                    </span>
                  </div>
                </div>
              ) : (
                <span
                  className={`name-draw-text ${drawing ? 'name-draw-shuffle' : ''} ${isPlaceholder ? 'name-draw-placeholder' : ''}`}
                >
                  {marqueeText}
                </span>
              )}
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

      {(confetti.length > 0 || fireworksActive) && (
        <div className="confetti-wrap">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="confetti"
              style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }}
            />
          ))}

          {fireworksActive && (
            <div className="winner-fireworks" aria-hidden>
              <div className="firework firework-1" />
              <div className="firework firework-2" />
              <div className="firework firework-3" />
              <div className="firework firework-4" />
              <div className="firework firework-5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
