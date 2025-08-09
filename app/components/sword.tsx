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
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);

    function init() {
        // Scene setup
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        rendererRef.current = renderer;
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        containerRef.current!.appendChild(renderer.domElement);

        // Enhanced lighting setup
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe0e0e0);
        scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(renderer), 0.04).texture;

        // Multiple light sources for better illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 1);
        hemisphereLight.position.set(0, 20, 0);
        scene.add(hemisphereLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(3, 10, 4);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-3, 10, -4);
        scene.add(fillLight);

        // Ground plane
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2000, 2000),
            new THREE.MeshPhongMaterial({ color: 0xcbcbcb, depthWrite: false })
        );
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);

        // Grid
        const grid = new THREE.GridHelper(200, 200, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        scene.add(grid);

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;
        controls.minDistance = 1;
        controls.maxDistance = 50;

        camera.position.z = 5 * 1.3;
        camera.position.y = 3 * 1.3;

        // Animation mixer
        let mixer: THREE.AnimationMixer;
        let vrm: any;

        // Load VRM model
        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';

        const helperRoot = new THREE.Group();
        helperRoot.renderOrder = 10000;
        // scene.add(helperRoot);

        loader.register((parser) => {
            return new VRMLoaderPlugin(parser, { helperRoot: helperRoot, autoUpdateHumanBones: true });
        });

        // Load VRM
        loader.load(
            './avatars/Default_M.vrm',
            (gltf) => {
                vrm = gltf.userData.vrm;
                scene.add(vrm.scene);

                // Disable frustum culling
                vrm.scene.traverse((obj: THREE.Object3D) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);

                // Create mixer for VRM
                mixer = new THREE.AnimationMixer(vrm.scene);

                // Load sword model
                loader.load(
                    './weapons/Sword.glb',
                    (gltf) => {
                        const sword = gltf.scene;
                        // Scale and position the sword appropriately
                        sword.scale.setScalar(1.0);  // Adjust scale as needed

                        // Find the right hand bone in the VRM model
                        vrm.scene.traverse((child: THREE.Object3D) => {
                            console.log('child', child.name);

                            if (child.name.includes('J_Bip_R_Hand')) {
                                // Attach sword to right hand
                                child.add(sword);

                                sword.position.z = 0.0;
                                sword.position.x = 0.05;
                                sword.position.y = -0.025;

                                sword.rotation.x = -Math.PI / 2 - 0 * Math.PI / 16;
                                sword.rotation.y = Math.PI / 2 + 2 * Math.PI / 16;
                                sword.rotation.z = Math.PI / 8 + -2 * Math.PI / 16;
                            }
                        });

                        // Load and play sword idle animation
                        loadMixamoAnimation('./animations/Great Sword Idle.fbx', vrm).then((clip) => {
                            const action = mixer.clipAction(clip);
                            action.play();
                        });
                    },
                    (progress) => console.log('Loading sword...', 100.0 * (progress.loaded / progress.total), '%'),
                    (error) => console.error('Error loading sword:', error)
                );
            },
            (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),
            (error) => console.error(error)
        );

        // Animation loop
        const clock = new THREE.Clock();
        const animate = function () {
            requestAnimationFrame(animate);

            const deltaTime = clock.getDelta();

            if (mixer) {
                mixer.update(deltaTime);
            }

            if (vrm) {
                vrm.update(deltaTime);
            }

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

        // Window resize handler
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }

        window.addEventListener('resize', onWindowResize);
    }

    useEffect(() => {
        if (!rendererRef.current) {
            init();
        }
    }, []);

    return <div ref={containerRef} />;
};

export default Scene;