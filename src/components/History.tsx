import type { DrawRecord, Prize } from '../types'
import './History.css'

interface HistoryProps {
  records: DrawRecord[]
  prizes: Prize[]
  onClear: () => void
}

export default function History({ records, prizes, onClear }: HistoryProps) {
  const sortedPrizes = [...prizes].sort((a, b) => a.order - b.order)

  const byPrize = sortedPrizes.map((prize) => {
    const items = records
      .filter((r) => r.prizeId === prize.id)
      .sort((a, b) => b.drawnAt - a.drawnAt)
    return { prize, items }
  })

  return (
    <div className="history-panel">
      <h3>DANH SÁCH TRÚNG THƯỞNG</h3>
      <div className="history-list">
        {records.length === 0 ? (
          <div className="history-empty">Chưa có kết quả.</div>
        ) : (
          byPrize.map(({ prize, items }) =>
            items.length === 0 ? null : (
              <div key={prize.id} className="history-section">
                <div className="history-section-title">{prize.name.toUpperCase()}</div>
                {items.map((r) => (
                  <div key={r.id} className="history-item">
                    <span className="history-number">
                      {r.participantCode ? r.participantCode : ''}
                    </span>
                    <span className="history-dash">-</span>
                    <span className="history-name">{r.participantName}</span>
                    {r.participantPhone && <span className="history-phone">SĐT: {r.participantPhone}</span>}
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>
      {records.length > 0 && (
        <button type="button" className="btn-clear-history" onClick={onClear}>
          Xóa danh sách
        </button>
      )}
    </div>
  )
}
