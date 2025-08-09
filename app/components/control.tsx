// @ts-nocheck
'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';

const Scene = () => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const avatarRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const mixerRef = useRef(null);
  const animationActionsRef = useRef({});
  const currentAnimationRef = useRef(null);
  
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

  useEffect(() => {
    if (!rendererRef.current) {
      init();
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleKeyDown = (event) => {
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      keyStates.current[event.key] = true;
    }
  };

  const handleKeyUp = (event) => {
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
      keyStates.current[event.key] = false;
    }
  };

  const playAnimation = (animation) => {
    const actions = animationActionsRef.current;
    const currentAction = currentAnimationRef.current;
    const nextAction = actions[animation];

    if (!nextAction) return;
    if (currentAction === nextAction) return;

    // Crossfade to new animation
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

  async function initializeAnimations(vrm) {
    console.log("Initializing animations...");
    const mixer = new THREE.AnimationMixer(vrm.scene);
    mixerRef.current = mixer;

    const animations = ['Idle', 'Walking'];
    const actions = {};

    for (const animation of animations) {
      try {
        console.log(`Loading animation: ${animation}`);
        const url = `./animations/${animation}.fbx`;
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

    animationActionsRef.current = actions;
    console.log("Playing initial Idle animation");
    playAnimation('Idle');
  }

  function init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0);
    scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    // Add ambient light
    var ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1.0, 1.0, 1.0).normalize();
    scene.add(light);

    // lights

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 20, 10);
    scene.add(dirLight);

    // Ground
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2000, 2000),
      new THREE.MeshBasicMaterial({ color: 'rgb(210, 210, 210)', depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    scene.add(mesh);

    const grid = new THREE.GridHelper(200, 200, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controls.enableKeys = false;
    controls.enablePan = false;
    controlsRef.current = controls;

    // Load Avatar
    const loader = new GLTFLoader();
    loader.crossOrigin = 'anonymous';
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true });
    });

    loader.load(
      './avatars/Default_M.vrm',
      async (gltf) => {
        const vrm = gltf.userData.vrm;
        scene.add(vrm.scene);
        avatarRef.current = vrm;

        vrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        VRMUtils.rotateVRM0(vrm);
        
        // Initialize animations after avatar is loaded
        await initializeAnimations(vrm);
      },
      (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
      (error) => console.error(error)
    );

    const clock = new THREE.Clock();
    const moveSpeed = 0.05;
    const rotationSpeed = 0.15;

    function animate() {
      requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      // Update animation mixer
      if (mixerRef.current) {
        mixerRef.current.update(deltaTime);
      }

      if (avatarRef.current) {
        const avatar = avatarRef.current.scene;
        const moveVector = new THREE.Vector3(0, 0, 0);

        // Get camera's forward direction (projected onto XZ plane)
        const cameraForward = new THREE.Vector3();
        camera.getWorldDirection(cameraForward);
        cameraForward.y = 0;
        cameraForward.normalize();

        // Get camera's right direction
        const cameraRight = new THREE.Vector3();
        cameraRight.crossVectors(cameraForward, new THREE.Vector3(0, 1, 0));
        cameraRight.normalize();

        // Calculate movement direction
        if (keyStates.current.w || keyStates.current.ArrowUp) moveVector.add(cameraForward);
        if (keyStates.current.s || keyStates.current.ArrowDown) moveVector.sub(cameraForward);
        if (keyStates.current.a || keyStates.current.ArrowLeft) moveVector.sub(cameraRight);
        if (keyStates.current.d || keyStates.current.ArrowRight) moveVector.add(cameraRight);

        // Check if moving and update animation accordingly
        if (moveVector.length() > 0) {
          playAnimation('Walking');
          
          moveVector.normalize();
          
          // Store the camera's position relative to the target before moving
          const cameraOffset = camera.position.clone().sub(controls.target);
          
          // Move the avatar
          avatar.position.add(moveVector.multiplyScalar(moveSpeed));
          
          // Calculate target rotation for the avatar (add Math.PI to face forward)
          const targetRotation = Math.atan2(moveVector.x, moveVector.z) + Math.PI;
          
          // Smoothly rotate avatar towards movement direction
          let currentRotation = avatar.rotation.y;
          
          // Calculate the shortest angle between current and target rotation
          let angleDiff = targetRotation - currentRotation;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          
          // Apply smooth rotation
          avatar.rotation.y += angleDiff * rotationSpeed;
          
          // Update OrbitControls target to new avatar position
          controls.target.copy(avatar.position).add(new THREE.Vector3(0, 1, 0));
          
          // Move camera maintaining the exact same offset
          camera.position.copy(controls.target).add(cameraOffset);
        } else {
          // If not moving, ensure we're in Idle animation
          playAnimation('Idle');
        }

        avatarRef.current.update(deltaTime);
      }

      controls.update();
      renderer.render(scene, camera);
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

  return <div ref={containerRef} />;
};

export default Scene;