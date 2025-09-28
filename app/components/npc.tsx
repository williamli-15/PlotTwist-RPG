// @ts-nocheck
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TWEEN from '@tweenjs/tween.js';
import DynamicChatService from './DynamicChatService';
import summaryMetadata from '@/public/context/summary_metadata_with_vercel_urls.json';
import ReactMarkdown from 'react-markdown';
// import ttsService from './edgeTTSService'; // Removed TTS to fix WebSocket errors
import { useLobbyStore } from '@/lib/lobbyStore';
import nipplejs from 'nipplejs';



// Add this helper function near other utility functions
const getVercelUrlFromLocalPath = (localPath: string): string | null => {
    // Remove leading slash if present
    const normalizedPath = localPath.startsWith('/') ? localPath.slice(1) : localPath;

    // Search through all items in summary metadata
    for (const item of summaryMetadata) {
        // Look through _local_files array of each item
        const matchingFile = item._local_files?.find(file => 
            file.local_path === normalizedPath
        );

        if (matchingFile?.vercel_url) {
            return matchingFile.vercel_url;
        }
    }

    console.warn(`No Vercel URL found for local path: ${localPath}`);
    return null;
};

/*
const ANIMATION_IDLE = '/animations/Idle.fbx';
const ANIMATION_WALKING = '/animations/Walking.fbx';
*/
const ANIMATION_JUMP = '/animations/Jumping.fbx';

const ANIMATION_IDLE = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Idle-dG8ldlN0exams4VYcpKIhpPN6L2iu6.fbx';
const ANIMATION_WALKING = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Walking-TXPtML6DCMpX8XHsfjrAVcgRlnf5qE.fbx';

