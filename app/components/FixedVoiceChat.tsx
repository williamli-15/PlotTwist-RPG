// FixedVoiceChat.tsx - Clean voice chat implementation
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';

const FixedVoiceChat: React.FC = () => {
    const { currentLobby, profile } = useLobbyStore();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<string[]>([]);

    const localStreamRef = useRef<MediaStream | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Don't render if not in lobby or no profile
    if (!currentLobby || !profile) {
        return null;
    }

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
                            ? (isMuted ? 'Muted' : 'Active • 15m range')
                            : 'Disabled'
                    }
                </span>
            </div>

            {/* Connected Users */}
            {connectedUsers.length > 0 && (
                <div className="border-t border-gray-600 pt-2">
                    <div className="text-xs text-gray-400 mb-1">Connected:</div>
                    {connectedUsers.slice(0, 3).map(userId => (
                        <div key={userId} className="flex items-center gap-2 text-xs mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-gray-300">{userId.substring(0, 8)}...</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
                Proximity voice chat (prototype)
            </div>
        </div>
    );
};

export default FixedVoiceChat;