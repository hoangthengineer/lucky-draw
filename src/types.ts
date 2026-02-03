export interface Participant {
  id: string;
  /** Mã nhân viên / mã số quay (tùy dùng) */
  code?: string;
  name: string;
  phone?: string;
  email?: string;
  note?: string;
  createdAt: number;
}

export interface Prize {
  id: string;
  name: string;
  order: number;
  color: string;
  count: number;
}

export interface DrawRecord {
  id: string;
  prizeId: string;
  prizeName: string;
  participantId: string;
  /** Mã nhân viên lúc quay (nếu có) */
  participantCode?: string;
  participantName: string;
  participantPhone?: string;
  drawnAt: number;
}

export interface AppState {
  participants: Participant[];
  prizes: Prize[];
  history: DrawRecord[];
}
