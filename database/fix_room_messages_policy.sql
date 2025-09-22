-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.room_messages;

-- Create a more permissive policy that works with anon access
-- This allows anyone to read and write messages (since you're using anon keys)
CREATE POLICY "Allow public access to room messages" ON public.room_messages
    FOR ALL USING (true);