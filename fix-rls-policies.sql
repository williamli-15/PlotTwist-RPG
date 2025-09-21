-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view public lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can create lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can update own lobbies" ON custom_lobbies;
DROP POLICY IF EXISTS "Users can delete own lobbies" ON custom_lobbies;

-- Disable RLS temporarily since we're using our own auth system
ALTER TABLE custom_lobbies DISABLE ROW LEVEL SECURITY;

-- Alternative: Create more permissive policies for development
-- Uncomment these if you want to keep RLS enabled:

-- CREATE POLICY "Allow all operations for development" ON custom_lobbies
--   FOR ALL USING (true) WITH CHECK (true);

-- Or more restrictive policies that work with our user system:
-- CREATE POLICY "Anyone can view public lobbies" ON custom_lobbies
--   FOR SELECT USING (is_public = true);

-- CREATE POLICY "Allow authenticated inserts" ON custom_lobbies
--   FOR INSERT WITH CHECK (created_by IS NOT NULL);

-- CREATE POLICY "Users can update own lobbies" ON custom_lobbies
--   FOR UPDATE USING (true);

-- CREATE POLICY "Users can delete own lobbies" ON custom_lobbies
--   FOR DELETE USING (true);