import type { AppState, Participant, Prize, DrawRecord } from './types'

const STORAGE_KEY = 'quayso-app-state'

const defaultState: AppState = {
  participants: [],
  prizes: [
    { id: '1', name: '1st Prize', order: 1, color: '#ffd700', count: 1 },
    { id: '2', name: '2nd Prize', order: 2, color: '#c0c0c0', count: 2 },
    { id: '3', name: '3rd Prize', order: 3, color: '#cd7f32', count: 3 },
  ],
  history: [],
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultState, participants: [...defaultState.participants], prizes: [...defaultState.prizes], history: [...defaultState.history] }
    const parsed = JSON.parse(raw) as AppState
    return {
      participants: parsed.participants ?? defaultState.participants,
      prizes: (parsed.prizes?.length ? parsed.prizes : defaultState.prizes).sort((a, b) => a.order - b.order),
      history: parsed.history ?? defaultState.history,
    }
  } catch {
    return { ...defaultState, participants: [...defaultState.participants], prizes: [...defaultState.prizes], history: [...defaultState.history] }
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function addParticipant(p: Omit<Participant, 'id' | 'createdAt'>): Participant {
  const newP: Participant = {
    ...p,
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  }
  return newP
}

export function addPrize(p: Omit<Prize, 'id'>): Prize {
  const newP: Prize = {
    ...p,
    id: `prize-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  return newP
}

export function addDrawRecord(r: Omit<DrawRecord, 'id'>): DrawRecord {
  const newR: DrawRecord = {
    ...r,
    id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  return newR
}
