-- Add host configuration fields to custom_lobbies table
-- Run this in your Supabase SQL editor

ALTER TABLE custom_lobbies
ADD COLUMN host_uses_creator_profile BOOLEAN DEFAULT true NOT NULL,
ADD COLUMN custom_host_name TEXT,
ADD COLUMN custom_host_avatar TEXT,
ADD COLUMN additional_host_knowledge TEXT;

-- Add comment to describe the new fields
COMMENT ON COLUMN custom_lobbies.host_uses_creator_profile IS 'If true, use the room creator profile as host. If false, use custom host settings.';
COMMENT ON COLUMN custom_lobbies.custom_host_name IS 'Custom host name when not using creator profile';
COMMENT ON COLUMN custom_lobbies.custom_host_avatar IS 'Custom host avatar path when not using creator profile';
COMMENT ON COLUMN custom_lobbies.additional_host_knowledge IS 'Additional context/knowledge for the room host (AI personality enhancement)';