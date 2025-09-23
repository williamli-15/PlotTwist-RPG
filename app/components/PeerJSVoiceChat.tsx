// PeerJSVoiceChat.tsx - Voice chat using PeerJS
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import { Peer } from 'peerjs';

// Note: Old VoiceSignal interface removed since we use proximity-based connections

const PeerJSVoiceChat: React.FC = () => {
    const { currentLobby, profile } = useLobbyStore();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
    const [proximityRange, setProximityRange] = useState(15);
    const [micLevel, setMicLevel] = useState(0);
    const [isTestingMic, setIsTestingMic] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [proximityUsers, setProximityUsers] = useState<string[]>([]);
    const [myPosition, setMyPosition] = useState({ x: 0, y: 0, z: 0 });

    const localStreamRef = useRef<MediaStream | null>(null);
    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<Map<string, any>>(new Map());
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const connectingUsersRef = useRef<Set<string>>(new Set()); // Track connection attempts

    // Debug logging function
    const addDebugLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        console.log(logMessage);
        setDebugLogs(prev => [...prev.slice(-4), logMessage]); // Keep last 5 logs
    }, []);


    // Store our peer ID in database
    const storePeerIdInDatabase = useCallback(async (peerId: string) => {
        if (!profile?.id || !currentLobby?.lobbyId) {
            addDebugLog(`⚠️ Cannot store peer ID - missing profile: ${!!profile?.id}, lobby: ${!!currentLobby?.lobbyId}`);
            return;
        }

        addDebugLog(`💾 Storing peer ID for ${profile.username || profile.id.substring(0, 8)}: ${peerId.substring(0, 30)}...`);

        try {
            const { error } = await supabase
                .from('peer_connections')
                .upsert({
                    profile_id: profile.id,
                    lobby_id: currentLobby.lobbyId,
                    peer_id: peerId,
                    is_online: true,
                    last_seen: new Date().toISOString()
                }, {
                    onConflict: 'profile_id,lobby_id'
                });

            if (error) {
                addDebugLog(`❌ Failed to store peer ID: ${error.message}`);
            } else {
                addDebugLog(`✅ Successfully stored peer ID for ${profile.id.substring(0, 8)}`);
            }
        } catch (error) {
            addDebugLog(`❌ Error storing peer ID: ${error}`);
        }
    }, [profile?.id, profile?.username, currentLobby?.lobbyId, addDebugLog]);

    // Get peer ID for a user from database
    const getPeerIdFromDatabase = useCallback(async (profileId: string): Promise<string | null> => {
        if (!currentLobby?.lobbyId) return null;

        try {
            // First check what's actually in the table
            const { data: allData, error: allError } = await supabase
                .from('peer_connections')
                .select('*')
                .eq('lobby_id', currentLobby.lobbyId);

            if (allError) {
                addDebugLog(`❌ Database query error: ${allError.message}`);
                return null;
            }

            addDebugLog(`📊 All peer_connections in lobby: ${allData?.map(r => ({ profile: r.profile_id.substring(0, 8), peer: r.peer_id.substring(0, 20), online: r.is_online }))}`);

            // Find the specific user
            const userConnection = allData?.find(row => row.profile_id === profileId && row.is_online);

            if (userConnection) {
                // Check if this peer ID is recent (within 5 minutes)
                const lastSeen = new Date(userConnection.last_seen);
                const now = new Date();
                const minutesAgo = (now.getTime() - lastSeen.getTime()) / 1000 / 60;

                if (minutesAgo > 5) {
                    addDebugLog(`⚠️ Peer ID for ${profileId.substring(0, 8)} is ${minutesAgo.toFixed(1)} minutes old - removing stale entry`);

                    // Remove stale peer ID from database
                    await supabase
                        .from('peer_connections')
                        .delete()
                        .eq('profile_id', profileId)
                        .eq('lobby_id', currentLobby.lobbyId);

                    return null; // Treat as if no peer ID found
                }

                addDebugLog(`✅ Found peer ID for ${profileId.substring(0, 8)}: ${userConnection.peer_id.substring(0, 30)}...`);
                return userConnection.peer_id;
            } else {
                const dbProfiles = allData?.map(r => r.profile_id.substring(0, 8)).join(', ') || 'none';
                addDebugLog(`❌ No peer connection found for ${profileId.substring(0, 8)}. DB has: ${dbProfiles}`);
                return null;
            }
        } catch (error) {
            addDebugLog(`❌ Error getting peer ID: ${error}`);
            return null;
        }
    }, [currentLobby?.lobbyId, addDebugLog]);

    // Update our last seen timestamp
    const updateLastSeen = useCallback(async () => {
        if (!profile?.id || !currentLobby?.lobbyId) return;

        try {
            await supabase
                .from('peer_connections')
                .update({ last_seen: new Date().toISOString() })
                .eq('profile_id', profile.id)
                .eq('lobby_id', currentLobby.lobbyId);
        } catch (error) {
            // Silently fail for last_seen updates
        }
    }, [profile?.id, currentLobby?.lobbyId]);

    // Cleanup function
    const cleanupConnection = useCallback((userId: string) => {
        const conn = connectionsRef.current.get(userId);
        if (conn && !conn.destroyed) {
            conn.close();
        }
        connectionsRef.current.delete(userId);
        connectingUsersRef.current.delete(userId); // Clean up connecting state

        const audio = audioElementsRef.current.get(userId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            audioElementsRef.current.delete(userId);
        }

        setConnectedUsers(prev => prev.filter(id => id !== userId));
    }, []);

    // Disconnect from a specific user
    const disconnectFromUser = useCallback((userId: string) => {
        addDebugLog(`🔌 Manually disconnecting from ${userId}`);
        cleanupConnection(userId);
    }, [addDebugLog, cleanupConnection]);

    // Disconnect from all users
    const disconnectFromAll = useCallback(() => {
        addDebugLog('🔌 Disconnecting from all users');
        for (const [userId] of connectionsRef.current) {
            cleanupConnection(userId);
        }
        setConnectionStatus('Disconnected');
    }, [addDebugLog, cleanupConnection]);

    // Note: We no longer need Supabase signaling since PeerJS handles signaling
    // and we use proximity-based auto-connection instead of manual invitations

    // Handle incoming call
    const handleIncomingCall = useCallback((fromUserId: string, peerId: string) => {
        if (!peerRef.current || !localStreamRef.current) {
            addDebugLog(`Cannot handle call from ${fromUserId} - peer or stream missing`);
            return;
        }

        addDebugLog(`📞 Incoming call from ${fromUserId} (peer: ${peerId})`);
        setConnectionStatus(`Calling ${fromUserId}...`);

        // Verify local stream has audio tracks
        const audioTracks = localStreamRef.current.getAudioTracks();
        addDebugLog(`🎤 Local audio tracks: ${audioTracks.length}, enabled: ${audioTracks.map(t => t.enabled).join(',')}`);

        // Call the other peer
        const call = peerRef.current.call(peerId, localStreamRef.current);

        call.on('stream', (remoteStream) => {
            const remoteTracks = remoteStream.getAudioTracks();
            addDebugLog(`🔊 Received stream from ${fromUserId} - tracks: ${remoteTracks.length}, enabled: ${remoteTracks.map(t => t.enabled).join(',')}`);
            playRemoteAudio(fromUserId, remoteStream);
            setConnectedUsers(prev => [...prev.filter(id => id !== fromUserId), fromUserId]);
            setConnectionStatus(`Connected to ${fromUserId}`);
        });

        call.on('close', () => {
            addDebugLog(`📴 Call closed from ${fromUserId}`);
            cleanupConnection(fromUserId);
            setConnectionStatus('Disconnected');
        });

        call.on('error', (error) => {
            addDebugLog(`❌ Call error with ${fromUserId}: ${error.message}`);
            cleanupConnection(fromUserId);
            setConnectionStatus('Connection failed');
        });

        connectionsRef.current.set(fromUserId, call);
    }, [cleanupConnection, addDebugLog]);

    // Play remote audio stream
    const playRemoteAudio = useCallback((userId: string, stream: MediaStream) => {
        addDebugLog(`🎵 Setting up audio playback for ${userId}`);

        const audio = new Audio();
        audio.srcObject = stream;
        audio.volume = 1.0;
        audio.autoplay = true;

        // Add more detailed event listeners
        audio.addEventListener('loadedmetadata', () => {
            addDebugLog(`📂 Audio metadata loaded for ${userId}`);
        });

        audio.addEventListener('playing', () => {
            addDebugLog(`▶️ Audio playing for ${userId}`);
        });

        audio.addEventListener('error', (e) => {
            addDebugLog(`❌ Audio error for ${userId}: ${e}`);
        });

        audio.play().then(() => {
            addDebugLog(`✅ Audio play started successfully for ${userId}`);
        }).catch(e => {
            addDebugLog(`⚠️ Auto-play prevented for ${userId}: ${e.message}`);
            // Try to enable audio on user interaction
            audio.muted = true;
            audio.play().then(() => {
                addDebugLog(`🔇 Started muted audio for ${userId} (click to unmute)`);
            });
        });

        audioElementsRef.current.set(userId, audio);
    }, [addDebugLog]);

    // Set up microphone level monitoring
    const setupMicrophoneAnalysis = (stream: MediaStream) => {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            analyserRef.current.fftSize = 256;
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateMicLevel = () => {
                if (analyserRef.current && isEnabled && !isMuted) {
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / bufferLength;
                    setMicLevel(Math.floor((average / 255) * 100));
                } else {
                    setMicLevel(0);
                }
                requestAnimationFrame(updateMicLevel);
            };
            updateMicLevel();
        } catch (error) {
            console.warn('Failed to setup microphone analysis:', error);
        }
    };

    // Test microphone audio
    const testMicrophone = async () => {
        if (!localStreamRef.current) return;

        setIsTestingMic(true);
        addDebugLog('🔧 Starting microphone test...');

        try {
            // Create temporary audio element to play back microphone input
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(localStreamRef.current);
            const gainNode = audioContext.createGain();

            // 30% volume for better audibility
            gainNode.gain.value = 0.3;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);

            addDebugLog('🔊 Playing microphone input (low volume)');

            // Test for 2 seconds (shorter to reduce feedback risk)
            setTimeout(() => {
                gainNode.disconnect();
                source.disconnect();
                audioContext.close();
                setIsTestingMic(false);
                addDebugLog('✅ Microphone test completed');
            }, 2000);
        } catch (error) {
            addDebugLog(`❌ Microphone test failed: ${error}`);
            setIsTestingMic(false);
        }
    };

    // Initialize microphone and PeerJS
    const initializeMicrophone = async () => {
        try {
            // Get microphone access
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

            // Set up microphone level monitoring
            setupMicrophoneAnalysis(stream);

            // Initialize PeerJS with public server
            const peerId = `user-${profile?.id}-${Date.now()}`;
            const peer = new Peer(peerId, {
                debug: 1,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' }
                    ]
                }
            });

            peer.on('open', async (id) => {
                console.log('PeerJS connected with ID:', id);
                peerRef.current = peer;

                // Store our peer ID in the database
                await storePeerIdInDatabase(id);

                addDebugLog('✅ PeerJS connected and peer ID stored');
            });

            peer.on('call', (call) => {
                addDebugLog('📞 Direct incoming call received (not from signaling)');
                if (!localStreamRef.current) {
                    addDebugLog('❌ Cannot answer call - no local stream');
                    return;
                }

                // Answer the call with our stream
                const audioTracks = localStreamRef.current.getAudioTracks();
                addDebugLog(`🎤 Answering with ${audioTracks.length} audio tracks, enabled: ${audioTracks.map(t => t.enabled).join(',')}`);
                call.answer(localStreamRef.current);

                call.on('stream', (remoteStream) => {
                    const remoteTracks = remoteStream.getAudioTracks();
                    addDebugLog(`🔊 Received direct stream - tracks: ${remoteTracks.length}, enabled: ${remoteTracks.map(t => t.enabled).join(',')}`);

                    // Don't create a "direct-" entry for proximity calls - they should use profile IDs
                    // This prevents the persistent direct-xxx entries from appearing
                    addDebugLog(`📞 Direct call answered, but not adding to connected users list (should be handled by proximity system)`);
                });

                call.on('close', () => {
                    addDebugLog('📴 Direct call closed');
                    setConnectionStatus('Disconnected');
                });
            });

            peer.on('error', (error) => {
                console.error('PeerJS error:', error);
            });

            peer.on('disconnected', () => {
                console.log('PeerJS disconnected');
            });

            console.log('Voice chat initialized successfully');
        } catch (error) {
            console.error('Failed to initialize microphone:', error);
            setHasPermission(false);
        }
    };


    // Calculate distance between two 3D points
    const calculateDistance = useCallback((pos1: {x: number, y: number, z: number}, pos2: {x: number, y: number, z: number}) => {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }, []);

    // Connect to a user if not already connected
    const connectToUserIfNotConnected = useCallback(async (profileId: string) => {
        if (connectionsRef.current.has(profileId) || connectingUsersRef.current.has(profileId) || !peerRef.current || !localStreamRef.current) {
            if (connectingUsersRef.current.has(profileId)) {
                addDebugLog(`⏳ Already connecting to ${profileId.substring(0, 8)}, skipping duplicate attempt`);
            }
            return;
        }

        // Mark as connecting to prevent duplicates
        connectingUsersRef.current.add(profileId);

        // Get the user's peer ID from database
        const targetPeerId = await getPeerIdFromDatabase(profileId);
        if (!targetPeerId) {
            addDebugLog(`❌ No peer ID found for ${profileId.substring(0, 8)}...`);
            connectingUsersRef.current.delete(profileId); // Clean up connecting state
            return;
        }

        // Get user info for logging
        const { profilesCache } = useLobbyStore.getState();
        const userProfile = profilesCache.get(profileId);
        const userName = userProfile?.username || profileId.substring(0, 8);

        try {
            addDebugLog(`🔗 Auto-connecting to ${userName}...`);

            const call = peerRef.current.call(targetPeerId, localStreamRef.current);

            call.on('stream', (remoteStream) => {
                const remoteTracks = remoteStream.getAudioTracks();
                addDebugLog(`🔊 Auto-connected to ${userName} - tracks: ${remoteTracks.length}`);

                // Connection successful, remove from connecting set
                connectingUsersRef.current.delete(profileId);

                playRemoteAudio(profileId, remoteStream);
                setConnectedUsers(prev => [...prev.filter(id => id !== profileId), profileId]);
            });

            call.on('close', () => {
                addDebugLog(`📴 Auto-disconnected from ${userName}`);
                connectingUsersRef.current.delete(profileId);
                cleanupConnection(profileId);
            });

            call.on('error', (error) => {
                addDebugLog(`❌ Auto-connection error with ${userName}: ${error.message}`);
                connectingUsersRef.current.delete(profileId);
                cleanupConnection(profileId);
            });

            connectionsRef.current.set(profileId, call);
        } catch (error) {
            addDebugLog(`❌ Failed to auto-connect to ${profileId}: ${error}`);
            connectingUsersRef.current.delete(profileId);
        }
    }, [getPeerIdFromDatabase, addDebugLog, cleanupConnection, playRemoteAudio]);

    // Monitor proximity and manage voice connections
    const monitorProximity = useCallback(() => {
        const { otherAvatars, profile } = useLobbyStore.getState();

        if (!profile || !isEnabled) {
            addDebugLog(`⚠️ Proximity check skipped - profile: ${!!profile}, enabled: ${isEnabled}`);
            return;
        }

        addDebugLog(`🔍 Proximity check: My pos (${myPosition.x.toFixed(1)}, ${myPosition.y.toFixed(1)}, ${myPosition.z.toFixed(1)}), Others: ${otherAvatars.size}`);

        // Debug: log all other users
        const otherProfileIds = Array.from(otherAvatars.keys());
        addDebugLog(`👥 Other users: ${otherProfileIds.map(id => id.substring(0, 8)).join(', ')}`);

        const currentProximityUsers: string[] = [];
        const usersToConnect: string[] = [];
        const usersToDisconnect: string[] = [];

        // Check each other avatar's distance
        otherAvatars.forEach((avatarState, profileId) => {
            if (profileId === profile.id) {
                addDebugLog(`⚠️ Found my own avatar in otherAvatars - this should not happen`);
                return; // Skip self
            }

            const distance = calculateDistance(myPosition, avatarState.position);
            addDebugLog(`📏 Distance to ${profileId.substring(0, 8)} at (${avatarState.position.x.toFixed(1)}, ${avatarState.position.y.toFixed(1)}, ${avatarState.position.z.toFixed(1)}): ${distance.toFixed(1)}m (range: ${proximityRange}m)`);

            // Connect to users within proximity range
            if (distance <= proximityRange) {
                currentProximityUsers.push(profileId);

                // Should connect if not already connected
                if (!connectedUsers.includes(profileId)) {
                    usersToConnect.push(profileId);
                    addDebugLog(`➕ Will connect to ${profileId.substring(0, 8)}`);
                }
            } else {
                // Should disconnect if currently connected
                if (connectedUsers.includes(profileId)) {
                    usersToDisconnect.push(profileId);
                }
            }
        });

        // Update proximity users list
        setProximityUsers(currentProximityUsers);

        // Handle connections - but only attempt to connect to users who have peer IDs in the database
        // Use caller priority system: only the user with the smaller profile ID initiates the connection
        usersToConnect.forEach(async (profileId) => {
            // Quick check if this user has a peer ID in database before attempting connection
            const hasPeerId = await getPeerIdFromDatabase(profileId);
            if (hasPeerId) {
                // Only initiate connection if our profile ID is smaller (lexicographically)
                // This prevents both users from calling each other simultaneously
                if (profile.id < profileId) {
                    addDebugLog(`📞 Initiating connection to ${profileId.substring(0, 8)} (I am caller)`);
                    connectToUserIfNotConnected(profileId);
                } else {
                    addDebugLog(`📲 Waiting for ${profileId.substring(0, 8)} to call me (they are caller)`);
                }
            } else {
                addDebugLog(`⏭️ Skipping connection to ${profileId.substring(0, 8)} - no peer ID in database (user hasn't enabled voice chat)`);
            }
        });

        // Handle disconnections
        usersToDisconnect.forEach(profileId => {
            addDebugLog(`📍 ${profileId.substring(0, 8)}... moved out of range, disconnecting`);
            cleanupConnection(profileId);
        });

    }, [myPosition, proximityRange, isEnabled, connectedUsers, calculateDistance, connectToUserIfNotConnected, addDebugLog, cleanupConnection]);

    // Monitor position changes and proximity
    useEffect(() => {
        if (!currentLobby || !profile || !isEnabled) {
            addDebugLog(`⚠️ Position monitoring disabled - lobby: ${!!currentLobby}, profile: ${!!profile}, enabled: ${isEnabled}`);
            return;
        }

        addDebugLog(`👀 Starting position monitoring for ${profile.username}`);

        const interval = setInterval(() => {
            const { otherAvatars } = useLobbyStore.getState();

            // Try multiple ways to get current user's position
            let myPos = null;

            // Method 1: Try to get from global window (set by npc.tsx)
            if (typeof window !== 'undefined' && (window as any).currentAvatarPosition) {
                myPos = (window as any).currentAvatarPosition;
                addDebugLog(`📍 Got my position from global: (${myPos.x.toFixed(1)}, ${myPos.y.toFixed(1)}, ${myPos.z.toFixed(1)})`);
            }

            // Method 2: From otherAvatars (This won't work for current user, but keep for debugging)
            if (!myPos) {
                const myAvatarState = otherAvatars.get(profile.id);
                if (myAvatarState?.position) {
                    myPos = myAvatarState.position;
                    addDebugLog(`📍 Got my position from otherAvatars: (${myPos.x.toFixed(1)}, ${myPos.y.toFixed(1)}, ${myPos.z.toFixed(1)})`);
                }
            }

            // Method 3: Try to get from DOM element with id 'npc-scene'
            if (!myPos) {
                const sceneElement = document.getElementById('npc-scene');
                if (sceneElement && (sceneElement as any).avatarPosition) {
                    myPos = (sceneElement as any).avatarPosition;
                    addDebugLog(`📍 Got my position from scene element: (${myPos.x.toFixed(1)}, ${myPos.y.toFixed(1)}, ${myPos.z.toFixed(1)})`);
                }
            }

            // Method 4: Use default spawn position if we can't find current position
            if (myPos) {
                setMyPosition(myPos);
                monitorProximity();
            } else {
                addDebugLog(`❌ Could not get current position - otherAvatars size: ${otherAvatars.size}, skipping proximity check`);
                // Don't set a default position - just skip this proximity check cycle
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [currentLobby, profile, isEnabled, monitorProximity, addDebugLog]);

    // Keep updating our last_seen timestamp
    useEffect(() => {
        if (!isEnabled || !profile?.id || !currentLobby?.lobbyId) return;

        const interval = setInterval(updateLastSeen, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, [isEnabled, profile?.id, currentLobby?.lobbyId, updateLastSeen]);

    // Mark as offline when component unmounts or voice is disabled
    useEffect(() => {
        return () => {
            if (profile?.id && currentLobby?.lobbyId) {
                // Mark as offline when leaving
                supabase
                    .from('peer_connections')
                    .update({ is_online: false })
                    .eq('profile_id', profile.id)
                    .eq('lobby_id', currentLobby.lobbyId)
                    .then();
            }
        };
    }, [profile?.id, currentLobby?.lobbyId]);

    // Toggle voice chat
    const toggleVoiceChat = () => {
        if (!hasPermission) {
            initializeMicrophone();
        } else {
            const newEnabledState = !isEnabled;
            setIsEnabled(newEnabledState);

            if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = newEnabledState;
                });
            }

            if (!newEnabledState) {
                // Disabling voice chat - clean up all connections and mark as offline
                addDebugLog('🔌 Disabling voice chat - cleaning up all connections');

                // Cleanup all active connections
                for (const [userId] of connectionsRef.current) {
                    addDebugLog(`📴 Disconnecting from ${userId}`);
                    cleanupConnection(userId);
                }

                // Stop all audio elements completely
                for (const [userId, audio] of audioElementsRef.current) {
                    addDebugLog(`🔇 Stopping audio for ${userId}`);
                    audio.pause();
                    audio.srcObject = null;
                    audio.remove(); // Remove from DOM completely
                }
                audioElementsRef.current.clear();

                // Stop local stream completely
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        addDebugLog(`⏹️ Stopping local audio track`);
                        track.stop();
                    });
                    localStreamRef.current = null;
                }

                // Close the peer connection
                if (peerRef.current && !peerRef.current.destroyed) {
                    peerRef.current.destroy();
                    peerRef.current = null;
                }

                // Close audio context
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                    audioContextRef.current = null;
                }

                // Mark as offline in database
                if (profile?.id && currentLobby?.lobbyId) {
                    supabase
                        .from('peer_connections')
                        .update({ is_online: false })
                        .eq('profile_id', profile.id)
                        .eq('lobby_id', currentLobby.lobbyId)
                        .then(() => {
                            addDebugLog('✅ Marked as offline in database');
                        });
                }

                // Clear connected users list
                setConnectedUsers([]);
                setProximityUsers([]);
                setConnectionStatus('Voice chat disabled');
            } else {
                // Enabling voice chat - reinitialize PeerJS connection
                addDebugLog('🔛 Enabling voice chat - reinitializing connection');
                initializeMicrophone();
                setConnectionStatus('Reconnecting...');
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
            // Cleanup all connections
            for (const [userId] of connectionsRef.current) {
                cleanupConnection(userId);
            }

            // Stop local stream
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }

            // Destroy peer
            if (peerRef.current) {
                peerRef.current.destroy();
            }

            // Close audio context
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, [cleanupConnection]);

    // Don't render if not in lobby or no profile
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
                            ? (isMuted ? 'Muted' : `Active • ${proximityRange}m range • ${proximityUsers.length} nearby`)
                            : 'Disabled'
                    }
                </span>
            </div>

            {/* Connection Status */}
            {isEnabled && (
                <div className="flex items-center gap-2 text-xs mb-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                        connectionStatus.includes('Connected') ? 'bg-green-500' :
                        connectionStatus.includes('Calling') || connectionStatus.includes('Connecting') ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-400">{connectionStatus}</span>
                </div>
            )}

            {/* Microphone Level Indicator */}
            {isEnabled && !!micLevel && (
                <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400">Mic Level:</span>
                        <span className="text-xs text-green-400">{micLevel}%</span>
                    </div>
                    <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-100"
                            style={{ width: `${Math.min(micLevel, 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Microphone Test */}
            {isEnabled && (
                <div className="mb-3">
                    <button
                        onClick={testMicrophone}
                        disabled={isTestingMic}
                        className={`w-full px-2 py-1 rounded text-xs ${
                            isTestingMic
                                ? 'bg-orange-600 text-white cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                    >
                        {isTestingMic ? 'Testing Audio (2s)...' : 'Test Microphone Audio'}
                    </button>
                </div>
            )}

            {/* Users in Range */}
            {isEnabled && proximityUsers.length > 0 && (
                <div className="border-t border-gray-600 pt-2 mb-3">
                    <div className="text-xs text-gray-400 mb-1">Users in Range ({proximityUsers.length}):</div>
                    <div className="max-h-12 overflow-y-auto">
                        {proximityUsers.map(profileId => {
                            const { profilesCache } = useLobbyStore.getState();
                            const userProfile = profilesCache.get(profileId);
                            const userName = userProfile?.username || profileId.substring(0, 8);
                            const isConnected = connectedUsers.includes(profileId);

                            return (
                                <div key={profileId} className="flex items-center gap-2 text-xs mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        isConnected ? 'bg-green-500' : 'bg-orange-500'
                                    }`} />
                                    <span className="text-gray-300 flex-1 text-[10px]">
                                        {userName} {isConnected ? '🔊' : '⏳'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Connected Users */}
            {connectedUsers.length > 0 && (
                <div className="border-t border-gray-600 pt-2 mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-gray-400">Connected ({connectedUsers.length}):</div>
                        {connectedUsers.length > 1 && (
                            <button
                                onClick={disconnectFromAll}
                                className="text-xs text-red-400 hover:text-red-300"
                                title="Disconnect from all"
                            >
                                ❌ All
                            </button>
                        )}
                    </div>
                    <div className="max-h-16 overflow-y-auto">
                        {connectedUsers.map(userId => {
                            // Get username for this user ID
                            const { profilesCache } = useLobbyStore.getState();
                            const userProfile = profilesCache.get(userId);
                            const displayName = userProfile?.username || userId.substring(0, 8);

                            return (
                                <div key={userId} className="flex items-center gap-2 text-xs mb-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span className="text-gray-300 flex-1 text-[10px]">
                                        {displayName}
                                    </span>
                                    <button
                                        onClick={() => disconnectFromUser(userId)}
                                        className="text-red-400 hover:text-red-300 text-xs"
                                        title="Disconnect"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}



        </div>
    );
};

export default PeerJSVoiceChat;