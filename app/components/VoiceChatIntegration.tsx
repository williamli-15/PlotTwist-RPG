// VoiceChatIntegration.tsx - Integration component for voice chat with lobby system
import React, { useEffect, useRef, useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import VoiceChatService from './VoiceChatService';
import VoiceChatControls from '../../components/ui/VoiceChatControls';

interface VoiceChatIntegrationProps {
    avatarPositions?: Map<string, { x: number; y: number; z: number }>;
    onPositionUpdate?: (userId: string, position: { x: number; y: number; z: number }) => void;
}

interface VoiceSignal {
    from_user_id: string;
    to_user_id: string;
    signal_data: any;
    lobby_id: string;
    timestamp: string;
}

export const VoiceChatIntegration: React.FC<VoiceChatIntegrationProps> = ({
    avatarPositions = new Map(),
    onPositionUpdate
}) => {
    const {
        currentLobby,
        profile,
        otherAvatars,
        realtimeChannel
    } = useLobbyStore();

    const voiceChatService = useRef<VoiceChatService | null>(null);
    const signalChannel = useRef<any>(null);

    const [isVoiceChatEnabled, setIsVoiceChatEnabled] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [proximityThreshold, setProximityThreshold] = useState(15);
    const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize voice chat service
    useEffect(() => {
        if (!voiceChatService.current) {
            voiceChatService.current = new VoiceChatService();

            // Set up event handlers
            voiceChatService.current.onSignal = (userId: string, signalData: any) => {
                sendVoiceSignal(userId, signalData);
            };

            voiceChatService.current.onPeerConnected = (userId: string) => {
                setConnectedUsers(prev => [...prev.filter(id => id !== userId), userId]);
            };

            voiceChatService.current.onPeerDisconnected = (userId: string) => {
                setConnectedUsers(prev => prev.filter(id => id !== userId));
            };
        }

        return () => {
            if (voiceChatService.current) {
                voiceChatService.current.destroy();
                voiceChatService.current = null;
            }
        };
    }, []);

    // Set up WebRTC signaling channel when joining lobby
    useEffect(() => {
        if (currentLobby && profile) {
            setupSignalingChannel(currentLobby.lobbyId);
        } else {
            cleanupSignalingChannel();
        }

        return cleanupSignalingChannel;
    }, [currentLobby, profile]);

    // Update avatar positions in voice chat service
    useEffect(() => {
        if (voiceChatService.current && avatarPositions.size > 0) {
            for (const [userId, position] of avatarPositions) {
                voiceChatService.current.updateAvatarPosition(userId, position);
            }
        }
    }, [avatarPositions]);

    // Update positions from other avatars
    useEffect(() => {
        if (voiceChatService.current && otherAvatars.size > 0) {
            for (const [profileId, avatarState] of otherAvatars) {
                if (avatarState.position_x !== undefined &&
                    avatarState.position_y !== undefined &&
                    avatarState.position_z !== undefined) {

                    voiceChatService.current.updateAvatarPosition(profileId, {
                        x: avatarState.position_x,
                        y: avatarState.position_y,
                        z: avatarState.position_z
                    });
                }
            }
        }
    }, [otherAvatars]);

    const setupSignalingChannel = (lobbyId: string) => {
        if (signalChannel.current) {
            supabase.removeChannel(signalChannel.current);
        }

        // Create signaling channel for WebRTC
        signalChannel.current = supabase
            .channel(`voice-signals:${lobbyId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'voice_signals',
                    filter: `lobby_id=eq.${lobbyId}`
                },
                (payload) => {
                    const signal = payload.new as VoiceSignal;

                    // Only process signals meant for us
                    if (signal.to_user_id === profile?.id && voiceChatService.current) {
                        voiceChatService.current.processSignal(signal.from_user_id, signal.signal_data);
                    }
                }
            )
            .subscribe();
    };

    const cleanupSignalingChannel = () => {
        if (signalChannel.current) {
            supabase.removeChannel(signalChannel.current);
            signalChannel.current = null;
        }
    };

    const sendVoiceSignal = async (toUserId: string, signalData: any) => {
        if (!profile || !currentLobby) return;

        try {
            await supabase.from('voice_signals').insert({
                from_user_id: profile.id,
                to_user_id: toUserId,
                signal_data: signalData,
                lobby_id: currentLobby.lobbyId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to send voice signal:', error);
        }
    };

    const handleToggleVoiceChat = async (enabled: boolean) => {
        if (!voiceChatService.current) return;

        if (enabled && !isInitialized) {
            const success = await voiceChatService.current.initialize();
            if (!success) {
                console.error('Failed to initialize voice chat');
                return;
            }
            setIsInitialized(true);
        }

        voiceChatService.current.setEnabled(enabled);
        setIsVoiceChatEnabled(enabled);

        if (!enabled) {
            setConnectedUsers([]);
        }
    };

    const handleToggleMute = (muted: boolean) => {
        if (voiceChatService.current) {
            voiceChatService.current.setMuted(muted);
            setIsMuted(muted);
        }
    };

    const handleProximityThresholdChange = (threshold: number) => {
        if (voiceChatService.current) {
            voiceChatService.current.setProximityThreshold(threshold);
            setProximityThreshold(threshold);
        }
    };

    // Update our own position in voice chat
    const updateMyPosition = (position: { x: number; y: number; z: number }) => {
        if (voiceChatService.current) {
            voiceChatService.current.updateAvatarPosition('self', position);
        }

        // Also update in lobby store if needed
        if (onPositionUpdate && profile) {
            onPositionUpdate(profile.id, position);
        }
    };

    // Don't render if not in lobby or no profile
    if (!currentLobby || !profile) {
        return null;
    }

    return (
        <>
            <VoiceChatControls
                voiceChatService={voiceChatService.current}
                onToggleVoiceChat={handleToggleVoiceChat}
                onToggleMute={handleToggleMute}
                onProximityThresholdChange={handleProximityThresholdChange}
                isVoiceChatEnabled={isVoiceChatEnabled}
                isMuted={isMuted}
                proximityThreshold={proximityThreshold}
                connectedUsers={connectedUsers}
            />
        </>
    );
};

export default VoiceChatIntegration;