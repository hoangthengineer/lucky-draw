import { useState } from 'react'
import type { Prize } from '../types'
import './PrizeManager.css'

const DEFAULT_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32', '#e94560', '#00d9a0', '#6c5ce7']

interface PrizeManagerProps {
  prizes: Prize[]
  onAdd: (p: Omit<Prize, 'id'>) => void
  onEdit: (id: string, p: Partial<Prize>) => void
  onRemove: (id: string) => void
}

export default function PrizeManager({ prizes, onAdd, onEdit, onRemove }: PrizeManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ name: '', order: prizes.length + 1, color: DEFAULT_COLORS[prizes.length % DEFAULT_COLORS.length], count: 1 })

  const sortedPrizes = [...prizes].sort((a, b) => a.order - b.order)

  const startAdd = () => {
    setIsAdding(true)
    setEditingId(null)
    setForm({ name: '', order: prizes.length + 1, color: DEFAULT_COLORS[prizes.length % DEFAULT_COLORS.length], count: 1 })
  }

  const saveAdd = () => {
    if (!form.name.trim()) return
    const maxOrder = prizes.length ? Math.max(...prizes.map((p) => p.order)) : 0
    onAdd({ name: form.name.trim(), order: maxOrder + 1, color: form.color, count: 1 })
    setIsAdding(false)
    setForm({ name: '', order: prizes.length + 2, color: '#e94560', count: 1 })
  }

  const startEdit = (p: Prize) => {
    setEditingId(p.id)
    setIsAdding(false)
    setForm({ name: p.name, order: p.order, color: p.color, count: p.count })
  }

  const saveEdit = () => {
    if (!editingId || !form.name.trim()) return
    const current = prizes.find((p) => p.id === editingId)
    onEdit(editingId, {
      name: form.name.trim(),
      order: current?.order ?? form.order,
      color: current?.color ?? form.color,
      count: 1,
    })
    setEditingId(null)
  }

  return (
    <div className="prize-manager">
      <h3>🏆 Giải thưởng</h3>
      <div className="prize-list">
        {sortedPrizes.map((p) => (
          <div key={p.id} className="prize-item">
            <div className="prize-color" style={{ background: p.color }} />
            <span>{p.name}</span>
            <div className="prize-actions">
              <button type="button" onClick={() => startEdit(p)}>Sửa</button>
              <button type="button" onClick={() => onRemove(p.id)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>
      {isAdding && (
        <div className="prize-form">
          <input
            placeholder="Tên giải thưởng"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="prize-form-actions">
            <button type="button" className="save" onClick={saveAdd}>Lưu</button>
            <button type="button" className="cancel" onClick={() => setIsAdding(false)}>Hủy</button>
          </div>
        </div>
      )}
      {editingId && (
        <div className="prize-form">
          <input
            placeholder="Tên giải thưởng"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <div className="prize-form-actions">
            <button type="button" className="save" onClick={saveEdit}>Lưu</button>
            <button type="button" className="cancel" onClick={() => setEditingId(null)}>Hủy</button>
          </div>
        </div>
      )}
      {!isAdding && !editingId && (
        <button type="button" className="btn-add-prize" onClick={startAdd}>
          + Thêm giải thưởng
        </button>
      )}
    </div>
  )
}
