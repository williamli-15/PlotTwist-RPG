-- Remove the foreign key constraint temporarily to debug
ALTER TABLE custom_lobbies
DROP CONSTRAINT IF EXISTS custom_lobbies_created_by_fkey;

-- Make created_by just a text field for now
ALTER TABLE custom_lobbies
ALTER COLUMN created_by TYPE TEXT;