-- Create custom_lobbies table for user-created rooms
CREATE TABLE IF NOT EXISTS custom_lobbies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  theme TEXT DEFAULT 'general',
  background_color TEXT,
  environment_image TEXT,
  max_players INTEGER DEFAULT 50 CHECK (max_players >= 2 AND max_players <= 1000),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT true,
  tags TEXT[] DEFAULT '{}'::TEXT[]
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_lobby_code ON custom_lobbies(lobby_code);
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_created_by ON custom_lobbies(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_public ON custom_lobbies(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_custom_lobbies_created_at ON custom_lobbies(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE custom_lobbies ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read public lobbies
CREATE POLICY "Anyone can view public lobbies" ON custom_lobbies
  FOR SELECT USING (is_public = true);

-- Policy: Users can create their own lobbies
CREATE POLICY "Users can create lobbies" ON custom_lobbies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own lobbies
CREATE POLICY "Users can update own lobbies" ON custom_lobbies
  FOR UPDATE USING (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

-- Policy: Users can delete their own lobbies
CREATE POLICY "Users can delete own lobbies" ON custom_lobbies
  FOR DELETE USING (created_by = (SELECT id FROM profiles WHERE user_id = auth.uid()::text));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_custom_lobbies_updated_at
  BEFORE UPDATE ON custom_lobbies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();