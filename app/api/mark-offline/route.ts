// app/api/mark-offline/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: NextRequest) {
  try {
    let body;
    
    // Handle both regular JSON and sendBeacon blob
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json') || contentType?.includes('text/plain')) {
        body = await request.json();
    } else {
        // For sendBeacon without proper content-type
        const text = await request.text();
        if (!text) {
            return NextResponse.json({ error: 'Empty request' }, { status: 400 });
        }
        body = JSON.parse(text);
    }
    
    const { profileId, lobbyId } = body;
    
    if (!profileId || !lobbyId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Mark the avatar as offline
    await supabase
      .from('avatar_states')
      .update({
        is_online: false,
        ai_behavior: 'wander',
        last_activity: new Date().toISOString()
      })
      .eq('profile_id', profileId)
      .eq('lobby_id', lobbyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking user offline:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}