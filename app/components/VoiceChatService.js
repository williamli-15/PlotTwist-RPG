// VoiceChatService.js - WebRTC-based proximity voice chat
import SimplePeer from 'simple-peer';

class VoiceChatService {
    constructor() {
        this.peers = new Map(); // userId -> peer connection
        this.localStream = null;
        this.isInitialized = false;
        this.onPeerConnected = null;
        this.onPeerDisconnected = null;
        this.proximityThreshold = 10; // Distance threshold for voice chat
        this.avatarPositions = new Map(); // userId -> {x, y, z}
        this.audioElements = new Map(); // userId -> audio element
        this.isEnabled = true;
        this.isMuted = false;

        // Bind methods
        this.handleSignal = this.handleSignal.bind(this);
        this.handlePeerConnect = this.handlePeerConnect.bind(this);
        this.handlePeerClose = this.handlePeerClose.bind(this);
        this.handlePeerError = this.handlePeerError.bind(this);
        this.handlePeerStream = this.handlePeerStream.bind(this);
    }

    // Initialize microphone access
    async initialize() {
        if (this.isInitialized) return true;

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                },
                video: false
            });

            this.isInitialized = true;
            console.log('Voice chat initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize voice chat:', error);
            return false;
        }
    }

    // Create peer connection to another user
    createPeerConnection(userId, initiator = false, signalData = null) {
        if (this.peers.has(userId)) {
            this.peers.get(userId).destroy();
        }

        const peer = new SimplePeer({
            initiator,
            stream: this.localStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        // Handle signaling
        peer.on('signal', (data) => {
            this.handleSignal(userId, data);
        });

        // Handle connection
        peer.on('connect', () => {
            this.handlePeerConnect(userId);
        });

        // Handle incoming stream
        peer.on('stream', (stream) => {
            this.handlePeerStream(userId, stream);
        });

        // Handle disconnection
        peer.on('close', () => {
            this.handlePeerClose(userId);
        });

        // Handle errors
        peer.on('error', (error) => {
            this.handlePeerError(userId, error);
        });

        this.peers.set(userId, peer);

        // If we have signal data, process it
        if (signalData) {
            peer.signal(signalData);
        }

        return peer;
    }

    // Handle WebRTC signaling
    handleSignal(userId, signalData) {
        // This will be called by the signaling mechanism (Supabase realtime)
        if (this.onSignal) {
            this.onSignal(userId, signalData);
        }
    }

    // Process incoming signal from another peer
    processSignal(userId, signalData) {
        let peer = this.peers.get(userId);
        if (!peer) {
            // Create peer connection as non-initiator
            peer = this.createPeerConnection(userId, false);
        }
        peer.signal(signalData);
    }

    // Handle successful peer connection
    handlePeerConnect(userId) {
        console.log(`Voice chat connected to ${userId}`);
        if (this.onPeerConnected) {
            this.onPeerConnected(userId);
        }
    }

    // Handle peer disconnection
    handlePeerClose(userId) {
        console.log(`Voice chat disconnected from ${userId}`);
        this.cleanupPeer(userId);
        if (this.onPeerDisconnected) {
            this.onPeerDisconnected(userId);
        }
    }

    // Handle peer errors
    handlePeerError(userId, error) {
        console.error(`Voice chat error with ${userId}:`, error);
        this.cleanupPeer(userId);
    }

    // Handle incoming audio stream
    handlePeerStream(userId, stream) {
        console.log(`Received audio stream from ${userId}`);

        // Create audio element for this peer
        const audio = new Audio();
        audio.srcObject = stream;
        audio.play().catch(e => console.warn('Auto-play prevented:', e));

        // Store audio element
        this.audioElements.set(userId, audio);

        // Apply initial spatial audio settings
        this.updateSpatialAudio(userId);
    }

    // Update avatar position for proximity calculation
    updateAvatarPosition(userId, position) {
        this.avatarPositions.set(userId, position);

        // Update spatial audio for this user
        this.updateSpatialAudio(userId);

        // Check if we should connect/disconnect based on proximity
        this.checkProximity(userId);
    }

    // Update spatial audio based on position
    updateSpatialAudio(userId) {
        const audio = this.audioElements.get(userId);
        const position = this.avatarPositions.get(userId);
        const myPosition = this.avatarPositions.get('self'); // Our own position

        if (!audio || !position || !myPosition) return;

        // Calculate distance
        const distance = Math.sqrt(
            Math.pow(position.x - myPosition.x, 2) +
            Math.pow(position.y - myPosition.y, 2) +
            Math.pow(position.z - myPosition.z, 2)
        );

        // Apply volume based on distance
        const maxDistance = this.proximityThreshold;
        const volume = Math.max(0, 1 - (distance / maxDistance));
        audio.volume = this.isEnabled ? volume : 0;

        // Apply basic 3D positioning (simplified)
        if (audio.setSinkId) {
            // Calculate left/right positioning
            const deltaX = position.x - myPosition.x;
            const pan = Math.max(-1, Math.min(1, deltaX / maxDistance));

            // This is a basic implementation - for true 3D audio, use Web Audio API
            if (audio.mozSrcObject) {
                // Firefox
                audio.style.transform = `translateX(${pan * 100}px)`;
            }
        }
    }

    // Check if users are within proximity threshold
    checkProximity(userId) {
        const position = this.avatarPositions.get(userId);
        const myPosition = this.avatarPositions.get('self');

        if (!position || !myPosition) return;

        const distance = Math.sqrt(
            Math.pow(position.x - myPosition.x, 2) +
            Math.pow(position.y - myPosition.y, 2) +
            Math.pow(position.z - myPosition.z, 2)
        );

        const shouldConnect = distance <= this.proximityThreshold;
        const isConnected = this.peers.has(userId) && this.peers.get(userId).connected;

        if (shouldConnect && !isConnected && this.isEnabled) {
            // Initiate connection
            this.createPeerConnection(userId, true);
        } else if (!shouldConnect && isConnected) {
            // Disconnect
            this.disconnectPeer(userId);
        }
    }

    // Disconnect from a specific peer
    disconnectPeer(userId) {
        const peer = this.peers.get(userId);
        if (peer) {
            peer.destroy();
        }
        this.cleanupPeer(userId);
    }

    // Cleanup peer resources
    cleanupPeer(userId) {
        this.peers.delete(userId);

        const audio = this.audioElements.get(userId);
        if (audio) {
            audio.pause();
            audio.srcObject = null;
            this.audioElements.delete(userId);
        }
    }

    // Mute/unmute microphone
    setMuted(muted) {
        this.isMuted = muted;
        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }

    // Enable/disable voice chat
    setEnabled(enabled) {
        this.isEnabled = enabled;

        if (!enabled) {
            // Disconnect all peers
            for (const [userId] of this.peers) {
                this.disconnectPeer(userId);
            }
        } else {
            // Reconnect to nearby users
            for (const [userId] of this.avatarPositions) {
                if (userId !== 'self') {
                    this.checkProximity(userId);
                }
            }
        }

        // Update audio volumes
        for (const [userId, audio] of this.audioElements) {
            if (audio) {
                this.updateSpatialAudio(userId);
            }
        }
    }

    // Set proximity threshold
    setProximityThreshold(threshold) {
        this.proximityThreshold = threshold;

        // Recheck all proximities
        for (const [userId] of this.avatarPositions) {
            if (userId !== 'self') {
                this.checkProximity(userId);
            }
        }
    }

    // Get connection status
    getConnectionStatus() {
        const connections = {};
        for (const [userId, peer] of this.peers) {
            connections[userId] = {
                connected: peer.connected,
                destroyed: peer.destroyed
            };
        }
        return connections;
    }

    // Cleanup all connections
    destroy() {
        // Disconnect all peers
        for (const [userId] of this.peers) {
            this.disconnectPeer(userId);
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.isInitialized = false;
        console.log('Voice chat service destroyed');
    }
}

export default VoiceChatService;