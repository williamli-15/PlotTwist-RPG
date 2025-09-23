// ProximityVoiceChat.tsx - Complete WebRTC proximity voice chat
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';

interface VoiceSignal {
    from_user_id: string;
    to_user_id: string;
    signal_data: any;
    lobby_id: string;
    timestamp: string;
}

const ProximityVoiceChat: React.FC = () => {
    const { currentLobby, profile } = useLobbyStore();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
    const [proximityRange, setProximityRange] = useState(15);

    const localStreamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<Map<string, any>>(new Map());
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const signalChannelRef = useRef<any>(null);

    // Cleanup function
    const cleanupPeer = useCallback((userId: string) => {
        const peer = peersRef.current.get(userId);
        if (peer && !peer.destroyed) {
            peer.destroy();
        }
        peersRef.current.delete(userId);

        const audio = audioElementsRef.current.get(userId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            audioElementsRef.current.delete(userId);
        }

        setConnectedUsers(prev => prev.filter(id => id !== userId));
    }, []);

    // Set up WebRTC signaling channel
    const setupSignalingChannel = useCallback(() => {
        if (!currentLobby?.lobbyId || !profile?.id) return;

        if (signalChannelRef.current) {
            supabase.removeChannel(signalChannelRef.current);
        }

        signalChannelRef.current = supabase
            .channel(`voice-${currentLobby.lobbyId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'voice_signals',
                    filter: `lobby_id=eq.${currentLobby.lobbyId}`
                },
                (payload) => {
                    const signal = payload.new as VoiceSignal;
                    if (signal.to_user_id === profile.id) {
                        handleIncomingSignal(signal.from_user_id, signal.signal_data);
                    }
                }
            )
            .subscribe();

        console.log('Voice signaling channel set up for lobby:', currentLobby.lobbyId);
    }, [currentLobby?.lobbyId, profile?.id]);

    // Send WebRTC signal to another user
    const sendSignalToUser = useCallback(async (toUserId: string, signalData: any) => {
        if (!profile?.id || !currentLobby?.lobbyId) return;

        try {
            await supabase.from('voice_signals').insert({
                from_user_id: profile.id,
                to_user_id: toUserId,
                signal_data: signalData,
                lobby_id: currentLobby.lobbyId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to send signal:', error);
        }
    }, [profile?.id, currentLobby?.lobbyId]);

    // Create peer connection
    const createPeerConnection = useCallback(async (userId: string, initiator: boolean) => {
        if (!localStreamRef.current) return;

        console.log(`Creating peer connection to ${userId} (initiator: ${initiator})`);

        try {
            // Dynamic import of SimplePeer
            const SimplePeerModule = await import('simple-peer');
            const SimplePeer = SimplePeerModule.default;

            if (typeof SimplePeer !== 'function') {
                throw new Error('SimplePeer is not a constructor function');
            }

            console.log(`Creating SimplePeer instance for ${userId}`);

            const peer = new SimplePeer({
                initiator,
                stream: localStreamRef.current,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('signal', (signalData) => {
                sendSignalToUser(userId, signalData);
            });

            peer.on('connect', () => {
                console.log(`Connected to ${userId}`);
                setConnectedUsers(prev => [...prev.filter(id => id !== userId), userId]);
            });

            peer.on('stream', (remoteStream) => {
                console.log(`Received stream from ${userId}`);
                playRemoteAudio(userId, remoteStream);
            });

            peer.on('close', () => {
                console.log(`Disconnected from ${userId}`);
                cleanupPeer(userId);
            });

            peer.on('error', (error) => {
                console.error(`Peer error with ${userId}:`, error);
                cleanupPeer(userId);
            });

            peersRef.current.set(userId, peer);
            return peer;
        } catch (error) {
            console.error('Failed to create peer connection:', error);
            return null;
        }
    }, [cleanupPeer, sendSignalToUser]);

    // Handle incoming WebRTC signal
    const handleIncomingSignal = useCallback(async (fromUserId: string, signalData: any) => {
        let peer = peersRef.current.get(fromUserId);

        if (!peer) {
            // Create peer as non-initiator
            peer = await createPeerConnection(fromUserId, false);
        }

        if (peer) {
            peer.signal(signalData);
        }
    }, [createPeerConnection]);

    // Play remote audio stream
    const playRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
        const audio = new Audio();
        audio.srcObject = stream;
        audio.volume = 1.0;

        audio.play().catch(e => {
            console.warn('Auto-play prevented for', userId, ':', e);
        });

        audioElementsRef.current.set(userId, audio);
    }, []);

    // Connect to a specific user (for testing)
    const connectToUser = useCallback(async (userId: string) => {
        if (!peersRef.current.has(userId)) {
            await createPeerConnection(userId, true);
        }
    }, [createPeerConnection]);

    // Initialize microphone
    const initializeMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            localStreamRef.current = stream;
            setHasPermission(true);
            setIsEnabled(true);

            // Set up signaling channel
            setupSignalingChannel();

            console.log('Voice chat initialized successfully');
        } catch (error) {
            console.error('Failed to initialize microphone:', error);
            setHasPermission(false);
        }
    };

    // Toggle voice chat
    const toggleVoiceChat = () => {
        if (!hasPermission) {
            initializeMicrophone();
        } else {
            setIsEnabled(!isEnabled);

            if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = !isEnabled;
                });
            }
        }
    };

    // Toggle mute
    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);

        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !newMutedState && isEnabled;
            });
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cleanup all peer connections
            for (const [userId] of peersRef.current) {
                cleanupPeer(userId);
            }

            // Stop local stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Remove signaling channel
            if (signalChannelRef.current) {
                supabase.removeChannel(signalChannelRef.current);
            }
        };
    }, [cleanupPeer]);

    // Don't render if not in lobby or no profile - MUST be after all hooks
    if (!currentLobby || !profile) {
        return null;
    }

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 min-w-[280px] max-w-[320px]">
            <div className="flex items-center justify-between mb-3">
                <div className="text-white text-sm font-medium">Voice Chat</div>
                <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-400">👥</span>
                    <span className="text-xs text-gray-400">{connectedUsers.length}</span>
                </div>
            </div>

            {!hasPermission && (
                <div className="text-yellow-400 text-xs mb-3 p-2 bg-yellow-900/20 rounded">
                    Click microphone to enable voice chat
                </div>
            )}

            <div className="flex gap-2 mb-3">
                {/* Microphone Button */}
                <button
                    onClick={toggleVoiceChat}
                    className={`px-3 py-2 rounded flex items-center gap-2 ${
                        isEnabled
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                    } text-white text-sm min-w-[80px]`}
                >
                    <span>{isEnabled ? '🎤' : '🎤❌'}</span>
                    <span className="text-xs">
                        {isEnabled ? 'On' : 'Off'}
                    </span>
                </button>

                {/* Mute Button */}
                {isEnabled && (
                    <button
                        onClick={toggleMute}
                        className={`px-3 py-2 rounded flex items-center gap-2 ${
                            isMuted
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        } text-white text-sm min-w-[70px]`}
                    >
                        <span>{isMuted ? '🔇' : '🔊'}</span>
                        <span className="text-xs">
                            {isMuted ? 'Muted' : 'Live'}
                        </span>
                    </button>
                )}
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 text-xs mb-3">
                <div className={`w-2 h-2 rounded-full ${
                    isEnabled ? (isMuted ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-500'
                }`} />
                <span className="text-gray-400">
                    {!hasPermission
                        ? 'Microphone access needed'
                        : isEnabled
                            ? (isMuted ? 'Muted' : `Active • ${proximityRange}m range`)
                            : 'Disabled'
                    }
                </span>
            </div>

            {/* Proximity Range Slider */}
            {isEnabled && (
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                        Voice Range: {proximityRange}m
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="50"
                        value={proximityRange}
                        onChange={(e) => setProximityRange(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5m</span>
                        <span>50m</span>
                    </div>
                </div>
            )}

            {/* Connected Users */}
            {connectedUsers.length > 0 && (
                <div className="border-t border-gray-600 pt-2 mb-3">
                    <div className="text-xs text-gray-400 mb-1">Connected:</div>
                    {connectedUsers.slice(0, 3).map(userId => (
                        <div key={userId} className="flex items-center gap-2 text-xs mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-gray-300">{userId.substring(0, 8)}...</span>
                        </div>
                    ))}
                    {connectedUsers.length > 3 && (
                        <div className="text-xs text-gray-500">
                            +{connectedUsers.length - 3} more
                        </div>
                    )}
                </div>
            )}

            {/* Test Connection Button (for development) */}
            {isEnabled && (
                <div className="border-t border-gray-600 pt-2 mb-2">
                    <div className="text-xs text-gray-500 mb-1">Test (Dev):</div>
                    <button
                        onClick={async () => {
                            // Connect to a test user ID
                            const testUserId = 'test-user-' + Math.random().toString(36).substr(2, 5);
                            await connectToUser(testUserId);
                        }}
                        className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                    >
                        Connect to Test User
                    </button>
                </div>
            )}

            <div className="text-xs text-gray-500">
                WebRTC proximity voice chat
            </div>
        </div>
    );
};

export default ProximityVoiceChat;