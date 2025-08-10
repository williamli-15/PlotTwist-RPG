// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  user_id: string
  username: string
  selected_avatar_model: string
  created_at: string
  last_seen: string
  // New personality fields
  ai_personality_prompt?: string
  bio?: string
  interests?: string[]
  preferred_greeting?: string
  personality_type?: string
  total_time_online?: number
  favorite_lobby?: string
}

export interface AvatarState {
  id: string
  profile_id: string
  lobby_id: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  animation: string
  equipped_weapon?: {
    id: string
    name: string
    model: string
    type: 'sword' | 'pistol'
  }
  is_online: boolean
  last_activity: string
  ai_behavior: 'idle' | 'wander' | 'patrol' | 'talking'
}