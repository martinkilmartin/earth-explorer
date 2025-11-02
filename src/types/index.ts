export interface Place {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  culture: string
  language: string
  words: Word[]
  activities: Activity[]
  unlocked: boolean
}

export interface Word {
  english: string
  local: string
  audio?: string
}

export interface Activity {
  id: string
  name: string
  type: 'game' | 'video' | 'story'
  content: string
}

export interface Route {
  from: string
  to: string
  type: 'car' | 'plane'
  distance: number
}
