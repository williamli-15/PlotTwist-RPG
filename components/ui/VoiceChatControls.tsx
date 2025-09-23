// VoiceChatControls.tsx - UI controls for proximity voice chat
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, Users } from 'lucide-react';
import { Button } from './button';
import { Card } from './card';

interface VoiceChatControlsProps {
    voiceChatService: any; // VoiceChatService instance
    onToggleVoiceChat: (enabled: boolean) => void;
    onToggleMute: (muted: boolean) => void;
    onProximityThresholdChange: (threshold: number) => void;
    isVoiceChatEnabled?: boolean;
    isMuted?: boolean;
    proximityThreshold?: number;
    connectedUsers?: string[];
}

export const VoiceChatControls: React.FC<VoiceChatControlsProps> = ({
    voiceChatService,
    onToggleVoiceChat,
    onToggleMute,
    onProximityThresholdChange,
    isVoiceChatEnabled = true,
    isMuted = false,
    proximityThreshold = 10,
    connectedUsers = []
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [tempThreshold, setTempThreshold] = useState(proximityThreshold);
    const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

    useEffect(() => {
        // Check microphone permission status
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'microphone' as PermissionName }).then((result) => {
                setMicrophonePermission(result.state);
                result.addEventListener('change', () => {
                    setMicrophonePermission(result.state);
                });
            });
        }
    }, []);

    const handleToggleVoiceChat = async () => {
        if (!isVoiceChatEnabled && microphonePermission !== 'granted') {
            // Request microphone permission
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setMicrophonePermission('granted');
            } catch (error) {
                console.error('Microphone permission denied:', error);
                setMicrophonePermission('denied');
                return;
            }
        }
        onToggleVoiceChat(!isVoiceChatEnabled);
    };

    const handleToggleMute = () => {
        onToggleMute(!isMuted);
    };

    const handleThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        setTempThreshold(value);
        onProximityThresholdChange(value);
    };

    const getMicrophoneStatusIcon = () => {
        if (!isVoiceChatEnabled) return <MicOff className="w-4 h-4" />;
        if (isMuted) return <MicOff className="w-4 h-4" />;
        return <Mic className="w-4 h-4" />;
    };

    const getMicrophoneStatusColor = () => {
        if (!isVoiceChatEnabled) return 'bg-gray-600 hover:bg-gray-500';
        if (isMuted) return 'bg-red-600 hover:bg-red-500';
        return 'bg-green-600 hover:bg-green-500';
    };

    const getVolumeStatusColor = () => {
        return isVoiceChatEnabled ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 hover:bg-gray-500';
    };

    return (
        <Card className="fixed bottom-4 right-4 p-4 bg-black/80 backdrop-blur-sm border-gray-700 min-w-[280px]">
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-white text-sm font-medium">Voice Chat</h3>
                    <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">{connectedUsers.length}</span>
                    </div>
                </div>

                {/* Microphone Permission Warning */}
                {microphonePermission === 'denied' && (
                    <div className="bg-red-900/50 border border-red-700 rounded p-2">
                        <p className="text-red-300 text-xs">
                            Microphone access denied. Please enable in browser settings.
                        </p>
                    </div>
                )}

                {/* Main Controls */}
                <div className="flex items-center gap-2">
                    {/* Microphone Toggle */}
                    <Button
                        size="sm"
                        className={`${getMicrophoneStatusColor()} text-white px-3 py-2`}
                        onClick={handleToggleVoiceChat}
                        disabled={microphonePermission === 'denied'}
                        title={isVoiceChatEnabled ? (isMuted ? 'Unmute' : 'Mute') : 'Enable Voice Chat'}
                    >
                        {getMicrophoneStatusIcon()}
                    </Button>

                    {/* Mute/Unmute (only when voice chat is enabled) */}
                    {isVoiceChatEnabled && (
                        <Button
                            size="sm"
                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2"
                            onClick={handleToggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </Button>
                    )}

                    {/* Settings Toggle */}
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700 px-3 py-2"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${isVoiceChatEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-gray-400">
                        {!isVoiceChatEnabled
                            ? 'Voice chat disabled'
                            : isMuted
                                ? 'Muted'
                                : `Active • ${proximityThreshold}m range`}
                    </span>
                </div>

                {/* Connected Users List */}
                {connectedUsers.length > 0 && (
                    <div className="border-t border-gray-700 pt-2">
                        <p className="text-xs text-gray-400 mb-1">Connected:</p>
                        <div className="space-y-1">
                            {connectedUsers.slice(0, 3).map((userId) => (
                                <div key={userId} className="flex items-center gap-2 text-xs">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-gray-300">{userId}</span>
                                </div>
                            ))}
                            {connectedUsers.length > 3 && (
                                <p className="text-xs text-gray-500">
                                    +{connectedUsers.length - 3} more
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Settings Panel */}
                {showSettings && (
                    <div className="border-t border-gray-700 pt-3 space-y-3">
                        {/* Proximity Threshold */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">
                                Voice Range: {tempThreshold}m
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                value={tempThreshold}
                                onChange={handleThresholdChange}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                disabled={!isVoiceChatEnabled}
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>5m</span>
                                <span>50m</span>
                            </div>
                        </div>

                        {/* Audio Quality Info */}
                        <div className="text-xs text-gray-500">
                            <p>• Automatic echo cancellation</p>
                            <p>• Noise suppression enabled</p>
                            <p>• 3D spatial audio</p>
                        </div>
                    </div>
                )}
            </div>

            {/* CSS for custom slider */}
            <style jsx>{`
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                }

                .slider::-moz-range-thumb {
                    height: 16px;
                    width: 16px;
                    border-radius: 50%;
                    background: #3b82f6;
                    cursor: pointer;
                    border: none;
                }
            `}</style>
        </Card>
    );
};

export default VoiceChatControls;