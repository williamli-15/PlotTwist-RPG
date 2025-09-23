-- Enable real-time for room_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;

-- Also ensure RLS is properly configured for real-time
-- Drop any restrictive policies first
DROP POLICY IF EXISTS "Allow public access to room messages" ON public.room_messages;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.room_messages;

-- Disable RLS for now to test if that's the issue
ALTER TABLE public.room_messages DISABLE ROW LEVEL SECURITY;

-- Re-enable with permissive policy if needed
-- ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON public.room_messages FOR ALL USING (true);