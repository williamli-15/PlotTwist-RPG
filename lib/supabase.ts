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

export interface CustomLobby {
  id: string
  lobby_code: string  // 6-character alphanumeric
  name: string
  description: string
  theme: string
  background_color?: string
  environment_image?: string
  max_players: number
  created_by: string  // profile_id of creator
  created_at: string
  updated_at: string
  is_public: boolean
  tags?: string[]
  // Host configuration
  host_uses_creator_profile: boolean  // true = use creator's profile, false = use custom host
  custom_host_name?: string
  custom_host_avatar?: string
  additional_host_knowledge?: string
}