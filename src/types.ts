export type SymptomRecord = {
  id: string
  name: string
  level: number        // 0-10 severity
  value?: number       // optional numeric (e.g. 体温, 血圧)
  unit?: string
}

export type MedRecord = {
  medId: string
  name: string
  time?: string        // HH:MM
  dose?: string
  taken: boolean
}

export type Entry = {
  date: string         // YYYY-MM-DD
  symptoms: SymptomRecord[]
  meds: MedRecord[]
  note: string
  updatedAt: number
}

export type Medication = {
  id: string
  name: string
  defaultTime?: string
  dose?: string
  note?: string
}

export type SymptomDef = {
  id: string
  name: string
  unit?: string        // e.g. '℃', 'mmHg'
  tracked: boolean     // show in trend chart
}

export type DiaryState = {
  entries: Record<string, Entry>
  medications: Medication[]
  symptomDefs: SymptomDef[]
}
