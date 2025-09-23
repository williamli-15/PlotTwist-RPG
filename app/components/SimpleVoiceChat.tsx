// SimpleVoiceChat.tsx - Minimal voice chat overlay
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';

const SimpleVoiceChat: React.FC = () => {
    const { currentLobby, profile } = useLobbyStore();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    // Don't render if not in lobby or no profile
    if (!currentLobby || !profile) {
        return null;
    }

    const requestMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
            setIsEnabled(true);
            // Stop the stream for now - just testing permission
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.error('Microphone permission denied:', error);
            setHasPermission(false);
        }
    };

    const toggleVoiceChat = () => {
        if (!hasPermission) {
            requestMicrophone();
        } else {
            setIsEnabled(!isEnabled);
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4 min-w-[200px]">
            <div className="text-white text-sm font-medium mb-3">Voice Chat</div>

            {!hasPermission && (
                <div className="text-yellow-400 text-xs mb-2">
                    Click to enable microphone
                </div>
            )}

            <div className="flex gap-2">
                {/* Microphone Button */}
                <button
                    onClick={toggleVoiceChat}
                    className={`px-3 py-2 rounded ${
                        isEnabled
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-gray-700'
                    } text-white text-sm`}
                >
                    {isEnabled ? '🎤' : '🎤❌'}
                </button>

                {/* Mute Button - only show when enabled */}
                {isEnabled && (
                    <button
                        onClick={toggleMute}
                        className={`px-3 py-2 rounded ${
                            isMuted
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        } text-white text-sm`}
                    >
                        {isMuted ? '🔇' : '🔊'}
                    </button>
                )}
            </div>

            <div className="flex items-center gap-2 text-xs mt-2">
                <div className={`w-2 h-2 rounded-full ${
                    isEnabled ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="text-gray-400">
                    {!hasPermission
                        ? 'Microphone access needed'
                        : isEnabled
                            ? (isMuted ? 'Muted' : 'Active')
                            : 'Disabled'
                    }
                </span>
            </div>

            <div className="text-xs text-gray-500 mt-2">
                Proximity voice chat prototype
            </div>
        </div>
    );
};

export default SimpleVoiceChat;