const Scene = ({ currentLobby }) => {
    const { 
        activeChatService,
        activeChatTarget,
        startChat,
        endChat: endChatStore,
        profile,  // ADD THIS
        showLobbySelection
    } = useLobbyStore();

    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const avatarRef = useRef(null);
    const npcRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const mixerRef = useRef(null);
    const animationActionsRef = useRef({});
    const currentAnimationRef = useRef(null);
    const npcMixerRef = useRef(null);
    const npcAnimationActionsRef = useRef({});
    const currentNpcAnimationRef = useRef(null);
    const tweenGroupRef = useRef(new TWEEN.Group());
    const isTransitioningRef = useRef(false);
    // ADD THIS NEW REF to track if the character is currently in the jump animation
    const isJumpingRef = useRef(false);
    const chatContainerRef = useRef(null);
    const originalCameraPositionRef = useRef(null);
    const originalCameraTargetRef = useRef(null);
    const [isNearNPC, setIsNearNPC] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    // 1. Add a ref to track current audio
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const ttsQueueRef = useRef<string[]>([]);
    const isSpeakingRef = useRef(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showMobileWarning, setShowMobileWarning] = useState(false);

    // Resizable chat state
    const [chatDimensions, setChatDimensions] = useState({ width: 1000, height: 475 }); // 475px = 375px content + 100px header/padding
    const [isResizingChat, setIsResizingChat] = useState(false);
    const [chatResizeHandle, setChatResizeHandle] = useState<string>('');
    const chatRef = useRef<HTMLDivElement>(null);
    // 2. ADD THESE REFS inside the Scene component (near other refs):
    const otherAvatarsRef = useRef(new Map()); // Store other users' VRM instances
    const positionUpdateInterval = useRef(0);   // For syncing position to database

    // ADD THESE NEW REFS:
    const nearestAvatarRef = useRef<any>(null);
    const INTERACTION_DISTANCE = 2.5; // Distance for F to talk interaction
    const HOST_NAME_DISTANCE = 12.5; // Distance for showing host name and crown (5x interaction distance)
    const PLAYER_NAME_DISTANCE = 8.0; // Distance for showing other players' usernames

    // Add loading state management to prevent duplicate requests
    const loadingAvatarsRef = useRef(new Set<string>()); // Track which avatars are currently loading

    // ============================================
    // MOVE THESE FUNCTIONS OUTSIDE init()
    // At component level, before init()
    // ============================================

    // Add disposal utility function
    const disposeObject = (object: THREE.Object3D) => {
        object.traverse((child) => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => {
                        if (material.map) material.map.dispose();
                        if (material.normalMap) material.normalMap.dispose();
                        if (material.emissiveMap) material.emissiveMap.dispose();
                        material.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    if (child.material.normalMap) child.material.normalMap.dispose();
                    if (child.material.emissiveMap) child.material.emissiveMap.dispose();
                    child.material.dispose();
                }
            }
        });
    };

    const loadOtherAvatar = async (profileId: string, avatarState: any) => {
        try {
            // Prevent duplicate loading requests
            if (loadingAvatarsRef.current.has(profileId)) {
                console.log(`Avatar ${profileId} is already loading, skipping...`);
                return;
            }

            // Check if avatar is already loaded
            if (otherAvatarsRef.current.has(profileId)) {
                console.log(`Avatar ${profileId} is already loaded, skipping...`);
                return;
            }

            // Check if we've exceeded the maximum number of avatars
            const MAX_AVATARS = 8; // Limit concurrent avatars
            if (otherAvatarsRef.current.size >= MAX_AVATARS) {
                console.warn(`Maximum avatars (${MAX_AVATARS}) reached, skipping load for ${profileId}`);
                return;
            }

            // Mark as loading
            loadingAvatarsRef.current.add(profileId);
            console.log(`Starting to load avatar for ${profileId}...`);

            const loader = new GLTFLoader();
            loader.crossOrigin = 'anonymous';
            loader.register((parser) => {
                return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
            });

            // Get profile info from cache
            const { profilesCache } = useLobbyStore.getState();
            const profile = profilesCache.get(profileId);
            if (!profile) {
                loadingAvatarsRef.current.delete(profileId);
                return;
            }

            // Load the avatar model
            const gltf = await loader.loadAsync(profile.selected_avatar_model);
            const vrm = gltf.userData.vrm;

            // Check if component is still mounted and scene exists
            if (!sceneRef.current) {
                loadingAvatarsRef.current.delete(profileId);
                return;
            }

            // Add to scene
            sceneRef.current.add(vrm.scene);

            // Set initial position and rotation
            vrm.scene.position.set(
                avatarState.position.x,
                avatarState.position.y,
                avatarState.position.z
            );
            vrm.scene.rotation.set(
                avatarState.rotation.x,
                avatarState.rotation.y,
                avatarState.rotation.z
            );

            // Apply VRM rotation
            VRMUtils.rotateVRM0(vrm);

            // Create username sprite for this player
            const username = profile?.username || 'Player';
            const isDigitalTwin = !avatarState.is_online;
            const displayName = isDigitalTwin ? `🤖 ${username}` : `🟢 ${username}`;
            const usernameSprite = createTextSprite(displayName, false);
            vrm.scene.add(usernameSprite);

            // Store in ref
            const mixer = new THREE.AnimationMixer(vrm.scene);
            otherAvatarsRef.current.set(profileId, {
                vrm: vrm,
                mixer: mixer,
                currentAnimation: avatarState.animation,
                isOnline: avatarState.is_online,
                usernameSprite: usernameSprite,
                animationClips: new Map(), // Store loaded clips to avoid reloading
                lastUpdate: Date.now()
            });

            // Load only essential animations for performance
            const avatarData = otherAvatarsRef.current.get(profileId);
            const idleClip = await loadMixamoAnimation(ANIMATION_IDLE, vrm);
            const walkingClip = await loadMixamoAnimation(ANIMATION_WALKING, vrm);

            // Store clips for reuse
            avatarData.animationClips.set('Idle', idleClip);
            avatarData.animationClips.set('Walking', walkingClip);

            // Play initial animation
            const clipToPlay = avatarState.animation === 'Walking' ? walkingClip : idleClip;
            mixer.clipAction(clipToPlay).play();

            console.log(`Successfully loaded avatar for ${profile.username}`);
        } catch (error) {
            console.error(`Error loading avatar for ${profileId}:`, error);
        } finally {
            // Always remove from loading set
            loadingAvatarsRef.current.delete(profileId);
        }
    };

    const updateOtherAvatar = (profileId: string, avatarState: any) => {
        const avatarData = otherAvatarsRef.current.get(profileId);
        if (!avatarData) return;
        
        const { vrm } = avatarData;
        
        // Smoothly interpolate position
        const currentPos = vrm.scene.position;
        const targetPos = avatarState.position;
        
        // Use TWEEN for smooth movement
        new TWEEN.Tween(currentPos, tweenGroupRef.current)
            .to(targetPos, 500) // 500ms interpolation
            .easing(TWEEN.Easing.Linear.None)
            .start();
        
        // Update rotation
        vrm.scene.rotation.set(
            avatarState.rotation.x,
            avatarState.rotation.y,
            avatarState.rotation.z
        );
        
        // Update animation if changed
        if (avatarData.currentAnimation !== avatarState.animation) {
            // Switch animation (you'll need to implement this based on your animation system)
            avatarData.currentAnimation = avatarState.animation;
        }
    };


    // ============================================
    // PUT useEffect AT COMPONENT LEVEL (NOT IN init!)
    // ============================================
    
    // Debounced avatar management to reduce excessive updates
    const avatarUpdateTimeoutRef = useRef<NodeJS.Timeout>();
    const lastAvatarCountRef = useRef(0);

    useEffect(() => {
        // Only run if scene is initialized
        if (!sceneRef.current) return;

        const { otherAvatars } = useLobbyStore.getState();

        // Skip update if avatar count hasn't changed (reduces unnecessary processing)
        if (otherAvatars.size === lastAvatarCountRef.current && otherAvatars.size === otherAvatarsRef.current.size) {
            return;
        }
        lastAvatarCountRef.current = otherAvatars.size;

        // Clear existing timeout
        if (avatarUpdateTimeoutRef.current) {
            clearTimeout(avatarUpdateTimeoutRef.current);
        }

        // Debounce avatar updates to prevent rapid fire updates
        avatarUpdateTimeoutRef.current = setTimeout(() => {
            console.log(`Processing avatar updates: ${otherAvatars.size} avatars in store, ${otherAvatarsRef.current.size} loaded`);

            // Process each avatar from the store
            otherAvatars.forEach((avatarState, profileId) => {
                if (!otherAvatarsRef.current.has(profileId) && !loadingAvatarsRef.current.has(profileId)) {
                    // New avatar - load it (only if not already loading)
                    loadOtherAvatar(profileId, avatarState);
                } else if (otherAvatarsRef.current.has(profileId)) {
                    // Existing avatar - update it (less frequently)
                    updateOtherAvatar(profileId, avatarState);
                }
            });

            // Remove avatars that left
            otherAvatarsRef.current.forEach((avatarData, profileId) => {
                if (!otherAvatars.has(profileId)) {
                    console.log(`Cleaning up avatar for profile ${profileId}`);

                    // Stop and dispose mixer
                    if (avatarData.mixer) {
                        avatarData.mixer.stopAllAction();
                        avatarData.mixer.uncacheRoot(avatarData.vrm.scene);
                    }

                    // Clean up username sprite
                    if (avatarData.usernameSprite) {
                        avatarData.vrm.scene.remove(avatarData.usernameSprite);
                        if (avatarData.usernameSprite.material.map) {
                            avatarData.usernameSprite.material.map.dispose();
                        }
                        avatarData.usernameSprite.material.dispose();
                        avatarData.usernameSprite.geometry.dispose();
                    }

                    // Dispose animation clips
                    if (avatarData.animationClips) {
                        avatarData.animationClips.forEach((clip) => {
                            // Animation clips don't have explicit dispose, but we clear the cache
                            THREE.AnimationUtils.subClip(clip, clip.name, 0, 0); // Clear internal cache
                        });
                        avatarData.animationClips.clear();
                    }

                    // Dispose VRM scene and all its resources
                    if (avatarData.vrm) {
                        // Remove from scene first
                        if (sceneRef.current) {
                            sceneRef.current.remove(avatarData.vrm.scene);
                        }

                        // Dispose all geometries and materials
                        disposeObject(avatarData.vrm.scene);

                        // Update VRM to clean internal state
                        avatarData.vrm.dispose?.(); // If VRM has dispose method
                    }

                    otherAvatarsRef.current.delete(profileId);
                    loadingAvatarsRef.current.delete(profileId); // Also clean from loading set
                    console.log(`Successfully cleaned up avatar for profile ${profileId}`);
                }
            });
        }, 100); // 100ms debounce
    }); // Subscribe to store changes through a separate subscription

    // Subscribe to store changes
    useEffect(() => {
        const unsubscribe = useLobbyStore.subscribe(
            (state) => state.otherAvatars,
            (otherAvatars) => {
                console.log('Other avatars updated:', otherAvatars.size);
                // The other useEffect will handle the actual updates
            }
        );

        return () => {
            unsubscribe();
        };
    }, []);


    // Update keyStates ref to include arrow keys
    const keyStates = useRef({
        w: false,
        a: false,
        s: false,
        d: false,
        ArrowUp: false,
        ArrowLeft: false,
        ArrowDown: false,
        ArrowRight: false
    });

    // Add memory monitoring
    const memoryMonitorRef = useRef<NodeJS.Timeout>();
    const [memoryStats, setMemoryStats] = useState<any>(null);

    // Memory cleanup utility
    const forceGarbageCollection = () => {
        // Force garbage collection if available (Chrome dev tools)
        if (typeof window !== 'undefined' && (window as any).gc) {
            (window as any).gc();
        }

        // Clear any cached textures
        if (rendererRef.current) {
            rendererRef.current.info.memory.geometries = 0;
            rendererRef.current.info.memory.textures = 0;
        }
    };

    // Comprehensive scene cleanup function
    const cleanupScene = () => {
        console.log('Starting comprehensive scene cleanup...');

        // Clean up all other avatars
        otherAvatarsRef.current.forEach((avatarData, profileId) => {
            if (avatarData.mixer) {
                avatarData.mixer.stopAllAction();
                avatarData.mixer.uncacheRoot(avatarData.vrm.scene);
            }
            if (avatarData.vrm && sceneRef.current) {
                sceneRef.current.remove(avatarData.vrm.scene);
                disposeObject(avatarData.vrm.scene);
            }
        });
        otherAvatarsRef.current.clear();

        // Clean up main avatar
        if (avatarRef.current && sceneRef.current) {
            sceneRef.current.remove(avatarRef.current.scene);
            disposeObject(avatarRef.current.scene);
        }

        // Clean up NPC
        if (npcRef.current && sceneRef.current) {
            sceneRef.current.remove(npcRef.current.scene);
            disposeObject(npcRef.current.scene);
        }

        // Force garbage collection
        forceGarbageCollection();

        console.log('Scene cleanup completed');
    };





    // Add this state near other state declarations
    const [hasChattedBefore, setHasChattedBefore] = useState(false);



    // Initialize TTS - REMOVED TO FIX WEBSOCKET ERRORS
    // useEffect(() => {
    //     // Debug mode - set to true only when troubleshooting
    //     const DEBUG_MODE = false;
    //     ttsService.setDebugMode(DEBUG_MODE);
    //
    //     ttsService.initialize().then(() => {
    //         if (DEBUG_MODE) {
    //             console.log('TTS service initialized');
    //             const voices = ttsService.getVoicesForLanguage('en-US');
    //             console.log('Available en-US voices:', voices.map(v => ({
    //                 name: v.ShortName,
    //                 gender: v.Gender
    //             })));
    //         }
    //     }).catch(error => {
    //         console.error('Failed to initialize TTS:', error?.message || error || 'TTS initialization failed');
    //     });
    // }, []);


    // Cleanup on component unmount only
    useEffect(() => {
        return () => {
            console.log('Component unmounting, running final cleanup...');

            // Clear any pending avatar updates
            if (avatarUpdateTimeoutRef.current) {
                clearTimeout(avatarUpdateTimeoutRef.current);
            }

            // Clear loading states
            loadingAvatarsRef.current.clear();

            cleanupScene();

            if (memoryMonitorRef.current) {
                clearInterval(memoryMonitorRef.current);
            }
        };
    }, []);

    // Memory monitoring useEffect
    useEffect(() => {
        // Only monitor memory in development or when explicitly enabled
        const ENABLE_MEMORY_MONITORING = false; // Set to true for debugging

        if (ENABLE_MEMORY_MONITORING && typeof window !== 'undefined' && (window as any).performance?.memory) {
            memoryMonitorRef.current = setInterval(() => {
                const memory = (window as any).performance.memory;
                const stats = {
                    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
                    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
                    limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
                    rendererInfo: rendererRef.current?.info.memory || {}
                };
                setMemoryStats(stats);

                // Auto-cleanup if memory usage is high
                if (stats.used > 500) { // More than 500MB
                    console.warn('High memory usage detected, triggering cleanup');
                    forceGarbageCollection();
                }
            }, 5000); // Reduced frequency to every 5 seconds
        }

        return () => {
            if (memoryMonitorRef.current) {
                clearInterval(memoryMonitorRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // ADD currentLobby TO THE CONDITION
        if (!rendererRef.current && currentLobby) {
            init();
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [currentLobby, isNearNPC, isChatting]); // <-- ADD currentLobby HERE

    // Handle room switching - restore position when lobby changes but avatar already exists
    useEffect(() => {
        if (currentLobby && avatarRef.current && rendererRef.current) {
            console.log('Room switched, restoring position for new room:', currentLobby.lobbyId);
            restoreAvatarPosition();
        }
    }, [currentLobby?.lobbyId]); // Only trigger when the actual lobby ID changes

    // Move createTextSprite function outside useEffect so it can be reused
    const createTextSprite = (text, isHost = false) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;

        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = '48px Arial';

        // Prepare text with crown if host
        const displayText = isHost ? `👑 ${text}` : text;

        // Add a background with rounded corners for readability
        const textMetrics = context.measureText(displayText);
        const padding = 20;
        const bgWidth = textMetrics.width + padding * 2;
        const bgHeight = 64;

        const bgX = (canvas.width - bgWidth) / 2;
        const bgY = (canvas.height - bgHeight) / 2;

        // Use a consistent dark background for all names
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        if (context.roundRect) {
            context.roundRect(bgX, bgY, bgWidth, bgHeight, 16);
            context.fill();
        } else {
            context.fillRect(bgX, bgY, bgWidth, bgHeight);
        }

        // Draw the main text (gold for host, white for others)
        context.fillStyle = isHost ? '#FFD700' : 'white';
        context.fillText(displayText, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(spriteMaterial);

        sprite.scale.set(1 * 1.5, 0.25 * 1.5, 1);
        sprite.position.y = 1.95;
        sprite.renderOrder = 999;
        sprite.visible = false;

        return sprite;
    };

    useEffect(() => {
        if (npcRef.current?.scene && currentLobby?.hostAvatar?.name) {
            // Remove existing name sprite
            const existingSprites = npcRef.current.scene.children.filter(
                child => child instanceof THREE.Sprite
            );
            existingSprites.forEach(sprite => {
                npcRef.current.scene.remove(sprite);
                sprite.material.map?.dispose();
                sprite.material.dispose();
            });

            // Create new name sprite with updated name (host with crown)
            const nameSprite = createTextSprite(currentLobby.hostAvatar.name, true);
            npcRef.current.scene.add(nameSprite);
            // Show host name from further distance
            const hostDistance = avatarRef.current ? avatarRef.current.scene.position.distanceTo(npcRef.current.scene.position) : Infinity;
            nameSprite.visible = hostDistance < HOST_NAME_DISTANCE;
        }
    }, [isNearNPC, currentLobby?.hostAvatar?.name]);


    // Update the mobile detection useEffect
    useEffect(() => {
        const checkMobile = () => {
            // Check if we're in the browser before accessing navigator
            if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                setIsMobile(isMobileDevice);
                // Disabled mobile warning to enable mobile support
                // setShowMobileWarning(isMobileDevice);
                setShowMobileWarning(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Chat resize useEffect
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizingChat || !chatRef.current) return;

            const rect = chatRef.current.getBoundingClientRect();
            let newWidth = chatDimensions.width;
            let newHeight = chatDimensions.height;

            // Calculate new dimensions based on resize handle
            if (chatResizeHandle.includes('right')) {
                newWidth = Math.max(400, e.clientX - rect.left); // Min width 400px
            }
            if (chatResizeHandle.includes('left')) {
                newWidth = Math.max(400, rect.right - e.clientX);
            }
            if (chatResizeHandle.includes('bottom')) {
                newHeight = Math.max(300, e.clientY - rect.top); // Min height 300px
            }
            if (chatResizeHandle.includes('top')) {
                newHeight = Math.max(300, rect.bottom - e.clientY);
            }

            // Limit maximum size
            newWidth = Math.min(1200, newWidth);
            newHeight = Math.min(800, newHeight);

            setChatDimensions({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizingChat(false);
            setChatResizeHandle('');
        };

        if (isResizingChat) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingChat, chatResizeHandle, chatDimensions]);

    /*
    useEffect(() => {
        // Hide controls after 10 seconds
        const timer = setTimeout(() => {
            setShowControls(false);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);
    */

    // Update handleKeyDown to handle arrow keys
    const handleKeyDown = (event) => {
        console.log('Key pressed:', event.key);

        // Don't capture movement keys if user is typing in an input/textarea
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );

        // Ignore movement keys if transitioning, chatting, or typing
        if ((isTransitioningRef.current || isChatting || isTyping) &&
            ['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
            return;
        }

        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            keyStates.current[event.key.toLowerCase()] = true;
        } else if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            keyStates.current[event.key] = true;
        }

        // NEW: Add this block to handle the spacebar press
        if (event.code === 'Space' && !isJumpingRef.current && !isChatting && !isTyping) {
            event.preventDefault(); // Prevents the page from scrolling
            isJumpingRef.current = true;
            playAnimation(ANIMATION_JUMP);
        }

        if (event.key.toLowerCase() === 'f' && isNearNPC && !isChatting) {
            console.log('Starting chat...');
            startUniversalChat();
        }

        if (event.key === 'Escape') {
            if (isChatting) {
                endChat();
            } else {
                // Return to lobby selection
                showLobbySelection();
            }
        }
    };

    // Update handleKeyUp to handle arrow keys
    const handleKeyUp = (event) => {
        // Don't capture movement keys if user is typing in an input/textarea
        const activeElement = document.activeElement;
        const isTyping = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );

        if (!isTyping) {
            if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
                keyStates.current[event.key.toLowerCase()] = false;
            } else if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
                keyStates.current[event.key] = false;
            }
        }
    };

    const animateCamera = (targetPosition, targetLookAt, duration = 1000) => {
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        isTransitioningRef.current = true;

        const startPosition = camera.position.clone();
        const startTarget = controls.target.clone();

        const positionTween = new TWEEN.Tween(startPosition, tweenGroupRef.current)
            .to(targetPosition, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                camera.position.copy(startPosition);
            });

        const targetTween = new TWEEN.Tween(startTarget, tweenGroupRef.current)
            .to(targetLookAt, duration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onUpdate(() => {
                controls.target.copy(startTarget);
                controls.update();
            })
            .onComplete(() => {
                isTransitioningRef.current = false;
            });

        positionTween.start();
        targetTween.start();
    };

    const startUniversalChat = async () => {
        if (!nearestAvatarRef.current) return;
        
        // Store original camera position
        originalCameraPositionRef.current = cameraRef.current.position.clone();
        originalCameraTargetRef.current = controlsRef.current.target.clone();
        
        // Start the appropriate chat through store
        try {
            if (nearestAvatarRef.current.type === 'npc') {
                console.log('Starting NPC chat with lobby:', currentLobby);
                await startChat({
                    type: 'npc',
                    lobby: currentLobby
                });
            } else if (nearestAvatarRef.current.type === 'digital-twin') {
                const { profile, avatarState } = nearestAvatarRef.current.data;
                await startChat({
                    type: 'digital-twin',
                    profile,
                    avatarState
                });
            }
            
            // GET THE SERVICE DIRECTLY FROM STORE AFTER CREATING IT
            const { activeChatService: newService, activeChatTarget: newTarget } = useLobbyStore.getState();
            
            console.log('New chat service:', newService);
            console.log('New chat target:', newTarget);
            
            if (!newService) {
                console.error('Failed to create chat service!');
                return;
            }
            
            // Set chatting state and initialize chat
            setIsChatting(true);
            
            // Initial greeting
            const chatName = newTarget?.name || 'Host';
            setChatMessages([{
                sender: chatName,
                message: '',
                isStreaming: true
            }]);
            
            // Camera animation - move inside try block
            const avatar = avatarRef.current.scene;
            const targetEntity = nearestAvatarRef.current.type === 'npc' 
                ? npcRef.current.scene 
                : nearestAvatarRef.current.avatar.scene;
                    
            const midpoint = new THREE.Vector3().addVectors(
                avatar.position,
                targetEntity.position
            ).multiplyScalar(0.5);

            // Calculate vector from midpoint to current camera position
            const currentToCameraVector = new THREE.Vector3()
                .copy(cameraRef.current.position)
                .sub(midpoint);
            currentToCameraVector.y = 0; // Project onto XZ plane

            // Calculate vector from avatar to NPC
            const avatarToNPC = new THREE.Vector3()
                .copy(targetEntity.position)
                .sub(avatar.position);
            avatarToNPC.y = 0; // Project onto XZ plane

            // Determine if camera is on left or right using cross product
            const cross = currentToCameraVector.clone().cross(avatarToNPC);
            const isLeftSide = cross.y > 0;
            
            // Calculate angle based on side
            const angle = isLeftSide ? Math.PI / 4 : -Math.PI / 4; // 45 degrees left or right
            const targetDistance = 3;
            const targetHeight = 1.5;
            
            const targetCameraPosition = new THREE.Vector3();
            const avatarToNPCAngle = Math.atan2(avatarToNPC.z, avatarToNPC.x);

            // Position camera behind avatar at the calculated angle
            targetCameraPosition.x = avatar.position.x - Math.cos(avatarToNPCAngle - angle) * targetDistance;
            targetCameraPosition.z = avatar.position.z - Math.sin(avatarToNPCAngle - angle) * targetDistance;
            targetCameraPosition.y = targetHeight;

            // Animate camera to new position
            animateCamera(targetCameraPosition, midpoint);
            
            const greeting = nearestAvatarRef.current.type === 'npc'
                ? (hasChattedBefore ? "*Same player left, and now has returned and approaches*" : "*Player approaches*")
                : "*Someone approaches*";
            
            // Start the greeting with the properly initialized service
            newService.getResponse(greeting, (partialMessage) => {
                setChatMessages([{
                    sender: chatName,
                    message: partialMessage,
                    isStreaming: true
                }]);
            }).then(response => {
                setChatMessages([{
                    sender: chatName,
                    message: response.message
                }]);
                
                speakNPCMessage(response.message);
                
                if (nearestAvatarRef.current.type === 'npc' && !hasChattedBefore) {
                    setHasChattedBefore(true);
                }
            });
            
        } catch (error) {
            console.error('Error starting chat:', error);
            return;
        }
        
        // Focus input
        setTimeout(() => {
            const inputElement = document.querySelector('input[type="text"]');
            if (inputElement) {
                inputElement.focus();
            }
        }, 100);
    };
    const endChat = () => {
        // Stop any playing audio - REMOVED TTS
        // stopAllTTS();

        // Use store to end chat
        endChatStore();  // ADD THIS

        setIsChatting(false);
        setChatMessages([]);
        setCurrentMessage('');

        if (!originalCameraPositionRef.current || !originalCameraTargetRef.current) {
            console.error('Original camera position not found');
            return;
        }

        // Animate camera back to original position and target
        animateCamera(
            originalCameraPositionRef.current,
            originalCameraTargetRef.current
        );
    };

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            const container = chatContainerRef.current;
            const scrollOptions = {
                top: container.scrollHeight,
                behavior: 'smooth'
            };
            container.scrollTo(scrollOptions);
        }
    };

    // Chat resize handlers
    const handleChatMouseDown = (e: React.MouseEvent, handle: string) => {
        e.preventDefault();
        setIsResizingChat(true);
        setChatResizeHandle(handle);
    };

    // Load saved avatar position from database
    const loadSavedAvatarPosition = async () => {
        try {
            const { profile, currentLobby } = useLobbyStore.getState();
            if (!profile || !currentLobby) return null;

            const { supabase } = await import('@/lib/supabase');

            const { data, error } = await supabase
                .from('avatar_states')
                .select('position, rotation')
                .eq('profile_id', profile.id)
                .eq('lobby_id', currentLobby.lobbyId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading saved position:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error loading saved avatar position:', error);
            return null;
        }
    };

    // Restore position for existing avatar when switching rooms
    const restoreAvatarPosition = async () => {
        if (!avatarRef.current) return;

        console.log('Restoring position for room switch...');
        const savedState = await loadSavedAvatarPosition();

        if (savedState?.position) {
            console.log('Restoring saved position for new room:', savedState.position);
            avatarRef.current.scene.position.set(
                savedState.position.x,
                savedState.position.y,
                savedState.position.z
            );
            if (savedState.rotation) {
                avatarRef.current.scene.rotation.set(
                    savedState.rotation.x,
                    savedState.rotation.y,
                    savedState.rotation.z
                );
            }
        } else {
            console.log('No saved position for new room, using default spawn location');
            // Default spawn position for new room
            avatarRef.current.scene.position.set(0, 0, 0);
            avatarRef.current.scene.rotation.set(0, 0, 0);
        }
    };

    /**
     * Clean text for TTS - DISABLED TO FIX WEBSOCKET ERRORS
     */
    const cleanTextForTTS = (text: string): string => {
        // TTS functionality removed to fix WebSocket errors
        return text;
    };

    /**
     * Queue-based TTS to prevent overlapping speech
     */
    const processNextInQueue = async () => {
        // TTS functionality removed to fix WebSocket errors
        return;
    };

    // Original function (disabled):
    const processNextInQueue_DISABLED = async () => {
        if (isSpeakingRef.current || ttsQueueRef.current.length === 0) {
            return;
        }
        
        const text = ttsQueueRef.current.shift();
        if (!text) return;
        
        isSpeakingRef.current = true;
        
        try {
            const audio = await ttsService.speak(text, {
                language: 'en-US',
                voiceName: 'en-US-AriaNeural', // Female voice for Agent Zoan
                // voiceName: 'en-US-GuyNeural', // Alternative male voice
                pitch: 0,
                rate: 0,
                volume: 0
            });
            
            currentAudioRef.current = audio;
            
            // Store event handlers so we can remove them later
            const endedHandler = () => {
                // console.log('Speech ended'); // Comment out for production
                currentAudioRef.current = null;
                isSpeakingRef.current = false;
                // Process next item in queue
                processNextInQueue();
            };
            
            const errorHandler = (e: Event) => {
                // Only log actual playback errors, not abort/stop errors
                const audio = e.target as HTMLAudioElement;
                if (audio && !audio.paused && isSpeakingRef.current) {
                    console.error('Audio playback error:', e);
                }
                currentAudioRef.current = null;
                isSpeakingRef.current = false;
                processNextInQueue();
            };
            
            audio.addEventListener('ended', endedHandler);
            audio.addEventListener('error', errorHandler);
            
            // Store handlers on the audio element for removal later
            (audio as any)._endedHandler = endedHandler;
            (audio as any)._errorHandler = errorHandler;
            
        } catch (error) {
            console.error('TTS error:', error?.message || error || 'Text-to-speech failed');
            isSpeakingRef.current = false;
            processNextInQueue();
        }
    };

    /**
     * Main function to speak NPC messages - DISABLED TO FIX WEBSOCKET ERRORS
     */
    const speakNPCMessage = async (message: string) => {
        // TTS functionality removed to fix WebSocket errors
        return;
    };

    // Original function (disabled):
    const speakNPCMessage_DISABLED = async (message: string) => {
        const isDebug = false; // Set to true when debugging
        
        if (isDebug) {
            console.group('Speaking NPC Message');
            console.log('Raw message:', message);
        }
        
        try {
            // Clean the text
            const cleanMessage = cleanTextForTTS(message);
            
            if (!cleanMessage) {
                if (isDebug) {
                    console.log('No text to speak after cleaning');
                    console.groupEnd();
                }
                return;
            }
            
            // Check message length
            if (cleanMessage.length > 1000) {
                if (isDebug) console.warn('Message is very long:', cleanMessage.length, 'characters');
                // Split long messages into chunks if needed
                const chunks = cleanMessage.match(/.{1,500}[.!?]?\s/g) || [cleanMessage];
                if (isDebug) console.log('Split into', chunks.length, 'chunks');
                
                for (const chunk of chunks) {
                    ttsQueueRef.current.push(chunk);
                }
            } else {
                ttsQueueRef.current.push(cleanMessage);
            }
            
            // Start processing queue
            processNextInQueue();
            
        } catch (error) {
            console.error('Failed to speak:', error);
        } finally {
            if (isDebug) console.groupEnd();
        }
    };

    /**
     * Stop all TTS playback - DISABLED TO FIX WEBSOCKET ERRORS
     */
    const stopAllTTS = () => {
        // TTS functionality removed to fix WebSocket errors
        // console.log('TTS disabled');
    };

    // Update your chat submit handler
    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // CHANGE FROM chatService TO activeChatService:
        if (!activeChatService) {
            console.error("No active chat service!");
            return;
        }
        if (!currentMessage.trim()) return;

        const userMessage = currentMessage;
        setCurrentMessage('');

        setChatMessages(prev => [...prev, {
            sender: profile?.username || 'Player',
            message: userMessage
        }]);

        setTimeout(scrollToBottom, 100);

        setChatMessages(prev => [...prev, {
            sender: activeChatTarget?.name || 'Host',
            message: '',
            isStreaming: true
        }]);

        setTimeout(scrollToBottom, 100);

        let fullResponse = '';
        const streamHandler = (partialMessage: string) => {
            fullResponse = partialMessage; // Keep track of full response
            requestAnimationFrame(() => {
                setChatMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.isStreaming) {
                        lastMessage.message = partialMessage;
                    }
                    return newMessages;
                });
                scrollToBottom();
            });
        };

        try {
            // CHANGE TO USE activeChatService:
            const response = await activeChatService.getResponse(userMessage, streamHandler);

            // console.log('Complete NPC response:', response.message); // Comment out for production

            setChatMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.message = response.message;
                delete lastMessage.isStreaming;
                return newMessages;
            });

            // Speak the complete response (with error handling) - REMOVED TTS
            // try {
            //     await speakNPCMessage(response.message);
            // } catch (ttsError) {
            //     console.warn('TTS failed, continuing without speech:', ttsError?.message || ttsError);
            //     // Chat continues to work even if TTS fails
            // }

            if (response.animation && npcAnimationActionsRef.current[response.animation]) {
                playNpcAnimation(response.animation);
            }
        } catch (error) {
            console.error('Chat error:', error);
        }
    };

    const playAnimation = (animation) => {
        const actions = animationActionsRef.current;
        const currentAction = currentAnimationRef.current;
        const nextAction = actions[animation];

        if (!nextAction) return;
        if (currentAction === nextAction) return;

        const DURATION = 0.25;

        if (currentAction) {
            nextAction.reset().setEffectiveTimeScale(1.0).setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.crossFadeFrom(currentAction, DURATION, true);
            nextAction.play();
        } else {
            nextAction.reset();
            nextAction.setEffectiveTimeScale(1.0);
            nextAction.setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.play();
        }

        currentAnimationRef.current = nextAction;
    };

    const playNpcAnimation = (animation) => {
        const actions = npcAnimationActionsRef.current;
        const currentAction = currentNpcAnimationRef.current;
        const nextAction = actions[animation];

        if (!nextAction) return;
        if (currentAction === nextAction) return;

        const DURATION = 0.25;

        if (currentAction) {
            nextAction.reset().setEffectiveTimeScale(1.0).setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.crossFadeFrom(currentAction, DURATION, true);
            nextAction.play();
        } else {
            nextAction.reset();
            nextAction.setEffectiveTimeScale(1.0);
            nextAction.setEffectiveWeight(1.0);
            nextAction.clampWhenFinished = true;
            nextAction.play();
        }

        currentNpcAnimationRef.current = nextAction;
    };

    async function initializeAnimations(vrm, isNPC = false) {
        console.log("Initializing animations...");
        const mixer = new THREE.AnimationMixer(vrm.scene);

        if (isNPC) {
            npcMixerRef.current = mixer;
        } else {
            mixerRef.current = mixer;
            // NEW: Add an event listener to the player's mixer
            // This will fire every time an animation clip finishes playing.
            mixer.addEventListener('finished', (event) => {
                // Check if the animation that just finished is the jump animation
                if (event.action.getClip().name === 'vrmAnimation') { // Note: 'vrmAnimation' is the name assigned in loadMixamoAnimation.js
                    // We can't directly check by ANIMATION_JUMP here easily, but we can rely on the fact
                    // that only our jump animation is non-looping.
                    // A more robust way is to check the clip name if you customize loadMixamoAnimation
                    isJumpingRef.current = false; // Allow jumping again
                }
            });
        }

        const animations = [
            ANIMATION_IDLE,
            ANIMATION_WALKING,
            ANIMATION_JUMP
        ];
        const actions = {};

        for (const animation of animations) {
            try {
                console.log(`Loading animation: ${animation}`);
                // const url = `/animations/${animation}.fbx`;
                const url = animation as string;
                const clip = await loadMixamoAnimation(url, vrm);
                console.log(`Creating action for: ${animation}`);
                const action = mixer.clipAction(clip);
                action.clampWhenFinished = true;

                // NEW: Set the jump animation to not loop
                if (animation === ANIMATION_JUMP) {
                    action.loop = THREE.LoopOnce; // Play only one time
                } else {
                    action.loop = THREE.LoopRepeat; // All other animations loop
                }

                actions[animation] = action;
            } catch (error) {
                console.error(`Error loading animation ${animation}:`, error);
            }
        }

        if (isNPC) {
            npcAnimationActionsRef.current = actions;
            playNpcAnimation(ANIMATION_IDLE);
        } else {
            animationActionsRef.current = actions;
            playAnimation(ANIMATION_IDLE);
        }
    }
    // const PLAYER_VRM_URL = '/avatars/VRoid_Sample_B.vrm';
    const PLAYER_VRM_URL = '/avatars/raiden.vrm';
    // const PLAYER_VRM_URL = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/VRoid_Sample_B-D0UeF1RrEd5ItEeCiUZ3o8DxtxvFIK.vrm';

    const sceneRef = useRef(null);
    const [selectedAvatar, setSelectedAvatar] = useState(PLAYER_VRM_URL);
    const [showSettings, setShowSettings] = useState(false);
    const [showRoomInfo, setShowRoomInfo] = useState(false);

    const changeAvatar = async (avatarFile) => {
        if (!sceneRef.current || !avatarRef.current) return;

        setSelectedAvatar(avatarFile);

        // Store current avatar properties
        const currentAvatar = avatarRef.current;
        const currentPosition = currentAvatar.scene.position.clone();
        const currentRotation = currentAvatar.scene.rotation.clone();
        const currentScale = currentAvatar.scene.scale.clone();

        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
        });

        // Remove existing avatar
        currentAvatar.scene.parent.remove(currentAvatar.scene);

        // Load new avatar
        loader.load(
            `/avatars/${avatarFile}`,
            async (gltf) => {
                const vrm = gltf.userData.vrm;

                // Apply VRM rotation first
                VRMUtils.rotateVRM0(vrm);

                // Then add to scene
                sceneRef.current.add(vrm.scene);
                avatarRef.current = vrm;

                // Apply stored properties after VRM rotation
                vrm.scene.position.copy(currentPosition);
                vrm.scene.rotation.copy(currentRotation);
                vrm.scene.scale.copy(currentScale);

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                await initializeAnimations(vrm, false);

            },
            (progress) => console.log('Loading player model...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );
    };

    function init() {
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0xe0e0e0);
        scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 3, 3);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({
            antialias: !isMobileDevice(), // Disable antialiasing on mobile for performance
            powerPreference: "high-performance",
            stencil: false, // Disable stencil buffer if not needed
            depth: true
        });

        // Optimize pixel ratio for performance
        const pixelRatio = Math.min(window.devicePixelRatio, isMobileDevice() ? 1.5 : 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Enable optimizations
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);

        // Optimize environment map resolution for better performance
        const environmentResolution = isMobileDevice() ? 128 : 256; // Reduce for mobile
        const roomEnvironment = new RoomEnvironment(renderer);
        sceneRef.current.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;

        // Dispose the generator after use to save memory
        pmremGenerator.dispose();

        /*
        var ambientLight = new THREE.AmbientLight(0x404040);
        sceneRef.current.add(ambientLight);
        */

        // light
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        scene.add(light);

        /*
        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1.0, 1.0, 1.0).normalize();
        sceneRef.current.add(light);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
        hemiLight.position.set(0, 20, 0);
        sceneRef.current.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(0, 20, 10);
        sceneRef.current.add(dirLight);
        */

        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            new THREE.MeshBasicMaterial({ color: 'rgb(220, 220, 220)', depthWrite: false })
        );
        mesh.rotation.x = -Math.PI / 2;
        sceneRef.current.add(mesh);

        const grid = new THREE.GridHelper(200, 200, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        sceneRef.current.add(grid);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 2;
        controls.maxDistance = 10;

        // TODO: modify target based on avatar height
        controls.target.set(0, 1, 0);
        controls.enableKeys = false;
        controls.enablePan = false;
        controls.rotateSpeed = isMobile ? ROTATE_SPEED.MOBILE : ROTATE_SPEED.DESKTOP;
        controlsRef.current = controls;

        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';
        loader.register((parser) => {
            return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
        });

        // Load player avatar
        loader.load(
            // `/avatars/${selectedAvatar}`,
            // selectedAvatar,
            profile?.selected_avatar_model || '/avatars/raiden.vrm',  // Use profile's avatar
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                sceneRef.current.add(vrm.scene);
                avatarRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);

                // Load and apply saved position, or use default
                const savedState = await loadSavedAvatarPosition();
                if (savedState?.position) {
                    console.log('Restoring saved position:', savedState.position);
                    vrm.scene.position.set(
                        savedState.position.x,
                        savedState.position.y,
                        savedState.position.z
                    );
                    if (savedState.rotation) {
                        vrm.scene.rotation.set(
                            savedState.rotation.x,
                            savedState.rotation.y,
                            savedState.rotation.z
                        );
                    }
                } else {
                    console.log('No saved position found, using default spawn location');
                    // Default spawn position (you can adjust these coordinates as needed)
                    vrm.scene.position.set(0, 0, 0);
                }

                await initializeAnimations(vrm, false);
            },
            (progress) => console.log('Loading player model...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );


        // TODO: don't show avatars until idle animation loaded (right now it flickers with t-pose)

        // const MERCHANT_VRM_URL = '/avatars/sheriff_agent_7.3.vrm';
        // const MERCHANT_VRM_URL = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/sheriff_agent_7.3-Nlpi0VmgY7hIcOaIDdomjRDE9Igtrn.vrm';

        // Modify the NPC loader section
        loader.load(
            currentLobby.hostAvatar.model, // <-- USE THE PROP DIRECTLY HERE
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                sceneRef.current.add(vrm.scene);
                npcRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                // Create and add name sprite (only if name exists) - host with crown
                if (currentLobby.hostAvatar.name) {
                    const nameSprite = createTextSprite(currentLobby.hostAvatar.name, true);
                    vrm.scene.add(nameSprite);
                }

                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(0, 0, -6);
                vrm.scene.rotation.y = 2 * Math.PI / 2;

                await initializeAnimations(vrm, true);
            },
            (progress) => console.log('Loading NPC...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );

        const clock = new THREE.Clock();
        const moveSpeed = 0.05;
        const rotationSpeed = 0.15;


        function animate() {
            requestAnimationFrame(animate);
            const deltaTime = clock.getDelta();

            // Update tween group instead of TWEEN
            tweenGroupRef.current.update();

            if (mixerRef.current) {
                mixerRef.current.update(deltaTime);
            }

            if (npcMixerRef.current) {
                npcMixerRef.current.update(deltaTime);
            }

            // DISTANCE CHECKING TO ALL AVATARS
            if (avatarRef.current && npcRef.current) {
                const avatar = avatarRef.current.scene;
                const npc = npcRef.current.scene;
                
                // Check distance to ALL avatars (NPCs + Digital Twins)
                let nearestAvatar = null;
                let nearestDistance = Infinity;
                let nearestType = null;
                let nearestData = null;
                
                // Check NPC
                const npcDistance = avatar.position.distanceTo(npc.position);
                if (npcDistance < INTERACTION_DISTANCE) {
                    nearestAvatar = npc;
                    nearestDistance = npcDistance;
                    nearestType = 'npc';
                    nearestData = currentLobby.hostAvatar;
                }
                
                // Check other avatars (digital twins)
                otherAvatarsRef.current.forEach((avatarData, profileId) => {
                    if (avatarData.vrm) {
                        const distance = avatar.position.distanceTo(avatarData.vrm.scene.position);
                        if (distance < INTERACTION_DISTANCE && distance < nearestDistance) {
                            const { profilesCache } = useLobbyStore.getState();
                            const profile = profilesCache.get(profileId);
                            if (profile) {
                                nearestAvatar = avatarData.vrm;
                                nearestDistance = distance;
                                nearestType = 'digital-twin';
                                nearestData = { profile, avatarState: avatarData };
                            }
                        }
                    }
                });
                
                // Update who we're near
                if (nearestAvatar) {
                    setIsNearNPC(true); // Reuse existing state
                    nearestAvatarRef.current = {
                        avatar: nearestAvatar,
                        type: nearestType,
                        data: nearestData,
                        distance: nearestDistance
                    };
                } else {
                    setIsNearNPC(false);
                    nearestAvatarRef.current = null;
                }

                // Update host name sprite visibility based on distance
                if (npcRef.current?.scene) {
                    const hostNameSprite = npcRef.current.scene.children.find(
                        child => child instanceof THREE.Sprite
                    );
                    if (hostNameSprite) {
                        hostNameSprite.visible = npcDistance < HOST_NAME_DISTANCE;
                    }
                }

                // Update other players' username sprites visibility based on distance
                otherAvatarsRef.current.forEach((avatarData, profileId) => {
                    if (avatarData.vrm && avatarData.usernameSprite) {
                        const playerDistance = avatar.position.distanceTo(avatarData.vrm.scene.position);
                        avatarData.usernameSprite.visible = playerDistance < PLAYER_NAME_DISTANCE;
                    }
                });

                // MOVEMENT LOGIC
                if (!isChatting && !isJumpingRef.current && !isTransitioningRef.current) {
                    const moveVector = new THREE.Vector3(0, 0, 0);

                    const cameraForward = new THREE.Vector3();
                    camera.getWorldDirection(cameraForward);
                    cameraForward.y = 0;
                    cameraForward.normalize();

                    const cameraRight = new THREE.Vector3();
                    cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
                    cameraRight.normalize();

                    // Check both WASD and arrow keys
                    if (keyStates.current.w || keyStates.current.ArrowUp) moveVector.add(cameraForward);
                    if (keyStates.current.s || keyStates.current.ArrowDown) moveVector.sub(cameraForward);
                    if (keyStates.current.a || keyStates.current.ArrowLeft) moveVector.sub(cameraRight);
                    if (keyStates.current.d || keyStates.current.ArrowRight) moveVector.add(cameraRight);

                    if (moveVector.length() > 0) {
                        playAnimation(ANIMATION_WALKING);

                        moveVector.normalize();

                        const cameraOffset = camera.position.clone().sub(controls.target);

                        avatar.position.add(moveVector.multiplyScalar(moveSpeed));

                        const targetRotation = Math.atan2(moveVector.x, moveVector.z) + Math.PI;

                        let currentRotation = avatar.rotation.y;
                        let angleDiff = targetRotation - currentRotation;

                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                        avatar.rotation.y += angleDiff * rotationSpeed;

                        controls.target.copy(avatar.position).add(new THREE.Vector3(0, 1, 0));
                        camera.position.copy(controls.target).add(cameraOffset);

                    } else {
                        playAnimation(ANIMATION_IDLE);
                    }
                }

                avatarRef.current.update(deltaTime);
                if (npcRef.current) {
                    npcRef.current.update(deltaTime);
                }
            }

            // POSITION SYNCING TO DATABASE - OPTIMIZED FOR PERFORMANCE
            positionUpdateInterval.current += deltaTime;
            if (positionUpdateInterval.current > 0.25) { // Reduced frequency: 250ms intervals instead of 100ms
                const { profile, currentLobby } = useLobbyStore.getState();

                if (profile && currentLobby && avatarRef.current) {
                    const pos = avatarRef.current.scene.position;
                    const rot = avatarRef.current.scene.rotation;

                    // Check if position actually changed (increased threshold)
                    const lastPos = avatarRef.current.lastSyncedPosition || { x: 0, y: 0, z: 0 };
                    const moved = Math.abs(pos.x - lastPos.x) > 0.05 ||
                                Math.abs(pos.z - lastPos.z) > 0.05; // Increased from 0.01 to 0.05

                    const animChanged = currentAnimationRef.current?.getClip().name !== avatarRef.current.lastSyncedAnimation;

                    // Only sync if significantly moved or animation changed
                    if (moved || animChanged) {
                        useLobbyStore.getState().updateAvatarState({
                            position: { x: pos.x, y: pos.y, z: pos.z },
                            rotation: { x: rot.x, y: rot.y, z: rot.z },
                            animation: currentAnimationRef.current?.getClip().name || 'Idle'
                        });

                        avatarRef.current.lastSyncedPosition = { x: pos.x, y: pos.y, z: pos.z };
                        avatarRef.current.lastSyncedAnimation = currentAnimationRef.current?.getClip().name;
                    }

                    // Expose current avatar position to global window for voice chat proximity detection
                    if (typeof window !== 'undefined') {
                        (window as any).currentAvatarPosition = { x: pos.x, y: pos.y, z: pos.z };
                    }
                }

                positionUpdateInterval.current = 0;
            }

            // UPDATE OTHER AVATARS' ANIMATIONS WITH DISTANCE CULLING
            const CULLING_DISTANCE = 25; // Stop updating avatars beyond this distance
            const UPDATE_DISTANCE = 15; // Reduce update frequency for distant avatars

            otherAvatarsRef.current.forEach((avatarData, profileId) => {
                if (avatarData.vrm && avatarRef.current) {
                    const distance = avatarRef.current.scene.position.distanceTo(avatarData.vrm.scene.position);

                    // Completely cull very distant avatars
                    if (distance > CULLING_DISTANCE) {
                        avatarData.vrm.scene.visible = false;
                        return;
                    }

                    avatarData.vrm.scene.visible = true;

                    // Update animations at reduced frequency for distant avatars
                    const shouldUpdate = distance < UPDATE_DISTANCE ||
                        (Date.now() - (avatarData.lastUpdate || 0)) > 500; // Update every 500ms for distant avatars

                    if (shouldUpdate) {
                        if (avatarData.mixer) {
                            avatarData.mixer.update(distance < UPDATE_DISTANCE ? deltaTime : deltaTime * 0.5);
                        }
                        if (avatarData.vrm) {
                            avatarData.vrm.update(deltaTime);
                        }
                        avatarData.lastUpdate = Date.now();
                    }
                }
            });

            controls.update();
            renderer.render(sceneRef.current, camera);
        }

        animate();

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }



    const joystickRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    // Add these constants near the top of the file with other constants
    const ROTATE_SPEED = {
        MOBILE: 2,
        DESKTOP: 1.0
    };

    // Add this useEffect to initialize joystick
    useEffect(() => {
        if (isMobile && !joystickRef.current) {
            const joystickZone = document.getElementById('joystick-zone');

            // Check if the joystick zone exists before creating the manager
            if (!joystickZone) {
                console.warn('Joystick zone not found, skipping joystick initialization');
                return;
            }

            const options = {
                zone: joystickZone,
                mode: 'static',
                position: { left: '15px', bottom: '15px' },
                color: 'black',
                size: 120,
            };

            try {
                const manager = nipplejs.create(options);
            joystickRef.current = manager;

            manager.on('move', (evt, data) => {
                const forward = data.vector.y;
                const right = data.vector.x;

                keyStates.current.w = forward > 0;
                keyStates.current.s = forward < 0;
                keyStates.current.d = right > 0;
                keyStates.current.a = right < 0;
            });

            manager.on('end', () => {
                keyStates.current.w = false;
                keyStates.current.s = false;
                keyStates.current.d = false;
                keyStates.current.a = false;
            });
            } catch (error) {
                console.error('Error creating joystick:', error);
            }
        }

        return () => {
            if (joystickRef.current) {
                joystickRef.current.destroy();
                joystickRef.current = null;
            }
        };
    }, [isMobile]);
   
    // Add this helper function near the top of the Scene component
    const parseMessageTags = (message) => {
        // Simple version without weapon tag parsing - just return the message as-is
        return { cleanMessage: message, tags: [] };
    };


    const getUpdatedUrl = (originalUrl) => {
        const urlMappings = {
            'https://content.niftyisland.com/nftables/258f9f9a-74de-4ba5-a145-5c3740d5c5ef/v/1/source.fbx':
                'https://content.niftyisland.com/nftables/258f9f9a-74de-4ba5-a145-5c3740d5c5ef/v/2/source.fbx',
            'https://content.niftyisland.com/nftables/1ccfd6ea-bf46-4b7b-a5da-4ae9ff40ab76/v/1/source.fbx':
                'https://content.niftyisland.com/nftables/1ccfd6ea-bf46-4b7b-a5da-4ae9ff40ab76/v/3/source.fbx'
        };

        return urlMappings[originalUrl] || originalUrl;
    };



    const getLocalModelPath = (originalUrl: string, metadata: any) => {
        // Find the matching local file info in the metadata
        const localFile = metadata._local_files?.find(file =>
            file.original_url === originalUrl
        );

        // If found, return the local path, otherwise return the original URL
        return localFile ? `/${localFile.local_path}` : originalUrl;
    };


    // Simplified chat message rendering without weapon actions
    const renderChatMessage = (message, index) => {
        return (
            <div key={index} className="mb-4">
                <div className="font-bold select-text">{message.sender}</div>
                <div className="mt-1 select-text cursor-text">{message.message}</div>
            </div>
        );
    };


    // Add this near other utility functions
    const isMobileDevice = () => {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return false;
        }
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };


    // Add this new function near other utility functions

    // Add this helper function to traverse up the object hierarchy
    const findModelRoot = (object) => {
        let current = object;
        while (current) {
            // Check if this object has the metadata we're looking for
            if (current.userData?.contractAddress) {
                return current;
            }
            current = current.parent;
        }
        return null;
    };

    // Modify the handleWeaponClick function

    // Modify the return statement to add the avatar selector UI
    // Loading check after all hooks are defined
    if (!currentLobby) {
        return <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">Loading World...</div>;
    }

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />

            {showMobileWarning && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md bg-white">
                        <CardContent className="p-6 text-center">
                            <h2 className="text-xl font-bold mb-4">Desktop Only</h2>
                            <p className="mb-6">
                                Mobile is not supported. Please visit on a desktop computer for the best experience!
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add joystick container for mobile */}
            {isMobile && (
                <div
                    id="joystick-zone"
                    className="fixed bottom-4 left-4 w-[120px] h-[120px] z-20 pointer-events-auto"
                    style={{ touchAction: 'none' }}
                />
            )}


            {/* Interaction Prompt */}
            {isNearNPC && !isChatting && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded z-10">
                    Press F to talk
                </div>
            )}

            {/* Modified Chat Interface */}
            {isChatting && (
                <Card
                    ref={chatRef}
                    className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/50 backdrop-blur-sm z-10 select-none"
                    style={{
                        width: `${chatDimensions.width}px`,
                        height: `${chatDimensions.height}px`,
                        minWidth: '400px',
                        minHeight: '300px',
                        maxWidth: '1200px',
                        maxHeight: '800px'
                    }}
                >
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-700">
                                Chatting with {activeChatTarget?.name || 'Host'}
                                {activeChatTarget?.type === 'digital-twin' && (
                                    <Badge className="ml-2" variant="secondary">Digital Twin</Badge>
                                )}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={endChat}
                                className="text-gray-700 hover:text-gray-900"
                            >
                                ✕ Exit
                            </Button>
                        </div>

                        {/* Two-column layout */}
                        <div className="flex gap-4" style={{ height: `${chatDimensions.height - 100}px` }}>
                            {/* Chat column */}
                            <div className="flex-1 flex flex-col">
                                <div
                                    ref={chatContainerRef}
                                    className="flex-1 overflow-y-auto mb-4 space-y-2 select-text"
                                >
                                    {chatMessages.map((msg, index) => {
                                        if (msg.sender === (profile?.username || 'Player') || msg.message || !msg.isStreaming) {
                                            // Should check against the active chat target:
                                            const { cleanMessage, tags } = msg.sender === activeChatTarget?.name
                                                ? parseMessageTags(msg.message)
                                                : { cleanMessage: msg.message, tags: [] };

                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded ${msg.sender === (profile?.username || 'Player')
                                                        ? 'bg-blue-100/95 ml-8'
                                                        : 'bg-gray-100/95 mr-8'
                                                        }`}
                                                >
                                                    <span className="text-gray-600 text-sm mb-1">
                                                        {msg.sender}
                                                    </span>
                                                    <span className="text-gray-800 block mt-1">
                                                        <ReactMarkdown>
                                                            {cleanMessage.split(/(?=<<)/).map((part, i) => {
                                                                // If this part starts with <<
                                                                if (part.startsWith('<<')) {
                                                                    // If we're streaming and this is the last part
                                                                    if (msg.isStreaming && i === cleanMessage.split(/(?=<<)/).length - 1) {
                                                                        return ''; // Hide incomplete tag
                                                                    }
                                                                    // If it's a complete tag (has >>)
                                                                    if (part.includes('>>')) {
                                                                        return ''; // Hide complete tag
                                                                    }
                                                                    // If it's not a complete tag and we're not streaming
                                                                    return part; // Show it as normal text
                                                                }
                                                                return part; // Show normal text
                                                            }).join('')}
                                                        </ReactMarkdown>
                                                    </span>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                                <form onSubmit={handleChatSubmit} className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={currentMessage}
                                        onChange={(e) => setCurrentMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        className="flex-1 bg-white/95"
                                    />
                                    <Button type="submit">Send</Button>
                                </form>
                            </div>

                            {/* Shop column */}
                            {/* <div className="w-80 border-l pl-4 overflow-y-auto">
                                <h3 className="font-semibold mb-3">
                                    {showShop ? 'New Items' : 'Equipped Weapon'}
                                </h3>
                                {showShop ? (
                                    <div className="space-y-4">
                                        {weapons.length > 0 ? (
                                            weapons.map((weapon) => (
                                                <div key={weapon.id} className="p-2 bg-gray-100/95 rounded">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div>
                                                            <h3 className="font-semibold">{weapon.name}</h3>
                                                            <p className="text-sm text-gray-600">{weapon.price}</p>
                                                        </div>
                                                        <Button onClick={() => tryWeapon(weapon)}>
                                                            Try It
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-2 mt-2 justify-end">
                                                        {weapon.id === 'bat' || weapon.id === 'megaphone' ? (
                                                            <a
                                                                href={MARKETPLACE_LINKS[weapon.id].doggyMarket}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                                                            >
                                                                <img
                                                                    src="/images/logos/Doggy Market.png"
                                                                    alt="Doggy Market"
                                                                    className="w-4 h-4 mr-1"
                                                                />
                                                                Doggy Market
                                                            </a>
                                                        ) : (
                                                            <>
                                                                <a
                                                                    href={MARKETPLACE_LINKS[weapon.id].niftyIsland}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                                                                >
                                                                    <img
                                                                        src="/images/logos/Icon - Color - Nifty Island.svg"
                                                                        alt="Nifty Island"
                                                                        className="w-4 h-4 mr-1"
                                                                    />
                                                                    Buy on Nifty Island
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center bg-gray-100/95 rounded">
                                                <p className="text-gray-600">In the works!</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center p-4 bg-gray-100/95 rounded">
                                        <p className="mb-4">{equippedWeapon?.name}</p>
                                        <div className="flex flex-col gap-2">
                                            {equippedWeapon?.contractAddress && equippedWeapon?.tokenId && equippedWeapon?.chain && (
                                                <a
                                                    href={getNiftyIslandUrl(equippedWeapon.chain, equippedWeapon.contractAddress, equippedWeapon.tokenId)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                                                >
                                                    <img
                                                        src="/images/logos/Icon - Color - Nifty Island.svg"
                                                        alt="Nifty Island"
                                                        className="w-4 h-4 mr-1"
                                                    />
                                                    View on Nifty Island
                                                </a>
                                            )}
                                            <Button onClick={returnToShop}>
                                                Return to Shop
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div> */}
                        </div>
                    </CardContent>

                    {/* Resize Handles */}
                    {/* Right edge */}
                    <div
                        className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'right')}
                    />
                    {/* Bottom edge */}
                    <div
                        className="absolute bottom-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'bottom')}
                    />
                    {/* Bottom-right corner */}
                    <div
                        className="absolute bottom-0 right-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'bottom-right')}
                    />
                    {/* Top edge */}
                    <div
                        className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'top')}
                    />
                    {/* Left edge */}
                    <div
                        className="absolute top-0 left-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/30 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'left')}
                    />
                    {/* Top-right corner */}
                    <div
                        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'top-right')}
                    />
                    {/* Top-left corner */}
                    <div
                        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'top-left')}
                    />
                    {/* Bottom-left corner */}
                    <div
                        className="absolute bottom-0 left-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/50 transition-colors"
                        onMouseDown={(e) => handleChatMouseDown(e, 'bottom-left')}
                    />
                </Card>
            )}

            {/* Back to Lobby button */}
            <Button
                variant="ghost"
                onClick={showLobbySelection}
                className="fixed top-4 left-4 bg-black bg-opacity-75 text-white hover:bg-opacity-90 z-10 px-3 py-2"
                title="Back to Lobby (ESC)"
            >
                ← Back to Lobby
            </Button>

            {/* Replace the settings button with info button in top right */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRoomInfo(!showRoomInfo)}
                className="fixed top-4 right-4 w-10 h-10 rounded-full bg-black bg-opacity-75 text-white hover:bg-opacity-90 z-10"
                title="Room Info & Code"
            >
                <svg 
                    className="w-6 h-6 scale-150"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </Button>

            {/* Room Info Modal */}
            {showRoomInfo && currentLobby && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="bg-gray-900/95 backdrop-blur-sm border-gray-700 w-full max-w-md">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl text-white">
                                    🏠 Room Information
                                </CardTitle>
                                <button
                                    onClick={() => setShowRoomInfo(false)}
                                    className="text-gray-400 hover:text-white"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Room Name */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-300 mb-1">Room Name</h3>
                                <p className="text-white">{currentLobby.name || 'Unknown Room'}</p>
                            </div>

                            {/* Room Code */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-300 mb-1">Room Code</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-mono text-lg bg-gray-800 px-3 py-1 rounded">
                                        {currentLobby.lobbyId || 'N/A'}
                                    </p>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(currentLobby.lobbyId || '');
                                            alert('Room code copied to clipboard!');
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                        title="Copy room code"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>

                            {/* Room URL */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-300 mb-1">Share URL</h3>
                                <div className="flex items-center gap-2">
                                    <p className="text-blue-300 text-sm bg-gray-800 px-3 py-2 rounded break-all">
                                        {window.location.origin}/{currentLobby.lobbyId}
                                    </p>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/${currentLobby.lobbyId}`;
                                            navigator.clipboard.writeText(url);
                                            alert('Room URL copied to clipboard!');
                                        }}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                        title="Copy room URL"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>

                            {/* Room Description */}
                            {currentLobby.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-300 mb-1">Description</h3>
                                    <p className="text-gray-200 text-sm">{currentLobby.description}</p>
                                </div>
                            )}

                            {/* Host Info */}
                            {currentLobby.hostAvatar?.name && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-300 mb-1">Host</h3>
                                    <p className="text-white">{currentLobby.hostAvatar.name}</p>
                                </div>
                            )}

                            {/* Current Players */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-300 mb-1">Players</h3>
                                <p className="text-white">
                                    {currentLobby.currentPlayers?.length || 0} / {currentLobby.maxPlayers || 'Unlimited'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Memory Debug Overlay */}
            {memoryStats && (
                <div className="fixed top-16 right-4 bg-black/80 text-white p-3 rounded text-xs z-50">
                    <div className="mb-1 font-bold">Memory Stats (MB)</div>
                    <div>Used: {memoryStats.used}</div>
                    <div>Total: {memoryStats.total}</div>
                    <div>Limit: {memoryStats.limit}</div>
                    <div>Geometries: {memoryStats.rendererInfo.geometries || 0}</div>
                    <div>Textures: {memoryStats.rendererInfo.textures || 0}</div>
                </div>
            )}

        </div>
    );
};

export default Scene;