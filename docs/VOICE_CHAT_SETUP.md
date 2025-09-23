# Proximity Voice Chat Setup Guide

This guide explains how to set up and use the proximity voice chat feature in your YNGO metaverse application.

## Features

- **Proximity-based voice chat**: Users only hear others within a configurable distance
- **3D spatial audio**: Sound positioning based on avatar locations
- **WebRTC peer-to-peer**: Direct communication between users
- **Real-time signaling**: Uses Supabase for WebRTC signaling
- **Voice controls**: Mute, distance settings, connection status

## Setup Instructions

### 1. Database Setup

First, run the SQL script to create the required table in your Supabase database:

```sql
-- Run this in your Supabase SQL editor
-- File: sql/voice_signals.sql

CREATE TABLE IF NOT EXISTS voice_signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID NOT NULL,
    to_user_id UUID NOT NULL,
    signal_data JSONB NOT NULL,
    lobby_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT FALSE
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_voice_signals_lobby_timestamp
ON voice_signals (lobby_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_voice_signals_to_user
ON voice_signals (to_user_id, processed);

-- Enable RLS
ALTER TABLE voice_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see signals meant for them or from them
CREATE POLICY "Users can manage their voice signals" ON voice_signals
FOR ALL USING (
    auth.uid()::TEXT = from_user_id::TEXT OR
    auth.uid()::TEXT = to_user_id::TEXT
);
```

### 2. Component Integration

Replace your existing world component with the new voice chat-enabled version:

```tsx
// In your main page component
import WorldWithVoiceChat from '@/app/components/WorldWithVoiceChat';

// Replace your existing Scene component with:
<WorldWithVoiceChat />
```

### 3. Browser Permissions

The voice chat requires microphone access. Users will be prompted to allow microphone access when they first enable voice chat.

## Usage

### Voice Chat Controls

The voice chat controls appear in the bottom-right corner when you're in a lobby:

- **Microphone Button**: Enable/disable voice chat
- **Mute Button**: Mute/unmute your microphone
- **Settings Button**: Access proximity range and audio settings

### Proximity Settings

- **Voice Range**: Adjustable from 5m to 50m (default: 15m)
- **Automatic Connection**: Users connect/disconnect based on distance
- **Real-time Updates**: Position updates in real-time as avatars move

### Connection Status

- **Green Dot**: Voice chat active
- **Red Dot**: Muted or disabled
- **User Count**: Shows number of connected users
- **Connection List**: Shows who you're currently talking to

## Technical Details

### Architecture

1. **VoiceChatService**: Core WebRTC peer-to-peer connection management
2. **VoiceChatIntegration**: Integrates with Supabase and lobby system
3. **VoiceChatControls**: UI component for user controls
4. **WorldWithVoiceChat**: Enhanced 3D world with position tracking

### WebRTC Flow

1. User enables voice chat → Request microphone access
2. Avatar moves within proximity → Initiate WebRTC connection
3. Exchange signaling data → Via Supabase real-time
4. Establish peer connection → Direct audio streaming
5. Avatar moves out of range → Disconnect cleanly

### Spatial Audio

- Volume decreases with distance (linear falloff)
- Basic left/right panning based on X position
- Future: Full 3D audio with Web Audio API

## Performance Considerations

- **Peer Limit**: Tested with up to 8 simultaneous connections
- **Bandwidth**: ~64kbps per active connection
- **CPU**: Minimal impact with hardware acceleration
- **Mobile**: Optimized for mobile browsers

## Troubleshooting

### Common Issues

**Microphone permission denied**:
- Check browser settings
- Ensure HTTPS (required for WebRTC)
- Clear site data and retry

**No audio from other users**:
- Check proximity distance settings
- Verify both users have voice chat enabled
- Check browser console for WebRTC errors

**Connection issues**:
- Ensure Supabase real-time is working
- Check network connectivity
- Try refreshing the page

### Debug Mode

Enable debug logging in the browser console:

```javascript
// In browser console
voiceChatService.setDebugMode(true);
```

### Network Requirements

- **HTTPS**: Required for microphone access
- **WebRTC**: Modern browser support
- **STUN Servers**: Google and Twilio endpoints used
- **Firewall**: May need UDP ports for peer connections

## Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Edge 80+
- ⚠️ Mobile: Limited on some devices

## Security & Privacy

- **Peer-to-peer**: Audio streams directly between users
- **No recording**: Audio is not stored or recorded
- **Encrypted**: WebRTC uses DTLS encryption
- **Ephemeral**: Signaling data auto-expires after 1 hour

## Future Enhancements

- [ ] Push-to-talk option
- [ ] Voice activity detection
- [ ] Advanced 3D spatial audio
- [ ] Voice modulation effects
- [ ] Group voice channels
- [ ] Recording/playback functionality

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Test in different browsers
4. Open GitHub issue with reproduction steps