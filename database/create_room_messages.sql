-- Create room_messages table for live chat (minimal version - no policies)
CREATE TABLE IF NOT EXISTS public.room_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lobby_id TEXT NOT NULL,
    profile_id UUID NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_id ON public.room_messages(lobby_id);
CREATE INDEX IF NOT EXISTS idx_room_messages_created_at ON public.room_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_room_messages_lobby_created ON public.room_messages(lobby_id, created_at);

-- Enable Row Level Security
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Simple policy to allow all authenticated users to read and write messages
CREATE POLICY "Allow all for authenticated users" ON public.room_messages
    FOR ALL USING (auth.role() = 'authenticated');