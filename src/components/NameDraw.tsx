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

// Tổng thời gian quay ~60 giây: đầu bình thường, 30s cuối nhanh hơn
const SHUFFLE_DURATION_MS = 60_000
const SPEED_UP_START_MS = 30_000 // 30s cuối bắt đầu nhanh
const INTERVAL_SLOW_MS = 580    // lúc đầu: đổi tên nhanh hơn một chút
const INTERVAL_FAST_MS = 55      // 30s cuối: đổi tên nhanh hơn

/** Interval (ms) tại thời điểm elapsed: đầu chậm, gần hết nhanh. */
function getShuffleIntervalMs(elapsedMs: number): number {
  if (elapsedMs >= SPEED_UP_START_MS) {
    const t = (elapsedMs - SPEED_UP_START_MS) / (SHUFFLE_DURATION_MS - SPEED_UP_START_MS)
    return Math.round(INTERVAL_FAST_MS + (1 - t) * (INTERVAL_SLOW_MS - INTERVAL_FAST_MS))
  }
  return INTERVAL_SLOW_MS
}

const BASE = import.meta.env.BASE_URL
const SPIN_FADE_OUT = 0.3
/** Bỏ qua N giây đầu của nhạc quay khi bấm Quay */
const SPIN_SOUND_START_OFFSET = 1.5

/** Tốc độ nhạc: interval nhỏ (quay nhanh) → rate cao, interval lớn (quay chậm) → rate thấp. Clamp [0.6, 2]. */
function playbackRateFromIntervalMs(intervalMs: number): number {
  const rate = INTERVAL_SLOW_MS / Math.max(intervalMs, 1)
  return Math.max(0.6, Math.min(2, rate))
}

interface SpinSoundControls {
  stop: () => void
  setPlaybackRate: (rate: number) => void
}

/** Phát nhạc quay; trả về stop + setPlaybackRate để đồng bộ tốc độ nhạc với tốc độ quay */
function playSpinSound(): Promise<SpinSoundControls> {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    const audio = new Audio(`${BASE}sounds/spin.mp3`)
    audio.volume = 1
    audio.currentTime = SPIN_SOUND_START_OFFSET
    audio.play().catch(() => playSpinBeep())
    return Promise.resolve({
      stop: () => {
        audio.pause()
        audio.currentTime = 0
      },
      setPlaybackRate: (rate: number) => {
        audio.playbackRate = Math.max(0.6, Math.min(2, rate))
      },
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
      source.playbackRate.setValueAtTime(playbackRateFromIntervalMs(INTERVAL_SLOW_MS), ctx.currentTime)
      source.start(0, SPIN_SOUND_START_OFFSET)
      const stopSpin = () => {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + SPIN_FADE_OUT)
        source.stop(ctx.currentTime + SPIN_FADE_OUT)
      }
      const setPlaybackRate = (rate: number) => {
        const r = Math.max(0.6, Math.min(2, rate))
        source.playbackRate.setValueAtTime(r, ctx.currentTime)
      }
      return { stop: stopSpin, setPlaybackRate }
    })
    .catch(() => {
      new Audio(`${BASE}sounds/spin.mp3`).play().catch(() => playSpinBeep())
      return { stop: () => {}, setPlaybackRate: () => {} }
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
  const shuffleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shuffleStartRef = useRef<number>(0)
  const spinSoundRef = useRef<SpinSoundControls | null>(null)
  const [shuffleSlot0, setShuffleSlot0] = useState('')
  const [shuffleSlot1, setShuffleSlot1] = useState('')
  const [shuffleVisible, setShuffleVisible] = useState<0 | 1>(0)
  const shuffleInitedRef = useRef(false)
  const shuffleVisibleRef = useRef<0 | 1>(0)

  const selectedPrize = prizes.find((p) => p.id === selectedPrizeId)
  const availableParticipants = getDrawPool(participants, history)

  useEffect(() => () => {
    if (shuffleRef.current) clearTimeout(shuffleRef.current)
  }, [])

  useEffect(() => {
    if (!drawing) {
      shuffleInitedRef.current = false
      setShuffleSlot0('')
      setShuffleSlot1('')
    }
  }, [drawing])

  useEffect(() => {
    if (!drawing || !displayName) return
    if (!shuffleInitedRef.current) {
      shuffleInitedRef.current = true
      shuffleVisibleRef.current = 0
      setShuffleSlot0(displayName)
      setShuffleSlot1(displayName)
      setShuffleVisible(0)
      return
    }
    const next = (1 - shuffleVisibleRef.current) as 0 | 1
    shuffleVisibleRef.current = next
    if (next === 0) setShuffleSlot0(displayName)
    else setShuffleSlot1(displayName)
    setShuffleVisible(next)
  }, [drawing, displayName])

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

    const prize = selectedPrize
    const winner = pool[Math.floor(Math.random() * pool.length)]
    spinSoundRef.current = null
    shuffleStartRef.current = performance.now()
    playSpinSound().then((controls) => {
      spinSoundRef.current = controls
    })
    if (shuffleRef.current) clearTimeout(shuffleRef.current)
    setDrawing(true)
    setResult(null)

    function tick() {
      const elapsed = performance.now() - shuffleStartRef.current
      if (elapsed >= SHUFFLE_DURATION_MS) {
        shuffleRef.current = null
        spinSoundRef.current?.stop()
        spinSoundRef.current = null
        const winnerLabel = winner.code
          ? `${winner.code} - ${winner.name}`
          : winner.name
        setDisplayName(winnerLabel)
        setDrawing(false)
        setResult({
          name: winner.name,
          code: winner.code,
          prizeName: prize.name,
          displayNumber: history.length + 1,
          phone: winner.phone,
        })
        onDraw({
          prizeId: prize.id,
          prizeName: prize.name,
          participantId: winner.id,
          participantCode: winner.code,
          participantName: winner.name,
          participantPhone: winner.phone,
          drawnAt: Date.now(),
        })
        setTimeout(() => playWinSound(), 100)
        addConfetti()
        return
      }
      const randomPerson = pool[Math.floor(Math.random() * pool.length)]
      const randomLabel = randomPerson.code
        ? `${randomPerson.code} - ${randomPerson.name}`
        : randomPerson.name
      setDisplayName(randomLabel)
      const nextInterval = getShuffleIntervalMs(elapsed)
      const rate = playbackRateFromIntervalMs(nextInterval)
      spinSoundRef.current?.setPlaybackRate(rate)
      shuffleRef.current = setTimeout(tick, nextInterval)
    }
    shuffleRef.current = setTimeout(tick, getShuffleIntervalMs(0))
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
              ) : drawing ? (
                <div className="name-draw-shuffle-wrap">
                  <span
                    className={`name-draw-text name-draw-shuffle name-draw-shuffle-slot ${shuffleVisible === 0 ? 'name-draw-shuffle-visible' : ''}`}
                    aria-hidden={shuffleVisible !== 0}
                  >
                    {shuffleSlot0 || '\u00A0'}
                  </span>
                  <span
                    className={`name-draw-text name-draw-shuffle name-draw-shuffle-slot ${shuffleVisible === 1 ? 'name-draw-shuffle-visible' : ''}`}
                    aria-hidden={shuffleVisible !== 1}
                  >
                    {shuffleSlot1 || '\u00A0'}
                  </span>
                </div>
              ) : (
                <span
                  className={`name-draw-text ${isPlaceholder ? 'name-draw-placeholder' : ''}`}
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
