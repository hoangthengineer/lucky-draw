import { useState, useEffect, useCallback, useRef } from 'react'
import { loadState, saveState, addDrawRecord } from './storage'
import type { AppState, Participant, Prize, DrawRecord } from './types'
import NameDraw from './components/NameDraw'
import PrizeManager from './components/PrizeManager'
import ParticipantList from './components/ParticipantList'
import History from './components/History'
import BackgroundCanvas from './components/BackgroundCanvas'
import './App.css'

const PARTICIPANTS_VISIBLE_KEY = 'lucky-draw-participants-visible'
const PRIZES_VISIBLE_KEY = 'lucky-draw-prizes-visible'

function App() {
  const [state, setState] = useState<AppState>(loadState)
  const [showParticipants, setShowParticipants] = useState(() => {
    try {
      const v = localStorage.getItem(PARTICIPANTS_VISIBLE_KEY)
      return v === null ? true : v === '1'
    } catch { return true }
  })
  const [showPrizes, setShowPrizes] = useState(() => {
    try {
      const v = localStorage.getItem(PRIZES_VISIBLE_KEY)
      return v === null ? true : v === '1'
    } catch { return true }
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(PARTICIPANTS_VISIBLE_KEY, showParticipants ? '1' : '0')
    } catch { /* ignore */ }
  }, [showParticipants])

  useEffect(() => {
    try {
      localStorage.setItem(PRIZES_VISIBLE_KEY, showPrizes ? '1' : '0')
    } catch { /* ignore */ }
  }, [showPrizes])

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  useEffect(() => {
    saveState(state)
  }, [state])

  const setParticipants = useCallback((fn: (prev: Participant[]) => Participant[]) => {
    setState((s) => ({ ...s, participants: fn(s.participants) }))
  }, [])

  const setPrizes = useCallback((fn: (prev: Prize[]) => Prize[]) => {
    setState((s) => ({ ...s, prizes: fn(s.prizes) }))
  }, [])

  const setHistory = useCallback((fn: (prev: DrawRecord[]) => DrawRecord[]) => {
    setState((s) => ({ ...s, history: fn(s.history) }))
  }, [])

  const onAddParticipant = useCallback((p: Participant) => {
    setParticipants((prev) => [...prev, p])
  }, [setParticipants])

  const onRemoveParticipant = useCallback((id: string) => {
    setParticipants((prev) => prev.filter((x) => x.id !== id))
  }, [setParticipants])

  const onImportParticipants = useCallback((list: Participant[]) => {
    setParticipants((prev) => [...prev, ...list])
  }, [setParticipants])

  const onAddPrize = useCallback((p: Omit<Prize, 'id'>) => {
    const newP: Prize = { ...p, id: `prize-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
    setPrizes((prev) => [...prev, newP].sort((a, b) => a.order - b.order))
  }, [setPrizes])

  const onEditPrize = useCallback((id: string, updates: Partial<Prize>) => {
    setPrizes((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, ...updates } : p))
        .sort((a, b) => a.order - b.order)
    )
  }, [setPrizes])

  const onRemovePrize = useCallback((id: string) => {
    setPrizes((prev) => prev.filter((p) => p.id !== id))
  }, [setPrizes])

  const onDraw = useCallback((record: Omit<DrawRecord, 'id'>) => {
    const r = addDrawRecord(record)
    setHistory((prev) => [...prev, r])
  }, [setHistory])

  const onClearHistory = useCallback(() => {
    setHistory(() => [])
  }, [setHistory])

  return (
    <>
      <BackgroundCanvas />
      <div className="app">
        <div className="app-center">
        <header className="app-header">
          <div className="app-header-menu" ref={menuRef}>
            <button
              type="button"
              className="app-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              title="Tùy chọn hiển thị"
              aria-expanded={menuOpen}
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="app-menu-dropdown">
                <button
                  type="button"
                  className="app-menu-item"
                  onClick={() => setShowParticipants((v) => !v)}
                >
                  <span className="app-menu-check">{showParticipants ? '☑' : '☐'}</span>
                  👥 Người chơi
                </button>
                <button
                  type="button"
                  className="app-menu-item"
                  onClick={() => setShowPrizes((v) => !v)}
                >
                  <span className="app-menu-check">{showPrizes ? '☑' : '☐'}</span>
                  🏆 Giải thưởng
                </button>
              </div>
            )}
          </div>
          <h1 className="app-title">LUCKY DRAW</h1>
          <p className="tagline">Quay số trúng thưởng</p>
        </header>

        <main className="app-main">
          <section className="section-wheel">
            <NameDraw
              prizes={state.prizes}
              participants={state.participants}
              history={state.history}
              onDraw={onDraw}
            />
          </section>
        </main>
        </div>

        <aside className="section-side">
          <History records={state.history} prizes={state.prizes} onClear={onClearHistory} />
          {showParticipants && (
            <ParticipantList
              participants={state.participants}
              onAdd={onAddParticipant}
              onRemove={onRemoveParticipant}
              onImport={onImportParticipants}
            />
          )}
          {showPrizes && (
            <PrizeManager
              prizes={state.prizes}
              onAdd={onAddPrize}
              onEdit={onEditPrize}
              onRemove={onRemovePrize}
            />
          )}
        </aside>
      </div>
    </>
  )
}

export default App
