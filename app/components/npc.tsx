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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TWEEN from '@tweenjs/tween.js';
import chatService from './chat_service';
import summaryMetadata from '@/public/context/summary_metadata_with_vercel_urls.json';
import ModelViewer from './model-viewer';
import ReactMarkdown from 'react-markdown';

// Add this type near other types/interfaces
type WeaponActionParams = {
    target: string;
    weaponName: string;
    weaponType: string;
    contractAddress: string;
    tokenId: string;
};

// Add this helper function near the top of the file
const getNiftyIslandUrl = (chain: string, contractAddress: string, tokenId: string) => {
    return `https://niftyisland.com/item/${chain}/${contractAddress}/${tokenId}`;
};

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
const ANIMATION_IDLE = './animations/Idle.fbx';
const ANIMATION_WALKING = './animations/Walking.fbx';
const ANIMATION_GREAT_SWORD_IDLE = './animations/Great Sword Idle.fbx';
const ANIMATION_PISTOL_IDLE = './animations/Pistol Idle.fbx';
*/

const ANIMATION_IDLE = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Idle-dG8ldlN0exams4VYcpKIhpPN6L2iu6.fbx';
const ANIMATION_WALKING = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Walking-TXPtML6DCMpX8XHsfjrAVcgRlnf5qE.fbx';
const ANIMATION_GREAT_SWORD_IDLE = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Great%20Sword%20Idle-08F04GwJaQuRTyoOJgMseiYBvFodbF.fbx';
const ANIMATION_PISTOL_IDLE = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/animations/Pistol%20Idle-UNnPpwZlfzGEk7bWquH5YabWhRDHYp.fbx';

