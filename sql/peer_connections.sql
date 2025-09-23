-- Peer connections table for storing PeerJS IDs
CREATE TABLE IF NOT EXISTS peer_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    peer_id TEXT NOT NULL,
    is_online BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, lobby_id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_peer_connections_lobby
ON peer_connections (lobby_id, is_online, last_seen DESC);

CREATE INDEX IF NOT EXISTS idx_peer_connections_profile
ON peer_connections (profile_id, is_online);

-- Disable RLS for development (since app doesn't use traditional auth)
-- ALTER TABLE peer_connections ENABLE ROW LEVEL SECURITY;

-- Note: RLS disabled for anonymous access like other tables in this app

-- Function to clean up old/offline peer connections
CREATE OR REPLACE FUNCTION cleanup_old_peer_connections()
RETURNS void AS $$
BEGIN
    DELETE FROM peer_connections
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;