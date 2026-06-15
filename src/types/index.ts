export interface Station {
  id: string
  name: string
  address: string
  area: string
  lng: number
  lat: number
  totalGuns: number
  highTempGuns: number
  warningGuns: number
  normalGuns: number
  status: 'normal' | 'warning' | 'danger'
  manager: string
  phone: string
  buildTime: string
}

export interface Gun {
  id: string
  stationId: string
  stationName: string
  gunNo: string
  model: string
  power: number
  currentTemp: number
  maxTemp: number
  avgTemp: number
  status: 'normal' | 'warning' | 'danger'
  lastCheckTime: string
  totalWorkHours: number
}

export interface TempRecord {
  time: string
  stationId: string
  gunId: string
  temperature: number
  power: number
  ambientTemp: number
}

export interface WorkOrder {
  id: string
  stationId: string
  stationName: string
  gunId: string
  gunNo: string
  type: string
  level: 'low' | 'medium' | 'high'
  status: 'pending' | 'processing' | 'completed' | 'closed'
  createTime: string
  assignTime: string
  completeTime: string
  handler: string
  description: string
  recurrence: number
}

export interface WeatherData {
  date: string
  temperature: number
  humidity: number
  weather: string
}

export interface StationRank {
  stationId: string
  stationName: string
  area: string
  score: number
  highTempCount: number
  workOrderCount: number
  completionRate: number
  avgResponseTime: number
  manager: string
}

export interface Rectification {
  id: string
  stationId: string
  stationName: string
  gunId: string
  issue: string
  beforeDesc: string
  afterDesc: string
  beforeTemp: number
  afterTemp: number
  rectifyTime: string
  operator: string
  beforeImage?: string
  afterImage?: string
}