const Scene = () => {
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
    const chatContainerRef = useRef(null);
    const originalCameraPositionRef = useRef(null);
    const originalCameraTargetRef = useRef(null);
    const [isNearNPC, setIsNearNPC] = useState(false);
    const [isChatting, setIsChatting] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showMobileWarning, setShowMobileWarning] = useState(false);
    const NPC_NAME = "Agent Zoan";

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

    const [showShop, setShowShop] = useState(true);
    const [equippedWeapon, setEquippedWeapon] = useState(null);
    const equippedWeaponRef = useRef(null);

    // Add this ref near other refs
    const weaponsLoadedRef = useRef(false);

    // Add these new refs near other refs
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const hoveredWeaponRef = useRef(null);
    const highlightMaterialRef = useRef(new THREE.MeshStandardMaterial({
        color: 0x4444ff,
        metalness: 0.5,
        roughness: 0.5,
    }));

    // Add these new state variables near other state declarations
    const [selectedWeaponDetails, setSelectedWeaponDetails] = useState(null);
    const [showWeaponDetails, setShowWeaponDetails] = useState(false);

    // Add this state near other state declarations
    const [hasChattedBefore, setHasChattedBefore] = useState(false);

    // Add this helper function near the top of the file
    const inferWeaponType = (params: WeaponActionParams, metadata: any): 'sword' | 'pistol' => {
        // log params
        console.log('inferWeaponType input params', params);
        // log metadata
        console.log('inferWeaponType input metadata', metadata);

        const description = metadata?.description?.toLowerCase() || '';
        // const assetName = metadata?.asset_name?.toLowerCase() || '';  // Check individual asset name
        const name = metadata?.name?.toLowerCase() || '';
        const summary = metadata?._summaries?.[0]?.summary?.toLowerCase() || '';

        const weaponName = params.weaponName.toLowerCase();

        // temporary fix in case LLM hallucinates metadata
        if (weaponName == 'galactic buster') {
            return 'sword';
        }

        // First priority: Check asset name for weapon type
        const pistolKeywords = ['pistol', 'gun', 'megaphone', 'revolver', 'blaster'];
        const swordKeywords = ['sword', 'blade', 'dagger', 'bat'];

        // log weaponName
        console.log('inferWeaponType input weaponName', weaponName);

        // Check weapon name first
        for (const keyword of pistolKeywords) {
            if (weaponName.includes(keyword)) return 'pistol';
        }
        for (const keyword of swordKeywords) {
            if (weaponName.includes(keyword)) return 'sword';
        }

        // Second priority: Check for explicit creation text in description
        if (description.includes('pistol was created')) return 'pistol';
        if (description.includes('sword was created')) return 'sword';

        // Fallback to checking other metadata
        for (const keyword of pistolKeywords) {
            if (name.includes(keyword)) return 'pistol';
        }
        for (const keyword of swordKeywords) {
            if (name.includes(keyword)) return 'sword';
        }

        // Check summary last
        for (const keyword of pistolKeywords) {
            if (summary.includes(keyword)) return 'pistol';
        }
        for (const keyword of swordKeywords) {
            if (summary.includes(keyword)) return 'sword';
        }

        // Default to sword if we can't determine
        return 'sword';
    };

    const weapons = [
        {
            id: 'sword',
            name: 'Quantum Sword',
            price: '10 ISLAND',
            model: 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/weapons/weapon_models_glb/base_0x44073ea066f39c21c3ec51ef324c280e0870d2c4_2_quantum_sword-YXvamvKYDL4qMLTgVe0Z2kowYraxfK.glb',
            animation: ANIMATION_GREAT_SWORD_IDLE,
            weaponType: 'sword',
            position: { x: 0.05, y: -0.025, z: 0.0 },
            rotation: {
                x: -Math.PI / 2 - 0 * Math.PI / 16,
                y: Math.PI / 2 + 2 * Math.PI / 16,
                z: Math.PI / 8 + -2 * Math.PI / 16
            },
            scale: 1.0,
            niftyIslandLink: 'https://www.niftyisland.com/item/base/0x44073ea066f39c21c3ec51ef324c280e0870d2c4/2',
            chain: 'base',
            contractAddress: '0x44073ea066f39c21c3ec51ef324c280e0870d2c4',
            tokenId: '2'
        },
        {
            id: 'pistol',
            name: 'Quantum Pistol',
            price: '10 ISLAND',
            model: 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/weapons/weapon_models_glb/base_0x44073ea066f39c21c3ec51ef324c280e0870d2c4_3_quantum_pistol-9IYG7ctGW9QectUgSXSDysLt6KLVi7.glb',
            animation: ANIMATION_PISTOL_IDLE,
            weaponType: 'pistol',
            position: { x: 0.05, y: -0.03, z: 0 },
            rotation: {
                x: -Math.PI / 2,
                y: Math.PI / 2 + Math.PI / 16,
                z: 0
            },
            scale: 1.0,
            niftyIslandLink: 'https://www.niftyisland.com/item/base/0x44073ea066f39c21c3ec51ef324c280e0870d2c4/3',
            chain: 'base',
            contractAddress: '0x44073ea066f39c21c3ec51ef324c280e0870d2c4',
            tokenId: '3'
        }
    ];

    // const weapons = [];

    useEffect(() => {
        equippedWeaponRef.current = equippedWeapon;
        console.log('Equipped weapon ref updated:', equippedWeaponRef.current);
    }, [equippedWeapon]);

    useEffect(() => {
        if (!rendererRef.current) {
            init();
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleWeaponHover);
        window.addEventListener('click', handleWeaponClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleWeaponHover);
            window.removeEventListener('click', handleWeaponClick);
        };
    }, [isNearNPC, isChatting]);

    useEffect(() => {
        if (npcRef.current?.scene) {
            // Find the sprite in the NPC's children
            const nameSprite = npcRef.current.scene.children.find(
                child => child instanceof THREE.Sprite
            );
            if (nameSprite) {
                nameSprite.visible = isNearNPC;
            }
        }
    }, [isNearNPC]);

    useEffect(() => {
        console.log('Equipped weapon changed:', equippedWeapon);
    }, [equippedWeapon]);

    // Update the mobile detection useEffect
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
            setShowMobileWarning(isMobileDevice);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

        // Ignore movement keys if transitioning or chatting
        if ((isTransitioningRef.current || isChatting) && 
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

        if (event.key.toLowerCase() === 'f' && isNearNPC && !isChatting) {
            console.log('Starting chat...');
            startChat();
        }

        if (event.key === 'Escape' && isChatting) {
            endChat();
        }
    };

    // Update handleKeyUp to handle arrow keys
    const handleKeyUp = (event) => {
        if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
            keyStates.current[event.key.toLowerCase()] = false;
        } else if (['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
            keyStates.current[event.key] = false;
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

    const startChat = () => {
        // Store original camera position and target
        originalCameraPositionRef.current = cameraRef.current.position.clone();
        originalCameraTargetRef.current = controlsRef.current.target.clone();

        setIsChatting(true);

        const avatar = avatarRef.current.scene;
        const npc = npcRef.current.scene;
        const camera = cameraRef.current;

        // Calculate midpoint between avatar and NPC
        const midpoint = new THREE.Vector3().addVectors(
            avatar.position,
            npc.position
        ).multiplyScalar(0.5);

        // Calculate vector from midpoint to current camera position
        const currentToCameraVector = new THREE.Vector3()
            .copy(camera.position)
            .sub(midpoint);
        currentToCameraVector.y = 0; // Project onto XZ plane

        // Calculate vector from avatar to NPC
        const avatarToNPC = new THREE.Vector3()
            .copy(npc.position)
            .sub(avatar.position);
        avatarToNPC.y = 0; // Project onto XZ plane

        // Determine if camera is on left or right using cross product
        const crossProduct = new THREE.Vector3()
            .crossVectors(avatarToNPC, currentToCameraVector);
        const isOnLeftSide = crossProduct.y > 0;

        // Calculate the angle for camera positioning (45 degrees = π/4 radians)
        const angle = isOnLeftSide ? -Math.PI / 4 : Math.PI / 4;
        const targetDistance = 2.5;
        const targetHeight = midpoint.y + 1.5;

        // Calculate camera position behind and to the side of the avatar
        const targetCameraPosition = new THREE.Vector3();
        const avatarToNPCAngle = Math.atan2(avatarToNPC.z, avatarToNPC.x);

        // Position camera behind avatar at the calculated angle
        targetCameraPosition.x = avatar.position.x - Math.cos(avatarToNPCAngle - angle) * targetDistance;
        targetCameraPosition.z = avatar.position.z - Math.sin(avatarToNPCAngle - angle) * targetDistance;
        targetCameraPosition.y = targetHeight;

        // Animate camera to new position
        animateCamera(targetCameraPosition, midpoint);

        setChatMessages([{
            sender: NPC_NAME,
            message: '',
            isStreaming: true
        }]);

        // Modify the initial greeting based on whether we've chatted before
        const initialMessage = hasChattedBefore 
            ? "*Same player left, and now has returned and approaches*"
            : "*Player approaches*";

        // Get initial greeting from chatService
        chatService.getNPCResponse(initialMessage, (partialMessage) => {
            setChatMessages([{
                sender: NPC_NAME,
                message: partialMessage,
                isStreaming: true
            }]);
        }).then(response => {
            setChatMessages([{
                sender: NPC_NAME,
                message: response.message
            }]);

            if (response.animation && npcAnimationActionsRef.current[response.animation]) {
                playNpcAnimation(response.animation);
            }

            // Set hasChattedBefore to true after first chat
            if (!hasChattedBefore) {
                setHasChattedBefore(true);
            }
        });

        setTimeout(() => {
            const inputElement = document.querySelector('input[type="text"]');
            if (inputElement) {
                inputElement.focus();
            }
        }, 100);
    };

    const endChat = () => {
        returnToShop();

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

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!currentMessage.trim()) return;

        const userMessage = currentMessage;
        setCurrentMessage('');

        setChatMessages(prev => [...prev, {
            sender: 'Player',
            message: userMessage
        }]);

        // Scroll after player message
        setTimeout(scrollToBottom, 100);

        setChatMessages(prev => [...prev, {
            sender: NPC_NAME,
            message: '',
            isStreaming: true
        }]);

        // Scroll again after adding empty streaming message
        setTimeout(scrollToBottom, 100);

        const streamHandler = (partialMessage) => {
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
            const response = await chatService.getNPCResponse(userMessage, streamHandler);

            // Log the complete message
            console.log('Complete NPC response:', response.message);

            setChatMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                lastMessage.message = response.message;
                delete lastMessage.isStreaming;
                return newMessages;
            });

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
        }

        const animations = [ANIMATION_IDLE, ANIMATION_WALKING, ANIMATION_GREAT_SWORD_IDLE, ANIMATION_PISTOL_IDLE];
        const actions = {};

        for (const animation of animations) {
            try {
                console.log(`Loading animation: ${animation}`);
                // const url = `./animations/${animation}.fbx`;
                const url = animation as string;
                const clip = await loadMixamoAnimation(url, vrm);
                console.log(`Creating action for: ${animation}`);
                const action = mixer.clipAction(clip);
                action.clampWhenFinished = true;
                action.loop = THREE.LoopRepeat;
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
    // const PLAYER_VRM_URL = './avatars/VRoid_Sample_B.vrm';
    const PLAYER_VRM_URL = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/VRoid_Sample_B-D0UeF1RrEd5ItEeCiUZ3o8DxtxvFIK.vrm';

    const sceneRef = useRef(null);
    const [selectedAvatar, setSelectedAvatar] = useState(PLAYER_VRM_URL);
    const [showSettings, setShowSettings] = useState(false);

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
            `./avatars/${avatarFile}`,
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

                // If weapon is equipped, reattach it
                if (equippedWeaponRef.current) {
                    tryWeapon(equippedWeaponRef.current);
                }
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

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        sceneRef.current.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

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
            // `./avatars/${selectedAvatar}`,
            selectedAvatar,
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                sceneRef.current.add(vrm.scene);
                avatarRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                await initializeAnimations(vrm, false);
            },
            (progress) => console.log('Loading player model...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );

        // Add this function to create text sprite
        function createTextSprite(text) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 512;
            canvas.height = 128;

            if (context) {
                context.imageSmoothingEnabled = false;
                context.textBaseline = 'middle';

                context.clearRect(0, 0, canvas.width, canvas.height);

                context.font = 'Bold 42px Arial';
                context.textAlign = 'center';

                // Create outline by drawing the text multiple times with small offsets
                context.fillStyle = 'black';
                for (let i = -3; i <= 3; i++) {
                    for (let j = -3; j <= 3; j++) {
                        context.fillText(text, canvas.width / 2 + i, canvas.height / 2 + j);
                    }
                }

                // Draw the main text
                context.fillStyle = 'white';
                context.fillText(text, canvas.width / 2, canvas.height / 2);
            }

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
        }

        // TODO: don't show avatars until idle animation loaded (right now it flickers with t-pose)

        // const MERCHANT_VRM_URL = './avatars/sheriff_agent_7.3.vrm';
        const MERCHANT_VRM_URL = 'https://vmja7qb50ap0jvma.public.blob.vercel-storage.com/demo/v1/models/avatars/sheriff_agent_7.3-Nlpi0VmgY7hIcOaIDdomjRDE9Igtrn.vrm';

        // Modify the NPC loader section
        loader.load(
            MERCHANT_VRM_URL,
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                sceneRef.current.add(vrm.scene);
                npcRef.current = vrm;

                vrm.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                });

                // Create and add name sprite
                const nameSprite = createTextSprite(NPC_NAME);
                vrm.scene.add(nameSprite);

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
        const INTERACTION_DISTANCE = 2.5;

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

            if (avatarRef.current && npcRef.current) {
                const avatar = avatarRef.current.scene;
                const npc = npcRef.current.scene;

                const distance = avatar.position.distanceTo(npc.position);
                setIsNearNPC(distance < INTERACTION_DISTANCE);

                if (!isChatting) {
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

                        // After moving the avatar, update weapon highlighting
                        handleWeaponHover({
                            clientX: mouseRef.current.x * window.innerWidth / 2 + window.innerWidth / 2,
                            clientY: -mouseRef.current.y * window.innerHeight / 2 + window.innerHeight / 2
                        });
                    } else {
                        const currentWeapon = equippedWeaponRef.current;
                        if (currentWeapon) {
                            const animationName = currentWeapon.weaponType === 'sword'
                                ? ANIMATION_GREAT_SWORD_IDLE
                                : ANIMATION_PISTOL_IDLE;
                            playAnimation(animationName);
                        } else {
                            playAnimation(ANIMATION_IDLE);
                        }
                    }
                }

                avatarRef.current.update(deltaTime);
                npcRef.current.update(deltaTime);
            }

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

    const tryWeapon = async (weapon) => {
        setShowShop(false);
        setEquippedWeapon(weapon);

        const loader = new GLTFLoader();
        const avatar = avatarRef.current;

        // Remove any existing weapon
        avatar.scene.traverse((child) => {
            if (child.name === 'weapon') {
                child.parent.remove(child);
            }
        });

        // Load and attach new weapon
        loader.load(
            weapon.model,
            (gltf) => {
                const weaponModel = gltf.scene;
                weaponModel.name = 'weapon';
                weaponModel.scale.setScalar(weapon.scale);

                // Find right hand and attach weapon
                avatar.scene.traverse((child) => {
                    if (child.name.includes('J_Bip_R_Hand')) {
                        child.add(weaponModel);

                        weaponModel.position.set(
                            weapon.position.x,
                            weapon.position.y,
                            weapon.position.z
                        );
                        weaponModel.rotation.set(
                            weapon.rotation.x,
                            weapon.rotation.y,
                            weapon.rotation.z
                        );
                    }
                });

                /*
                // Play the appropriate idle animation based on weapon type
                if (weapon.id.includes('sword')) {
                    playAnimation('Great Sword Idle');
                } else if (weapon.id.includes('pistol')) {
                    playAnimation('Pistol Idle');
                }
                */
            }
        );
    };

    const returnToShop = () => {
        setShowShop(true);
        setEquippedWeapon(null);

        // Remove equipped weapon
        const avatar = avatarRef.current;
        avatar.scene.traverse((child) => {
            if (child.name === 'weapon') {
                child.parent.remove(child);
            }
        });

        // Return to Idle animation
        playAnimation(ANIMATION_IDLE);
    };

    // Add these constants near the top of the file with other constants
    const MARKETPLACE_LINKS = {
        sword: {
            niftyIsland: 'https://www.niftyisland.com/item/base/0x44073ea066f39c21c3ec51ef324c280e0870d2c4/2'
        },
        pistol: {
            niftyIsland: 'https://www.niftyisland.com/item/base/0x44073ea066f39c21c3ec51ef324c280e0870d2c4/3'
        },
        bat: {
            doggyMarket: 'https://doggy.market/nfts/doginalbat'
        },
        megaphone: {
            doggyMarket: 'https://doggy.market/nfts/doginalmegaphone'
        }
    };

    const joystickRef = useRef(null);
    const [isMobile, setIsMobile] = useState(false);

    // Add these constants near the top of the file with other constants
    const ROTATE_SPEED = {
        MOBILE: 2,
        DESKTOP: 1.0
    };

    /*
    // Modify the mobile detection useEffect
    useEffect(() => {
        const checkMobile = () => {
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);

            // Adjust rotate speed if controls exist
            if (controlsRef.current) {
                controlsRef.current.rotateSpeed = isMobileDevice ? ROTATE_SPEED.MOBILE : ROTATE_SPEED.DESKTOP;
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Add this useEffect to initialize joystick
    useEffect(() => {
        if (isMobile && !joystickRef.current) {
            const options = {
                zone: document.getElementById('joystick-zone'),
                mode: 'static',
                position: { left: '15px', bottom: '15px' },
                color: 'black',
                size: 120,
            };

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
        }

        return () => {
            if (joystickRef.current) {
                joystickRef.current.destroy();
                joystickRef.current = null;
            }
        };
    }, [isMobile]);
    */
   
    // Add this helper function near the top of the Scene component
    const parseMessageTags = (message) => {
        const tags = [];
        let cleanMessage = '';
        let potentialTag = '';
        let inTag = false;

        // Process message character by character
        for (let i = 0; i < message.length; i++) {
            const char = message[i];
            const nextChar = message[i + 1];

            if (char === '<' && nextChar === '<') {
                inTag = true;
                potentialTag = '<<';
                i++; // Skip next '<'
                continue;
            }

            if (inTag) {
                potentialTag += char;
                if (char === '>' && message[i - 1] === '>') {
                    // We found a complete tag, try to parse it
                    const tagContent = potentialTag.slice(2, -2); // Remove << and >>
                    if (tagContent.startsWith('try_weapon')) {
                        try {
                            const params = tagContent.match(/"([^"]*)"/g).map(p => p.replace(/"/g, ''));
                            tags.push({
                                type: 'try_weapon',
                                params: {
                                    target: params[0],
                                    weaponName: params[1],
                                    weaponType: params[2],
                                    contractAddress: params[3],
                                    tokenId: params[4]
                                }
                            });
                        } catch (error) {
                            // If parsing fails, treat it as regular text
                            cleanMessage += potentialTag;
                        }
                    } else {
                        // Not a valid tag, treat as regular text
                        cleanMessage += potentialTag;
                    }
                    inTag = false;
                    potentialTag = '';
                }
            } else {
                cleanMessage += char;
            }
        }

        // If we end with an incomplete tag, append it to the message
        if (potentialTag) {
            cleanMessage += potentialTag;
        }

        return { cleanMessage, tags };
    };

    // Add this dummy function that will be implemented later
    const handleTryWeapon = (params) => {
        console.log('Trying weapon with params:', params);
        // This will be implemented later to actually equip the weapon
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

    // Add this helper function
    const findWeaponInMetadata = (params: WeaponActionParams) => {
        // First try exact match with contract address and token ID
        const exactMatch = summaryMetadata.find(item =>
            item.contractAddress.toLowerCase() === params.contractAddress.toLowerCase() &&
            item.tokenId === params.tokenId
        );

        console.log('Exact match:', exactMatch);

        if (exactMatch) return exactMatch;

        console.log('Exact match not found, doing fuzzy search');

        // If no exact match, search through all metadata entries
        for (const item of summaryMetadata) {
            const metadata = item.metadata;
            
            // Get all weapon assets (excluding avatars)
            const weaponAssets = metadata.raw.metadata.assets?.filter(asset => {
                // Skip VRM files (avatars)
                if (asset.files?.[0]?.file_type === 'model/vrm') {
                    return false;
                }
                // assume all other assets are weapons
                return true;
            });

            if (!weaponAssets?.length) continue;

            // Search through each weapon asset
            for (const weaponAsset of weaponAssets) {
                // Normalize strings for comparison
                const normalizedAssetName = weaponAsset.name.trim().toLowerCase().replace(/\s+/g, ' ');
                const normalizedWeaponName = params.weaponName.trim().toLowerCase().replace(/\s+/g, ' ');

                // First try exact match
                if (normalizedAssetName === normalizedWeaponName) {
                    return item;
                }

                // If no exact match, check if weapon name is contained within asset name
                // Split asset name by common separators and check each part
                const assetParts = normalizedAssetName.split(/[-:]/);
                for (const part of assetParts) {
                    const trimmedPart = part.trim();
                    if (trimmedPart === normalizedWeaponName) {
                        return item;
                    }
                }

                // Finally, check if weapon name is a substring of asset name
                if (normalizedAssetName.includes(normalizedWeaponName) ||
                    normalizedWeaponName.includes(normalizedAssetName)) {
                    return item;
                }
            }
        }

        // If no match found, return null
        console.warn(`No matching weapon found for: ${params.weaponName}`);
        return null;
    };

    // Update wherever you're currently searching for weapons
    const handleWeaponAction = (params: WeaponActionParams) => {
        const weaponData = findWeaponInMetadata(params);

        if (!weaponData) {
            console.warn(`No metadata found for weapon: ${params.weaponName}`);
            return null;
        }

        // Continue with existing weapon handling logic...
        return weaponData;
    };

    const getLocalModelPath = (originalUrl: string, metadata: any) => {
        // Find the matching local file info in the metadata
        const localFile = metadata._local_files?.find(file =>
            file.original_url === originalUrl
        );

        // If found, return the local path, otherwise return the original URL
        return localFile ? `/${localFile.local_path}` : originalUrl;
    };

    const agentActionTryWeapon = async (params: WeaponActionParams) => {
        // First, remove any existing weapon by traversing the avatar scene
        if (avatarRef.current?.scene) {
            avatarRef.current.scene.traverse((child) => {
                if (child.name === 'weapon') {
                    if (child.parent) {
                        child.parent.remove(child);
                    }
                }
            });
        }

        // Find the matching metadata entry
        let weaponMetadata = handleWeaponAction(params);

        if (!weaponMetadata?.metadata?.raw?.metadata?.assets) {
            console.error('No matching metadata or assets found for weapon:', params);
            return;
        }

        console.log('Searching for weapon:', params.weaponName);
        console.log('Available assets:', weaponMetadata.metadata.raw.metadata.assets);

        // Infer the weapon type from metadata
        const inferredWeaponType = inferWeaponType(params, weaponMetadata.metadata);
        console.log('Inferred weapon type:', inferredWeaponType);

        // Split the weapon name into parts and search for each part
        const searchTerms = params.weaponName.toLowerCase().split('-').map(term => term.trim());

        // Modified weapon name matching logic - case insensitive with string normalization
        let weaponAsset = weaponMetadata.metadata.raw.metadata.assets.find(asset => {
            // Normalize strings: trim whitespace, convert to lowercase, and remove extra spaces
            const normalizedAssetName = asset.name.trim().toLowerCase().replace(/\s+/g, ' ');
            const normalizedWeaponName = params.weaponName.trim().toLowerCase().replace(/\s+/g, ' ');

            // Log for debugging
            console.log('Comparing:', {
                normalizedWeaponName,
                normalizedAssetName,
                originalAssetName: asset.name,
                originalWeaponName: params.weaponName
            });

            // First try exact match
            if (normalizedAssetName === normalizedWeaponName) {
                return true;
            }

            // If no exact match, check if weapon name is contained within asset name
            // Split asset name by common separators and check each part
            const assetParts = normalizedAssetName.split(/[-:]/);
            for (const part of assetParts) {
                const trimmedPart = part.trim();
                if (trimmedPart === normalizedWeaponName) {
                    return true;
                }
            }

            // Finally, check if weapon name is a substring of asset name
            // This helps with cases like "Demon Dragon Sword" in "Three Sword Style - Demon Dragon Sword"
            return normalizedAssetName.includes(normalizedWeaponName);
        });

        console.log('Search terms:', searchTerms);
        console.log('Available assets:', weaponMetadata.metadata.raw.metadata.assets.map(a => a.name));
        console.log('Found asset:', weaponAsset);

        if (!weaponAsset?.files?.[0]) {
            console.log('No matching weapon asset or files found, trying fallback name search...');

            // Try searching across all metadata entries by name only
            for (const item of summaryMetadata) {
                const assets = item.metadata?.raw?.metadata?.assets || [];
                const matchingAsset = assets.find(asset => {
                    const normalizedAssetName = asset.name.trim().toLowerCase().replace(/\s+/g, ' ');
                    const normalizedWeaponName = params.weaponName.trim().toLowerCase().replace(/\s+/g, ' ');

                    return normalizedAssetName.includes(normalizedWeaponName) ||
                        normalizedWeaponName.includes(normalizedAssetName);
                });

                if (matchingAsset?.files?.[0]) {
                    console.log('Found weapon via fallback name search:', matchingAsset.name);
                    weaponMetadata = item;
                    weaponAsset = matchingAsset;
                    break;
                }
            }

            // If still no match found, then error out
            if (!weaponAsset?.files?.[0]) {
                console.error('No matching weapon asset found, even after fallback search:', params.weaponName);
                return;
            }
        }

        const originalUrl = weaponAsset.files[0].url;
        const weaponUrl = getLocalModelPath(originalUrl, weaponMetadata);
        const vercelUrl = getVercelUrlFromLocalPath(weaponUrl);
        const fileType = weaponAsset.files[0].file_type;

        // Use inferred weapon type for configuration
        const weaponConfig = {
            sword: {
                position: { x: 0.05, y: -0.025, z: 0.0 },
                rotation: {
                    x: -Math.PI / 2,
                    y: Math.PI / 2 + 2 * Math.PI / 16,
                    z: Math.PI / 8
                },
                scale: 1,
                animation: ANIMATION_GREAT_SWORD_IDLE
            },
            pistol: {
                position: { x: 0.05, y: -0.03, z: 0 },
                rotation: {
                    x: -Math.PI / 2,
                    y: Math.PI / 2 + Math.PI / 16,
                    z: 0
                },
                scale: 1,
                animation: ANIMATION_PISTOL_IDLE
            }
        };

        const config = weaponConfig[inferredWeaponType] || weaponConfig.sword;

        try {
            let weaponModel;

            // Load the weapon model based on file type
            if (false && fileType === 'model/fbx') {
                const fbxLoader = new FBXLoader();
                const fbxModel = await fbxLoader.loadAsync(vercelUrl);
                weaponModel = fbxModel;
            } else {
                const gltfLoader = new GLTFLoader();
                const gltfModel = await gltfLoader.loadAsync(vercelUrl);
                weaponModel = gltfModel.scene;
            }

            // Remove all lights from the loaded weapon model
            weaponModel.traverse((node) => {
                if (node.isLight) {
                    // log change
                    console.log('removing light:', node.name);
                    node.intensity = 0;  // or node.parent.remove(node);
                }
            });

            // Position weapon in a row
            weaponModel.position.set(
                config.position.x,
                config.position.y,
                config.position.z
            );
            weaponModel.rotation.set(
                config.rotation.x,
                config.rotation.y,
                config.rotation.z
            );
            weaponModel.scale.setScalar(config.scale);
            weaponModel.name = 'weapon';

            // Find the right hand bone and attach weapon
            avatarRef.current?.scene.traverse((child) => {
                if (child.name.includes('J_Bip_R_Hand')) {
                    child.add(weaponModel);
                }
            });

            equippedWeaponRef.current = weaponModel;
            setEquippedWeapon({
                id: params.weaponName,
                name: params.weaponName,
                weaponType: inferredWeaponType,
                chain: weaponMetadata.chain,
                contractAddress: weaponMetadata.contractAddress,
                tokenId: weaponMetadata.tokenId,
                ...config
            });

            // Play the appropriate animation based on inferred type
            playAnimation(inferredWeaponType === 'sword' ? ANIMATION_GREAT_SWORD_IDLE : ANIMATION_PISTOL_IDLE);

            setShowShop(false);

        } catch (error) {
            console.error('Error loading weapon:', error);
        }
    };

    // Modify the chat message rendering to include action buttons
    const renderChatMessage = (message, index) => {
        // Parse message for action tags
        const { cleanMessage, tags } = parseMessageTags(message.message);

        return (
            <div key={index} className="mb-4">
                <div className="font-bold">{message.sender}</div>
                <div className="mt-1">{cleanMessage}</div>
                {tags.map((tag, tagIndex) => {
                    if (tag.type === 'try_weapon') {
                        return (
                            <Button
                                key={tagIndex}
                                onClick={() => agentActionTryWeapon(tag.params)}
                                className="mt-2 mr-2"
                            >
                                Try {tag.params.weaponName}
                            </Button>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    // Add near the top of the Scene component
    const loadWeapons = async () => {
        const loader = new GLTFLoader();
        const spacing = 0.5; // Space between weapons

        // First, count total number of weapons to calculate total width
        let totalWeapons = 0;
        for (const item of summaryMetadata) {
            const weaponAssets = item.metadata.raw.metadata.assets?.filter(asset => {
                return asset.files?.[0]?.file_type !== 'model/vrm';
            });
            totalWeapons += weaponAssets?.length || 0;
        }

        // Calculate total width and starting position
        const totalWidth = (totalWeapons - 1) * spacing;
        let xPosition = -totalWidth / 2; // Start from the left side of the center
        let zPosition = -10;

        let modelIdCounter = 0;

        for (const item of summaryMetadata) {
            const metadata = item.metadata;

            // Get all weapon assets (excluding avatars)
            const weaponAssets = metadata.raw.metadata.assets?.filter(asset => {
                // Skip VRM files (avatars)
                if (asset.files?.[0]?.file_type === 'model/vrm') {
                    return false;
                }
                // assume all other assets are weapons
                return true;
            });

            if (!weaponAssets?.length) continue;

            // Load each weapon from the NFT
            for (const weaponAsset of weaponAssets) {
                const modelFile = weaponAsset.files?.[0];
                if (!modelFile) continue;

                // Find matching local file
                const localFile = item._local_files?.find(file =>
                    file.original_url === modelFile.url &&
                    file.asset_name === weaponAsset.name
                );

                if (!localFile) {
                    console.warn(`No local file found for weapon: ${weaponAsset.name}`);
                    continue;
                }

                try {
                    const localPath = `/${localFile.local_path}`;
                    // const publicPath = getUpdatedUrl(localFile.original_url);

                    let vercelUrl = getVercelUrlFromLocalPath(localPath);
                    const gltf = await loader.loadAsync(vercelUrl);
                    const weaponModel = gltf.scene;

                    /*
                    let weaponModel;
                    // Check file extension for loader type
                    if (publicPath.toLowerCase().endsWith('.fbx')) {
                        const fbxLoader = new FBXLoader();
                        weaponModel = await fbxLoader.loadAsync(publicPath);
                    } else {
                        const gltfLoader = new GLTFLoader();
                        const gltf = await gltfLoader.loadAsync(publicPath);
                        weaponModel = gltf.scene;
                    }
                    */

                    // Remove all lights from the loaded weapon model
                    weaponModel.traverse((node) => {
                        if (node.isLight) {
                            // log change
                            console.log('removing light:', node.name);
                            node.intensity = 0;  // or node.parent.remove(node);
                        }
                    });

                    // Position weapon in a row
                    weaponModel.position.set(xPosition, 1, zPosition);

                    // Add metadata to the model for reference
                    weaponModel.userData = {
                        name: weaponAsset.name,
                        contractAddress: item.contractAddress,
                        tokenId: item.tokenId,
                        metadata: metadata,
                        summary: item._summaries?.find(s => s.model_path === localFile.local_path)?.summary,
                        description: metadata.description,
                        niftyIslandLink: getNiftyIslandUrl(
                            item.chain,
                            item.contractAddress,
                            item.tokenId
                        ),
                        imageUrl: metadata.image.originalUrl,
                        localPath: localPath,
                        vercelUrl: vercelUrl
                    };

                    // log the user data set
                    console.log('weaponModel.userData', weaponModel.userData);

                    // Add a unique modelId to all parts of this weapon
                    const modelId = `weapon_${modelIdCounter++}`;
                    weaponModel.traverse(node => {
                        node.userData.modelId = modelId;
                        if (node.isMesh) {
                            node.userData.originalMaterial = node.material;
                        }
                    });

                    // Add to scene
                    sceneRef.current.add(weaponModel);

                    // Move to next position
                    xPosition += spacing;

                    // Inside the weapon loading loop, after creating the weapon model:
                    weaponModel.traverse((node) => {
                        if (node.isMesh) {
                            // Store the original material for reference
                            node.userData.originalMaterial = node.material.clone(); // Clone the material
                        }
                    });
                } catch (error) {
                    console.error(`Error loading weapon ${weaponAsset.name}:`, error);
                }
            }
        }
    };

    // Add this near other utility functions
    const isMobileDevice = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    // Modify the useEffect that calls loadWeapons
    useEffect(() => {
        if (sceneRef.current && !weaponsLoadedRef.current && rendererRef.current) {
            // Skip loading weapons on mobile devices
            if (isMobileDevice()) {
                console.log('Skipping weapon loading on mobile device');
                weaponsLoadedRef.current = true; // Mark as loaded to prevent future attempts
                return;
            }

            console.log('Loading weapons...');
            loadWeapons();
            weaponsLoadedRef.current = true;
        }
    }, [sceneRef.current, rendererRef.current]);

    // Add this new function near other utility functions
    const handleWeaponHover = (event) => {
        if (!sceneRef.current || !cameraRef.current) return;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = rendererRef.current.domElement.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

        // Get only the top-level weapon objects for intersection testing
        const weaponObjects = sceneRef.current.children.filter(obj => obj.userData?.name);

        // Calculate objects intersecting the picking ray
        const intersects = raycasterRef.current.intersectObjects(weaponObjects, true);

        // If we were hovering a weapon previously
        if (hoveredWeaponRef.current) {
            // Get all meshes in the weapon model
            const meshes = [];
            hoveredWeaponRef.current.parent.children.forEach(child => {
                if (child.userData.modelId === hoveredWeaponRef.current.userData.modelId) {
                    child.traverse(subChild => {
                        if (subChild.isMesh && subChild.userData.originalMaterial) {
                            subChild.material = subChild.userData.originalMaterial;
                        }
                    });
                }
            });

            hoveredWeaponRef.current = null;
            rendererRef.current.domElement.style.cursor = 'default';
        }

        // If we found a new weapon to hover
        if (intersects.length > 0) {
            const intersectedObject = intersects[0].object;
            let modelRoot = intersectedObject;
            while (modelRoot.parent && !modelRoot.userData?.name) {
                modelRoot = modelRoot.parent;
            }

            if (modelRoot !== hoveredWeaponRef.current) {
                hoveredWeaponRef.current = modelRoot;

                // Apply highlight to all meshes that share the same model ID
                modelRoot.parent.children.forEach(child => {
                    if (child.userData.modelId === modelRoot.userData.modelId) {
                        child.traverse(subChild => {
                            if (subChild.isMesh) {
                                if (!subChild.userData.originalMaterial) {
                                    subChild.userData.originalMaterial = subChild.material;
                                }
                                subChild.material = highlightMaterialRef.current;
                            }
                        });
                    }
                });

                rendererRef.current.domElement.style.cursor = 'pointer';
            }
        }
    };

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
    const handleWeaponClick = (event) => {
        if (!hoveredWeaponRef.current) return;

        // Find the root object that contains our metadata
        const modelRoot = findModelRoot(hoveredWeaponRef.current);

        if (!modelRoot) {
            console.error('Could not find model root with metadata');
            return;
        }

        // Get the weapon data from the root object's userData
        const weaponData = modelRoot.userData;

        console.log('weaponData', weaponData);

        setSelectedWeaponDetails(weaponData);
        setShowWeaponDetails(true);
    };

    // Modify the return statement to add the avatar selector UI
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
                    className="fixed bottom-20 left-20 w-[150px] h-[150px] z-20"
                />
            )}

            {/* Add mobile interaction button */}
            {isMobile && isNearNPC && !isChatting && (
                <Button
                    className="fixed bottom-32 right-8 z-20 bg-black/75 text-white px-8 py-4 rounded-full"
                    onClick={startChat}
                >
                    Talk
                </Button>
            )}

            {/* Settings Panel */}
            {showSettings && (
                <Card className="fixed top-16 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg z-10 w-64">
                    <CardContent>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold">Info</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSettings(false)}
                                className="text-white hover:text-gray-300"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-6">
                            {/* Controls Section */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Controls</label>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 bg-gray-700 rounded">WASD</kbd>
                                        <kbd className="px-2 py-1 bg-gray-700 rounded">↑←↓→</kbd>
                                        <span>Move</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 bg-gray-700 rounded">F</kbd>
                                        <span>Interact</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 101.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span>Click + Drag to look</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 101.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <span>Click certain objects to view details</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd>
                                        <span>Exit chat</span>
                                    </div>
                                </div>
                            </div>

                            {/* Add About Section */}
                            <div>
                                <label className="block text-sm font-medium mb-2">About</label>
                                <p className="text-sm">
                                    Created by <a href="https://x.com/zoan37" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-300">@zoan37</a>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Interaction Prompt */}
            {isNearNPC && !isChatting && (
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded z-10">
                    Press F to talk
                </div>
            )}

            {/* Modified Chat Interface */}
            {isChatting && (
                <Card className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-[1000px] bg-white/50 backdrop-blur-sm z-10">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-700">Chatting with {NPC_NAME}</span>
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
                        <div className="flex gap-4 h-[375px]">
                            {/* Chat column */}
                            <div className="flex-1 flex flex-col">
                                <div
                                    ref={chatContainerRef}
                                    className="flex-1 overflow-y-auto mb-4 space-y-2"
                                >
                                    {chatMessages.map((msg, index) => {
                                        if (msg.sender === 'Player' || msg.message || !msg.isStreaming) {
                                            // Parse message and tags if it's an NPC message
                                            const { cleanMessage, tags } = msg.sender === NPC_NAME
                                                ? parseMessageTags(msg.message)
                                                : { cleanMessage: msg.message, tags: [] };

                                            return (
                                                <div
                                                    key={index}
                                                    className={`p-3 rounded ${msg.sender === 'Player'
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
                                                    {tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {tags.map((tag, tagIndex) => {
                                                                if (tag.type === 'try_weapon') {
                                                                    return (
                                                                        <Button
                                                                            key={tagIndex}
                                                                            onClick={() => agentActionTryWeapon(tag.params)}
                                                                            size="sm"
                                                                            variant="outline"
                                                                        >
                                                                            Try {tag.params.weaponName}
                                                                        </Button>
                                                                    );
                                                                }
                                                                return null;
                                                            })}
                                                        </div>
                                                    )}
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
                            <div className="w-80 border-l pl-4 overflow-y-auto">
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
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Replace the settings button with info button in top right */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="fixed top-4 right-4 w-10 h-10 rounded-full bg-black bg-opacity-75 text-white hover:bg-opacity-90 z-10"
                title="Info & Controls"
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

            {showWeaponDetails && selectedWeaponDetails && (
                <Card
                    className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[400px] bg-white/95 backdrop-blur-sm z-20"
                    onClick={(e) => e.stopPropagation()}
                >
                    <CardContent
                        className="p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold">{selectedWeaponDetails.name}</h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowWeaponDetails(false);
                                }}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {/* Updated model viewer section */}
                            <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <ModelViewer
                                    src={selectedWeaponDetails.vercelUrl}
                                    alt={selectedWeaponDetails.name}
                                    cameraControls
                                    autoRotate
                                    autoRotateDelay={0}
                                    rotationPerSecond="-60deg"
                                    environmentImage="neutral"
                                    shadowIntensity={1}
                                    exposure={1}
                                    interactionPrompt="none"
                                    cameraOrbit="0deg 90deg auto"
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </div>

                            {selectedWeaponDetails.description && (
                                <div>
                                    <h3 className="font-semibold mb-2">Description</h3>
                                    <p className="text-gray-700">{selectedWeaponDetails.description}</p>
                                </div>
                            )}

                            <div className="flex justify-center gap-2 mt-6">
                                <a
                                    href={selectedWeaponDetails.niftyIslandLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 py-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                                >
                                    <img
                                        src="/images/logos/Icon - Color - Nifty Island.svg"
                                        alt="Nifty Island"
                                        className="w-4 h-4 mr-1"
                                    />
                                    View on Nifty Island
                                </a>
                                <Button
                                    onClick={() => {
                                        agentActionTryWeapon({
                                            target: "player",
                                            weaponName: selectedWeaponDetails.name,
                                            weaponType: inferWeaponType({
                                                target: "player",
                                                weaponName: selectedWeaponDetails.name,
                                                weaponType: "",
                                                contractAddress: selectedWeaponDetails.contractAddress,
                                                tokenId: selectedWeaponDetails.tokenId
                                            }, selectedWeaponDetails.metadata),
                                            contractAddress: selectedWeaponDetails.contractAddress,
                                            tokenId: selectedWeaponDetails.tokenId
                                        });
                                        setShowWeaponDetails(false);
                                    }}
                                >
                                    Try It
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default Scene;