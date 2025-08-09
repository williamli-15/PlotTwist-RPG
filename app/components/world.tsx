// @ts-nocheck

'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { loadMixamoAnimation } from './loadMixamoAnimation.js';
import TWEEN from '@tweenjs/tween.js';

const Scene = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | undefined>(undefined);

  const [playAnimationHandler, setPlayAnimationHandler] = React.useState<(animation: string) => void>(() => { });
  /*
  let playAnimationHandler = function(animation: string) {
    console.log('placeholder playAnimationHandler: ' + animation);
  }
  */

  function init() {
    const avatarMap = {} as any;

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
    // alice blue color
    // scene.background = new THREE.Color(0xF0F8FF);
    scene.background = new THREE.Color(0xe0e0e0);
    scene.fog = new THREE.Fog(0xe0e0e0, 20, 100);

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

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    // Adding a grid to the scene
    // const gridColor = 0xD3D3D3;
    // const gridHelper = new THREE.GridHelper(10, 10, gridColor, gridColor);
    // scene.add(gridHelper);

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

      // 'Running',
      // 'Walking',
    ];

    function getAnimationUrl(name: string) {
      return `./animations/${name}.fbx`;
    }

    const clock = new THREE.Clock();
    const animate = function () {
      requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      /*
      // loop through mixer list
      for (let i = 0; i < mixerList.length; i++) {
        const mixer = mixerList[i];

        mixer.update(deltaTime);
      }

      // loop through vrm list
      for (let i = 0; i < vrmList.length; i++) {
        const vrm = vrmList[i];

        vrm.update(deltaTime);
      }
      */

      // Update all tweens in the group
      tweenGroup.update();

      // loop through avatarMap
      for (var id in avatarMap) {
        const avatar = avatarMap[id];

        if (avatar.mixer) {
          avatar.mixer.update(deltaTime);
        }

        if (avatar.vrm) {
          avatar.vrm.update(deltaTime);
        }

        if (avatar.targetDirection) {
          // console.log('deltaTime', deltaTime);
          const speed = 3;
          const step = speed * deltaTime;
          rotateAvatarInDirection(avatar, avatar.targetDirection, step);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const helperRoot = new THREE.Group();
    helperRoot.renderOrder = 10000;
    scene.add(helperRoot);

    helperRoot.visible = false;

    const defaultModelUrl = 'https://w3s.link/ipfs/QmUmn19HHPVEdREmz46K8YToChNCh3eHb9XWJUT5PLoAsL/default_103.vrm';
    // const model2Url = 'https://w3s.link/ipfs/QmQcV1m51AXNdZUsQNoPeEyVFWbnWgzdWKASdxEuaT3VEd/default_1802.vrm';
    const model3Url = 'https://w3s.link/ipfs/QmZiCnsyNaTvazx5b38zHZJGxQpMZHFWs1n4veoiAdLcoN/default_877.vrm';
    const model4Url = 'https://w3s.link/ipfs/QmRZG25uNX1RHWnpZpx4DkAf7J8a1ZMhDUAZFXpzMCzxUS/default_1699.vrm';
    const model5Url = 'https://w3s.link/ipfs/QmVPHNjZoX9JgFZWU9o2EczpyQZXSqnooV5pZumBx8jLAS/default_1904.vrm'

    const model1Url = defaultModelUrl;
    const model2Url = model3Url;

    function loadUniqueVrm(modelUrl: string, callback: (err: any, data: any) => void) {

      const loader = new GLTFLoader();
      loader.crossOrigin = 'anonymous';

      helperRoot.clear();

      loader.register((parser) => {

        return new VRMLoaderPlugin(parser, { helperRoot: helperRoot, autoUpdateHumanBones: true });

      });

      loader.load(
        // URL of the VRM you want to load
        modelUrl,

        // called when the resource is loaded
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

          console.log('vrm', vrm);

          if (callback) {
            callback(null, {
              gltf: gltf,
              vrm: vrm
            });
          }
        },

        // called while loading is progressing
        (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),

        // called when loading has errors
        (error) => console.error(error),
      );
    }

    function loadFBXForVRM(animationUrl: string, vrm: any) {
      // currentAnimationUrl = animationUrl;

      // create AnimationMixer for VRM
      const mixer = new THREE.AnimationMixer(vrm.scene);

      mixerList.push(mixer);

      // Load animation
      loadMixamoAnimation(animationUrl, vrm).then((clip) => {
        // Apply the loaded animation to mixer and play
        mixer.clipAction(clip).play();
        // mixer.timeScale = params.timeScale;
        mixer.timeScale = 1.0;
      });
    }

    /*
    loadUniqueVrm(defaultModelUrl, function (vrm) {
      // const idleAnimation = '/animations/Standard Idle.fbx';
      const idleAnimation = '/animations/Chicken Dance.fbx';
      // const idleAnimation = '/animations/Silly Dancing.fbx';

      loadFBXForVRM(idleAnimation, vrm);

      vrm.scene.traverse((child: THREE.Object3D) => {
        const name = child.name.trim(); // Exported bones don't have dots in their names

        // console.log(name, child);

        if (name == 'rightHand') {
          const rightHand = child;
        }
      });
    });
    */

    function rotateAvatarInDirection(avatar: any, direction: THREE.Vector3, step: number) {
      const lookAtVector = new THREE.Vector3();
      lookAtVector.copy(avatar.vrm.scene.position);
      lookAtVector.add(direction);

      var matrix = new THREE.Matrix4();
      matrix.lookAt(avatar.vrm.scene.position, lookAtVector, avatar.vrm.scene.up);

      var quaternion = new THREE.Quaternion();
      quaternion.setFromRotationMatrix(matrix);

      avatar.vrm.scene.quaternion.rotateTowards(quaternion, step);


      /*
      // get current avatar direction
      const currentDirection = new THREE.Vector3();
      avatar.vrm.scene.getWorldDirection(currentDirection);

      // get dot product of current direction and target direction
      const dot = currentDirection.dot(direction);

      // get angle between current direction and target direction



      const angle = Math.atan2(direction.x, direction.z);

      const currentAngle = avatar.vrm.scene.rotation.y;
      const shortestAngle = Math.atan2(Math.sin(angle - currentAngle), Math.cos(angle - currentAngle));

      const tween = new TWEEN.Tween({ rotation: currentAngle })
        .to({ rotation: shortestAngle }, 500)
        .onUpdate(function (object) {
          avatar.vrm.scene.rotation.y = object.rotation;
        })
        .start();
      */
    }

    function moveAvatarToPoint(avatar: any, target: THREE.Vector3, duration: number) {
      // Calculate the distance between point1 and point2
      // const distance = point2.distanceTo(point1);

      // Calculate the direction vector from point1 to point2
      // const direction = point2.clone().sub(point1).normalize();

      // Calculate the duration of the animation based on the distance
      // const duration = distance / avatar.walkSpeed;

      // Create a new animation action for the avatar's mixer
      // const action = avatar.mixer.clipAction(avatar.animationActions['walk']);

      // Set the animation action to loop
      // action.setLoop(THREE.LoopRepeat);

      // Set the animation action to play from the beginning
      // action.reset();

      // Set the animation action to play for the calculated duration
      // action.setDuration(duration);

      // Set the animation action to play at the avatar's speed
      // action.timeScale = avatar.speed;

      // Set the animation action to start at point1
      // avatar.currentAnimationAction = action;
      // avatar.currentAnimationAction.play();

      /*
      var position = { x: 100, y: 0 }


      // Create a tween for position first
      var tween = new TWEEN.Tween(position)

      // Then tell the tween we want to animate the x property over 1000 milliseconds
      tween.to({ x: 200 }, 1000)

      tween.onUpdate(function (object) {
        console.log('tween!')
        console.log(object.x)
      })

      tween.start();
      */


      // console.log('avatar.vrm.scene.position', avatar.vrm.scene.position);

      /*
      let pos = avatar.vrm.scene.position;

      // direction vector
      const direction = target.clone().sub(pos).normalize();

      // rotate avatar in direction
      // rotateAvatarInDirection(avatar, direction);
      avatar.targetDirection = direction;

      const tween2 = new TWEEN.Tween(pos) // Create a new tween that modifies 'coords'.
        .to({ x: target.x, y: target.y, z: target.z }, duration); // Move to (300, 200) in 1 second.
      // .easing(TWEEN.Easing.Linear.None)
      tween2.onUpdate(() => {
        // Called after tween.js updates 'coords'.
        // Move 'box' to the position described by 'coords' with a CSS translation.
        // box.style.setProperty('transform', 'translate(' + coords.x + 'px, ' + coords.y + 'px)')

        console.log('pos', pos);

        // avatar.vrm.scene.position.set(coords.x, 0, coords.y); // TODO: parameterize 
      })
      tween2.onComplete(() => {
        // playAnimation(avatar.id, 'Idle');
      });
      tween2.start() // Start the tween immediately.

      // playAnimation(avatar.id, 'Walking');
      */

      /*
      console.log('avatar.vrm.scene.position', avatar.vrm.scene.position);
      let pos = avatar.vrm.scene.position;

      // direction vector
      const direction = target.clone().sub(pos).normalize();

      // rotate avatar in direction
      // rotateAvatarInDirection(avatar, direction);
      avatar.targetDirection = direction;

      const tween2 = new TWEEN.Tween(pos) // Create a new tween that modifies 'coords'.
        .to({ x: target.x, y: target.y, z: target.z }, duration); // Move to (300, 200) in 1 second.
      // .easing(TWEEN.Easing.Linear.None)
      tween2.onUpdate(() => {
        // Called after tween.js updates 'coords'.
        // Move 'box' to the position described by 'coords' with a CSS translation.
        // box.style.setProperty('transform', 'translate(' + coords.x + 'px, ' + coords.y + 'px)')

        console.log('pos', pos);

        // avatar.vrm.scene.position.set(coords.x, 0, coords.y); // TODO: parameterize 
      })
      tween2.onComplete(() => {
        // playAnimation(avatar.id, 'Idle');
      });
      tween2.start() // Start the tween immediately.
      */

      // playAnimation(avatar.id, 'Walking');

      // set avatar.vrm.scene.position to target
      // avatar.vrm.scene.position.set(target.x, target.y, target.z);

      // return;

      // console.log('avatar.vrm.scene.position', avatar.vrm.scene.position);
      const coords = { x: avatar.vrm.scene.position.x, y: avatar.vrm.scene.position.y, z: avatar.vrm.scene.position.z };

      // direction vector
      const direction = target.clone().sub(avatar.vrm.scene.position).normalize();

      // rotate avatar in direction
      avatar.targetDirection = direction;

      // log coords
      // console.log('coords', coords);
      // log target
      // console.log('target', target);

      new TWEEN.Tween(coords, tweenGroup) // Create a new tween that modifies 'coords'.
        .to({ x: target.x, y: target.y, z: target.z }, duration)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(() => {
          // Explicitly set the position to ensure it's updated
          avatar.vrm.scene.position.set(coords.x, coords.y, coords.z);
          // console.log('Updated position:', coords);

          // log avatar.vrm.scene.position
          // console.log('update avatar.vrm.scene.position', avatar.vrm.scene.position);
        })
        .onComplete(() => {
          // console.log('Tween complete');
          // Optionally play an idle animation or other actions
          // playAnimation(avatar.id, 'Idle');
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

        console.log('Loading animation: ' + animationUrl);

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
      // get correct case animation from input animation (which is lowercase)
      const animationList = Object.keys(avatarMap[id].animationActions);

      console.log('animationList', animationList);

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

      // fade out current animation
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

      // animationAction.reset();
      // animationAction.play();

      /*
      avatar.currentAnimationAction.reset()
          .setEffectiveTimeScale(1)
          .setEffectiveWeight(1)
          .fadeIn(DURATION)
          .play();
      */
    }

    // function get random vector of (-1, 0, 0), (1, 0, 0), (0, 0, -1), (0, 0, 1)
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

      for (var i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const modelUrl = `./avatars/${file}`;
        const id = `avatar_${i}`;
        const avatar = await createAvatar(id, modelUrl);
        avatars.push(avatar);
      }



      const initialAnimation = 'Idle';

      for (var i = 0; i < avatars.length; i++) {
        const avatar = avatars[i];
        scene.add(avatar.vrm.scene);
        // avatar.vrm.scene.position.set(i, 0, 0);
        playAnimation(avatar.id, initialAnimation);
      }

      for (var i = 0; i < avatars.length; i++) {
        const avatar = avatars[i];
        playAnimation(avatar.id, 'Walking');
      }

      while (true) {
        for (var i = 0; i < avatars.length; i++) {
          const avatar = avatars[i];
          const randomDirection = getRandomDirection();
          const target = avatar.vrm.scene.position.clone().add(randomDirection);

          // console.log('avatar.vrm.scene.position', avatar.vrm.scene.position);
          // console.log('randomDirection', randomDirection);
          // console.log('target', target);

          moveAvatarToPoint(avatar, target, 1000);
        }

        // wait 0.5 seconds
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(null);
          }, 1000);
        });
      }


      /*

      const avatar1 = await createAvatar(AVATAR_ID_1, model1Url);

      scene.add(avatar1.vrm.scene);
      avatar1.vrm.scene.position.set(0.8, 0, 0);
      // avatar1.vrm.scene.rotation.y = Math.PI / 2;

      const avatar2 = await createAvatar(AVATAR_ID_2, model2Url);
      scene.add(avatar2.vrm.scene);
      avatar2.vrm.scene.position.set(-0.8, 0, 0);
      // avatar2.vrm.scene.rotation.y = -Math.PI / 2;

      playAnimation(AVATAR_ID_1, initialAnimation);
      playAnimation(AVATAR_ID_2, initialAnimation);

      setTimeout(() => {
        moveAvatarToPoint(avatar1, new THREE.Vector3(5, 0, 0), 2500);
        moveAvatarToPoint(avatar2, new THREE.Vector3(-5, 0, 0), 2500);
        playAnimation(avatar1.id, 'Walking');
        playAnimation(avatar2.id, 'Walking');
        setTimeout(() => {
          moveAvatarToPoint(avatar1, new THREE.Vector3(5, 0, 5), 2500);
          moveAvatarToPoint(avatar2, new THREE.Vector3(-5, 0, 5), 2500);
          setTimeout(() => {
            playAnimation(avatar1.id, 'Idle');
            playAnimation(avatar2.id, 'Idle');
          }, 2500);
        }, 2500);
      }, 1);
      */

      /*
      'Jumping',
      'Chicken Dance',
      'Gangnam Style',
      'Samba Dancing',
      'Silly Dancing',
      'Snake Hip Hop Dance',
      'Twist Dance',
      'Wave Hip Hop Dance',
      */

      /*
      setTimeout(() => {
        playAnimation(AVATAR_ID_1, 'Jumping');
        playAnimation(AVATAR_ID_2, 'Jumping');
 
        setTimeout(() => {
          playAnimation(AVATAR_ID_1, 'Chicken Dance');
          playAnimation(AVATAR_ID_2, 'Chicken Dance');
 
          setTimeout(() => {
            playAnimation(AVATAR_ID_1, 'Gangnam Style');
            playAnimation(AVATAR_ID_2, 'Gangnam Style');
 
            setTimeout(() => {
              playAnimation(AVATAR_ID_1, 'Samba Dancing');
              playAnimation(AVATAR_ID_2, 'Samba Dancing');
 
              setTimeout(() => {
                playAnimation(AVATAR_ID_1, 'Silly Dancing');
                playAnimation(AVATAR_ID_2, 'Silly Dancing');
 
                setTimeout(() => {
                  playAnimation(AVATAR_ID_1, 'Snake Hip Hop Dance');
                  playAnimation(AVATAR_ID_2, 'Snake Hip Hop Dance');
 
                  setTimeout(() => {
                    playAnimation(AVATAR_ID_1, 'Twist Dance');
                    playAnimation(AVATAR_ID_2, 'Twist Dance');
 
                    setTimeout(() => {
                      playAnimation(AVATAR_ID_1, 'Wave Hip Hop Dance');
                      playAnimation(AVATAR_ID_2, 'Wave Hip Hop Dance');
                    }, 2000);
                  }, 2000);
                }, 2000);
              }, 2000);
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
      */
    }

    initializeAvatars();

    const playAnimationHandlerLocal = (role: string, animation: string) => {
      console.log('playAnimationHandler: ' + animation);

      const avatarId = role == 'user' ? AVATAR_ID_1 : AVATAR_ID_2;

      playAnimation(avatarId, animation);
    }

    console.log('previous playAnimationHandler: ' + playAnimationHandler);
    console.log('new playAnimationHandler: ', playAnimationHandlerLocal);

    setPlayAnimationHandler(() => {
      return playAnimationHandlerLocal;
    });
  }

  useEffect(() => {
    if (!rendererRef.current) {
      init();
    }
  }, [playAnimationHandler]);

  useEffect(() => {
    console.log('current playAnimationHandler', playAnimationHandler);
  }, [playAnimationHandler]);

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
    </div>
  );
};

export default Scene;
