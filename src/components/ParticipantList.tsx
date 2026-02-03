import { useRef } from 'react'
import * as XLSX from 'xlsx'
import type { Participant } from '../types'
import { addParticipant as createParticipant } from '../storage'
import './ParticipantList.css'

interface ParticipantListProps {
  participants: Participant[]
  onAdd: (p: Participant) => void
  onRemove: (id: string) => void
  onImport: (list: Participant[]) => void
}

export default function ParticipantList({ participants, onAdd, onRemove, onImport }: ParticipantListProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const name = nameRef.current?.value?.trim()
    if (!name) return
    const p = createParticipant({ name })
    onAdd(p)
    nameRef.current!.value = ''
    nameRef.current?.focus()
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result
        if (!data || (typeof data !== 'string' && !(data instanceof ArrayBuffer))) return
        const wb = XLSX.read(data, { type: data instanceof ArrayBuffer ? 'array' : 'binary' })
        const firstSheet = wb.SheetNames[0]
        const sheet = wb.Sheets[firstSheet]
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as (string[])[]
        if (rows.length === 0) return
        const header = rows[0].map((h) => (h || '').toString().toLowerCase())
        const nameCol = header.findIndex((h) =>
          h.includes('tên') || h.includes('name') || h === 'họ tên' || h === 'hoten'
        )
        const codeCol = header.findIndex((h) =>
          h.includes('mã') || h.includes('code') || h.includes('id')
        )
        const phoneCol = header.findIndex((h) => h.includes('điện thoại') || h.includes('phone') || h === 'sdt')
        const emailCol = header.findIndex((h) => h.includes('email'))
        const list: Participant[] = []
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] || []
          const name = (nameCol >= 0 ? row[nameCol] : row[1] ?? row[0])?.toString().trim()
          if (!name) continue
          const p = createParticipant({
            name,
            code: codeCol >= 0 ? row[codeCol]?.toString().trim() : undefined,
            phone: phoneCol >= 0 ? row[phoneCol]?.toString().trim() : undefined,
            email: emailCol >= 0 ? row[emailCol]?.toString().trim() : undefined,
          })
          list.push(p)
        }
        if (list.length) onImport(list)
      } catch (err) {
        console.error(err)
      }
      e.target.value = ''
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="participant-manager">
      <h3>👥 Người chơi</h3>
      <div className="participant-count">Tổng số: {participants.length}</div>
      <div className="participant-toolbar">
        <button type="button" className="btn-import" onClick={() => fileRef.current?.click()}>
          📂 Import từ Excel
        </button>
        <input
          ref={fileRef}
          type="file"
          className="input-file"
          accept=".xlsx,.xls"
          onChange={handleImportExcel}
        />
      </div>
      <p className="import-hint">Excel: Mã nhân viên, Họ tên (2 cột). Có thể kèm thêm SĐT, Email.</p>
      <div className="participant-add">
        <input
          ref={nameRef}
          type="text"
          placeholder="Nhập họ tên người chơi"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button type="button" onClick={handleAdd}>Thêm</button>
      </div>
      <div className="participant-list">
        {participants.map((p) => (
          <div key={p.id} className="participant-item">
            <span>{p.code ? `${p.code} - ${p.name}` : p.name}</span>
            {p.phone && <small>{p.phone}</small>}
            <button type="button" onClick={() => onRemove(p.id)}>Xóa</button>
          </div>
        ))}
      </div>
    </div>
  )
}
