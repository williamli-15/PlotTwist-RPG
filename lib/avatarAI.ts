// lib/avatarAI.ts
// OPTIONAL: Simple AI behaviors for offline digital twins

import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';

export class AvatarAI {
    private vrm: any;
    private behavior: string;
    private intervalId?: NodeJS.Timeout;
    private tweenGroup: any; // Change from TWEEN.Group to any
    private isMoving: boolean = false;

    constructor(vrm: any, behavior: string, tweenGroup: any) {
        this.vrm = vrm;
        this.behavior = behavior;
        this.tweenGroup = tweenGroup;
    }

    start() {
        console.log(`Starting AI behavior: ${this.behavior}`);
        
        switch (this.behavior) {
            case 'wander':
                this.startWandering();
                break;
            case 'idle':
                this.startIdling();
                break;
            case 'patrol':
                this.startPatrolling();
                break;
            default:
                this.startIdling();
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }

    private startWandering() {
        // Wander randomly in a small area
        const wander = () => {
            if (this.isMoving) return; // Skip if already moving
            
            // Random angle and distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 3; // 2-5 units
            
            // Calculate target position
            const currentPos = this.vrm.scene.position;
            const targetX = currentPos.x + Math.cos(angle) * distance;
            const targetZ = currentPos.z + Math.sin(angle) * distance;
            
            // Keep within bounds (-10 to 10)
            const clampedX = Math.max(-10, Math.min(10, targetX));
            const clampedZ = Math.max(-10, Math.min(10, targetZ));
            
            this.moveToPosition(clampedX, currentPos.y, clampedZ);
        };

        // Start wandering immediately
        wander();
        
        // Continue wandering every 3-8 seconds
        this.intervalId = setInterval(wander, 3000 + Math.random() * 5000);
    }

    private startIdling() {
        // Just play idle animation, occasionally look around
        this.intervalId = setInterval(() => {
            // Randomly rotate to look around
            const targetRotationY = (Math.random() - 0.5) * Math.PI;
            
            new TWEEN.Tween(this.vrm.scene.rotation, this.tweenGroup)
                .to({ y: targetRotationY }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
        }, 5000 + Math.random() * 5000);
    }

    private startPatrolling() {
        // Define patrol points
        const patrolPoints = [
            new THREE.Vector3(5, 0, 5),
            new THREE.Vector3(5, 0, -5),
            new THREE.Vector3(-5, 0, -5),
            new THREE.Vector3(-5, 0, 5)
        ];
        
        let currentPointIndex = 0;
        
        const patrol = () => {
            if (this.isMoving) return;
            
            const target = patrolPoints[currentPointIndex];
            this.moveToPosition(target.x, target.y, target.z);
            
            // Move to next point
            currentPointIndex = (currentPointIndex + 1) % patrolPoints.length;
        };
        
        // Start patrolling
        patrol();
        
        // Continue to next point every 5 seconds
        this.intervalId = setInterval(patrol, 5000);
    }

    private moveToPosition(x: number, y: number, z: number) {
        this.isMoving = true;
        
        const startPos = {
            x: this.vrm.scene.position.x,
            y: this.vrm.scene.position.y,
            z: this.vrm.scene.position.z
        };
        
        const targetPos = { x, y, z };
        
        // Calculate distance and duration
        const distance = Math.sqrt(
            Math.pow(targetPos.x - startPos.x, 2) + 
            Math.pow(targetPos.z - startPos.z, 2)
        );
        const duration = distance * 500; // 500ms per unit
        
        // Rotate to face target
        const angle = Math.atan2(
            targetPos.z - startPos.z,
            targetPos.x - startPos.x
        );
        
        this.vrm.scene.rotation.y = angle - Math.PI / 2;
        
        // Move to target
        new TWEEN.Tween(startPos, this.tweenGroup)
            .to(targetPos, duration)
            .easing(TWEEN.Easing.Linear.None)
            .onUpdate(() => {
                this.vrm.scene.position.set(startPos.x, startPos.y, startPos.z);
            })
            .onComplete(() => {
                this.isMoving = false;
            })
            .start();
    }
}

// Helper function to apply AI to offline avatar
export function applyAIBehavior(
    vrm: any, 
    behavior: string, 
    tweenGroup: any
): AvatarAI {
    const ai = new AvatarAI(vrm, behavior, tweenGroup);
    ai.start();
    return ai;
}