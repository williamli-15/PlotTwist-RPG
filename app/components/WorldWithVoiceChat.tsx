// WorldWithVoiceChat.tsx - World component with integrated proximity voice chat
// @ts-nocheck
'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import TWEEN from '@tweenjs/tween.js';
import VoiceChatIntegration from './VoiceChatIntegration';
import { useLobbyStore } from '@/lib/lobbyStore';

const WorldWithVoiceChat = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);
  const avatarMapRef = useRef({} as any);

  const [playAnimationHandler, setPlayAnimationHandler] = useState<(animation: string) => void>(() => { });
  const [avatarPositions, setAvatarPositions] = useState<Map<string, { x: number; y: number; z: number }>>(new Map());

  const { currentLobby, profile, otherAvatars, updateAvatarState } = useLobbyStore();

  function init() {
    const avatarMap = {} as any;
    avatarMapRef.current = avatarMap;

    // Create a TWEEN group
    const tweenGroup = new TWEEN.Group();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    rendererRef.current = renderer;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current!.appendChild(renderer.domElement);

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', onWindowResize);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    // Add lighting
    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // Add ground plane
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false }));
    mesh.rotation.x = - Math.PI / 2;
    scene.add(mesh);

    const grid = new THREE.GridHelper(200, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    // Adding orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.minDistance = 1;
    controls.maxDistance = 50;

    camera.position.z = 5 * 1.3;
    camera.position.y = 3 * 1.3;

    const vrmList = [] as any[];
    const mixerList = [] as any[];

    const AVATAR_ID_1 = 'avatar1';
    const AVATAR_ID_2 = 'avatar2';

    const animations = [
      'Idle',
      'Jumping',
      'Chicken Dance',
      'Gangnam Style',
      'Samba Dancing',
      'Silly Dancing',
      'Snake Hip Hop Dance',
      'Twist Dance',
      'Wave Hip Hop Dance',
      'Walking'
    ];

    function getAnimationUrl(name: string) {
      return `./animations/${name}.fbx`;
    }

    const clock = new THREE.Clock();

    // Enhanced animate function with position tracking
    const animate = function () {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      // Update all tweens in the group
      tweenGroup.update();

      // Track positions for voice chat
      const newPositions = new Map();

      // loop through avatarMap and update positions
      for (var id in avatarMap) {
        const avatar = avatarMap[id];

        if (avatar.mixer) {
          avatar.mixer.update(deltaTime);
        }

        if (avatar.vrm) {
          avatar.vrm.update(deltaTime);

          // Track avatar position for voice chat
          const position = {
            x: avatar.vrm.scene.position.x,
            y: avatar.vrm.scene.position.y,
            z: avatar.vrm.scene.position.z
          };
          newPositions.set(id, position);

          // Update lobby store with position if this is our avatar and we have profile
          if (profile && id === 'self') {
            updateAvatarState({
              position_x: position.x,
              position_y: position.y,
              position_z: position.z
            });
          }
        }

        if (avatar.targetDirection) {
          const speed = 3;
          const step = speed * deltaTime;
          rotateAvatarInDirection(avatar, avatar.targetDirection, step);
        }
      }

      // Update avatar positions for voice chat
      setAvatarPositions(newPositions);

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const helperRoot = new THREE.Group();
    helperRoot.renderOrder = 10000;
    scene.add(helperRoot);
    helperRoot.visible = false;

    const defaultModelUrl = 'https://w3s.link/ipfs/QmUmn19HHPVEdREmz46K8YToChNCh3eHb9XWJUT5PLoAsL/default_103.vrm';
    const model3Url = 'https://w3s.link/ipfs/QmZiCnsyNaTvazx5b38zHZJGxQpMZHFWs1n4veoiAdLcoN/default_877.vrm';

    function loadUniqueVrm(modelUrl: string, callback: (err: any, data: any) => void) {
      const loader = new GLTFLoader();
      loader.crossOrigin = 'anonymous';

      helperRoot.clear();

      loader.register((parser) => {
        return new VRMLoaderPlugin(parser, { helperRoot: helperRoot, autoUpdateHumanBones: true });
      });

      loader.load(
        modelUrl,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          vrmList.push(vrm);
          scene.add(vrm.scene);

          // Disable frustum culling
          vrm.scene.traverse((obj: THREE.Object3D) => {
            obj.frustumCulled = false;
          });

          // rotate if the VRM is VRM0.0
          VRMUtils.rotateVRM0(vrm);

          if (callback) {
            callback(null, {
              gltf: gltf,
              vrm: vrm
            });
          }
        },
        (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
        (error) => console.error(error),
      );
    }

    function rotateAvatarInDirection(avatar: any, direction: THREE.Vector3, step: number) {
      const lookAtVector = new THREE.Vector3();
      lookAtVector.copy(avatar.vrm.scene.position);
      lookAtVector.add(direction);

      var matrix = new THREE.Matrix4();
      matrix.lookAt(avatar.vrm.scene.position, lookAtVector, avatar.vrm.scene.up);

      var quaternion = new THREE.Quaternion();
      quaternion.setFromRotationMatrix(matrix);

      avatar.vrm.scene.quaternion.rotateTowards(quaternion, step);
    }

    function moveAvatarToPoint(avatar: any, target: THREE.Vector3, duration: number) {
      const coords = {
        x: avatar.vrm.scene.position.x,
        y: avatar.vrm.scene.position.y,
        z: avatar.vrm.scene.position.z
      };

      // direction vector
      const direction = target.clone().sub(avatar.vrm.scene.position).normalize();
      avatar.targetDirection = direction;

      new TWEEN.Tween(coords, tweenGroup)
        .to({ x: target.x, y: target.y, z: target.z }, duration)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          avatar.vrm.scene.position.set(coords.x, coords.y, coords.z);
        })
        .onComplete(() => {
          // Animation complete
        })
        .start();
    }

    async function createAvatar(id: string, modelUrl: string) {
      const avatar = {
        id: id as string,
        modelUrl: modelUrl as string,
        gltf: undefined as any,
        vrm: undefined as any,
        mixer: undefined as any,
        animationActions: {} as any,
        currentAnimationAction: null,
        walkSpeed: 1.0
      };

      avatarMap[id] = avatar;

      const data: any = await (function () {
        return new Promise((resolve, reject) => {
          loadUniqueVrm(modelUrl, (err: any, data: any) => {
            resolve(data);
          });
        })
      })();

      avatar.gltf = data.gltf;
      avatar.vrm = data.vrm;
      avatar.mixer = new THREE.AnimationMixer(data.vrm.scene);
      avatar.mixer.timeScale = 1.0;

      // load animations
      for (var i = 0; i < animations.length; i++) {
        const animation = animations[i];
        const animationUrl = getAnimationUrl(animation);

        const clip = await (function () {
          return new Promise((resolve, reject) => {
            loadMixamoAnimation(animationUrl, avatar.vrm).then((clip) => {
              resolve(clip);
            });
          })
        })();

        avatar.animationActions[animation] = avatar.mixer.clipAction(clip);
      }

      return avatar;
    }

    function playAnimation(id: string, inputAnimation: string) {
      const animationList = Object.keys(avatarMap[id].animationActions);
      const animationIndex = animationList.findIndex((item) => {
        return item.toLowerCase() == inputAnimation.toLowerCase();
      });

      if (animationIndex == -1) {
        console.error('Animation not found: ' + inputAnimation);
        return;
      }

      const animation = animationList[animationIndex];
      const avatar = avatarMap[id];

      if (!avatar) {
        console.error('Avatar not found: ' + id);
        return;
      }

      const animationAction = avatar.animationActions[animation];

      if (!animationAction) {
        console.error('Animation action not found: ' + animation);
        return;
      }

      if (avatar.currentAnimationAction == animationAction) {
        return;
      }

      const DURATION = 0.5;

      if (avatar.currentAnimationAction) {
        animationAction.reset();
        avatar.currentAnimationAction
          .crossFadeTo(animationAction, DURATION, true)
          .play();
      } else {
        animationAction.reset();
        animationAction.play();
      }

      avatar.currentAnimationAction = animationAction;
    }

    function getRandomDirection() {
      const directions = [
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 0, -1),
        new THREE.Vector3(0, 0, 1)
      ];

      const index = Math.floor(Math.random() * directions.length);
      return directions[index];
    }

    async function initializeAvatars() {
      const fileList = [
        "Default_M.vrm",
        "Default_F.vrm"
      ];

      const avatars = [];

      // Create main avatar (self)
      if (profile) {
        const selfAvatar = await createAvatar('self', profile.selected_avatar_model || defaultModelUrl);
        avatars.push(selfAvatar);
        scene.add(selfAvatar.vrm.scene);
        selfAvatar.vrm.scene.position.set(0, 0, 0);
      } else {
        // Fallback for testing
        for (var i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const modelUrl = `./avatars/${file}`;
          const id = `avatar_${i}`;
          const avatar = await createAvatar(id, modelUrl);
          avatars.push(avatar);
        }
      }

      const initialAnimation = 'Idle';

      for (var i = 0; i < avatars.length; i++) {
        const avatar = avatars[i];
        if (!avatar.vrm.scene.parent) {
          scene.add(avatar.vrm.scene);
        }
        playAnimation(avatar.id, initialAnimation);
      }

      // Simple movement demo for non-self avatars
      if (!profile) {
        for (var i = 0; i < avatars.length; i++) {
          const avatar = avatars[i];
          playAnimation(avatar.id, 'Walking');
        }

        while (true) {
          for (var i = 0; i < avatars.length; i++) {
            const avatar = avatars[i];
            const randomDirection = getRandomDirection();
            const target = avatar.vrm.scene.position.clone().add(randomDirection);
            moveAvatarToPoint(avatar, target, 1000);
          }

          await new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(null);
            }, 1000);
          });
        }
      }
    }

    initializeAvatars();

    const playAnimationHandlerLocal = (role: string, animation: string) => {
      const avatarId = role == 'user' ? AVATAR_ID_1 : AVATAR_ID_2;
      playAnimation(avatarId, animation);
    }

    setPlayAnimationHandler(() => {
      return playAnimationHandlerLocal;
    });
  }

  const handlePositionUpdate = (userId: string, position: { x: number; y: number; z: number }) => {
    // This could be used to update other systems or send to server
    console.log(`Position update for ${userId}:`, position);
  };

  useEffect(() => {
    if (!rendererRef.current) {
      init();
    }
  }, [profile]);

  return (
    <div>
      <style type="text/css">
        {`
            .chatbox_container {
              position: absolute;
              top: 0;
              left: 0;
              bottom: 0;
              width: 300px;
              background-color: gray;
              overflow-y: scroll;
              display: none;
            }
        `}
      </style>
      <div ref={containerRef} />

      {/* Voice Chat Integration */}
      {currentLobby && profile && (
        <VoiceChatIntegration
          avatarPositions={avatarPositions}
          onPositionUpdate={handlePositionUpdate}
        />
      )}
    </div>
  );
};

export default WorldWithVoiceChat;