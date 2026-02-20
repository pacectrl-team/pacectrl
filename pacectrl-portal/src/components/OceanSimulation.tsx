"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Water } from "three/addons/objects/Water.js";
import { Sky, Text } from "@react-three/drei";

function Ocean() {
  const ref = useRef<any>(null);
  const gl = useThree((state) => state.gl);
  
  const waterNormals = useMemo(() => {
    const textureLoader = new THREE.TextureLoader();
    // Using a reliable public URL for the water normal map
    const texture = textureLoader.load("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg");
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  const water = useMemo(() => {
    return new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals,
      sunDirection: new THREE.Vector3(100, 20, 100).normalize(),
      sunColor: 0xffffff,
      waterColor: 0x004444, // Deep teal/ocean color
      distortionScale: 3.7,
      fog: true,
    });
  }, [waterNormals]);

  useFrame((state, delta) => {
    if (water.material.uniforms.time) {
      water.material.uniforms.time.value += delta * 0.5;
    }
  });

  return (
    <primitive object={water} rotation-x={-Math.PI / 2} />
  );
}

function Boat() {
  const boatRef = useRef<THREE.Group>(null);
  const { camera, pointer, raycaster } = useThree();
  const targetPosition = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (!boatRef.current) return;

    // 1. Raycast to find target position on the water plane (y=0)
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      targetPosition.current.copy(intersectPoint);
    }

    // 2. Move boat towards target
    const speed = 15.0; // units per second
    const currentPos = boatRef.current.position.clone();
    currentPos.y = 0; 
    
    const targetPos = targetPosition.current.clone();
    targetPos.y = 0;

    const direction = targetPos.sub(currentPos);
    const distance = direction.length();

    // Only move if we are far enough from the target
    if (distance > 2.0) {
      direction.normalize();
      
      // Acceleration/Deceleration based on distance
      const currentSpeed = Math.min(speed, distance * 1.2);
      const moveDist = currentSpeed * delta;
      
      boatRef.current.position.x += direction.x * moveDist;
      boatRef.current.position.z += direction.z * moveDist;

      // Rotate towards target smoothly
      const targetRotation = Math.atan2(direction.x, direction.z);
      const currentRotation = boatRef.current.rotation.y;
      
      // Handle angle wrap-around for smooth rotation
      let diff = targetRotation - currentRotation;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      
      boatRef.current.rotation.y += diff * 4 * delta;
      
      // Tilt based on turning (banking)
      boatRef.current.rotation.z = THREE.MathUtils.lerp(
        boatRef.current.rotation.z, 
        -diff * 0.4, 
        delta * 5
      );
    } else {
      // Level out when stopped
      boatRef.current.rotation.z = THREE.MathUtils.lerp(boatRef.current.rotation.z, 0, delta * 2);
    }

    // 3. Bobbing effect (waves)
    const time = state.clock.getElapsedTime();
    // Base height + bobbing
    boatRef.current.position.y = Math.sin(time * 2) * 0.15 - 0.1; 
    // Pitch (front/back tilt)
    boatRef.current.rotation.x = Math.sin(time * 2.5) * 0.05; 
  });

  return (
    <group ref={boatRef}>
      {/* Hull Base */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2, 0.8, 6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </mesh>
      {/* Bow */}
      <mesh position={[0, 0.4, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0, 1, 2, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </mesh>
      {/* Deck */}
      <mesh position={[0, 0.81, 0.5]}>
        <boxGeometry args={[1.9, 0.02, 4.9]} />
        <meshStandardMaterial color="#d4a373" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 1.3, -0.5]}>
        <boxGeometry args={[1.6, 1, 3]} />
        <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 1.85, -0.5]}>
        <boxGeometry args={[1.7, 0.1, 3.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
      </mesh>
      {/* Windows */}
      <mesh position={[0, 1.3, -0.5]}>
        <boxGeometry args={[1.65, 0.6, 2.8]} />
        <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
      </mesh>
      
      {/* Details - Radar/Antenna */}
      <mesh position={[0, 2.1, -1.5]}>
        <cylinderGeometry args={[0.05, 0.05, 0.5]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 2.35, -1.5]}>
        <boxGeometry args={[0.4, 0.05, 0.1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Details - Railings */}
      <mesh position={[0.9, 0.95, 0.5]}>
        <boxGeometry args={[0.05, 0.3, 4.8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[-0.9, 0.95, 0.5]}>
        <boxGeometry args={[0.05, 0.3, 4.8]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Wake/Trail effect (simple particle system placeholder) */}
      <mesh position={[0, 0.1, -3.5]}>
        <planeGeometry args={[1.5, 3]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      {/* Text - PaceCtrl (Starboard/Right side) */}
      <Text
        position={[1.01, 0.5, 0]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.3}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        PaceCtrl
      </Text>

      {/* Text - PaceCtrl (Port/Left side) */}
      <Text
        position={[-1.01, 0.5, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        fontSize={0.3}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
      >
        PaceCtrl
      </Text>
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame(() => {
    // Smoothly interpolate camera position based on mouse
    // Limit the movement to keep the ocean in view
    const targetX = mouse.x * 20;
    const targetY = Math.max(5, mouse.y * 10 + 15); // Keep camera above water
    
    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (targetY - camera.position.y) * 0.02;
    camera.position.z = 50; // Fixed distance
    
    camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function OceanSimulation({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 z-0 ${className}`}>
      <Canvas camera={{ position: [0, 15, 50], fov: 55, near: 1, far: 20000 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[100, 100, 50]} intensity={1} />
        <Ocean />
        <Boat />
        <Sky 
          sunPosition={[100, 20, 100]} 
          turbidity={0.1} 
          rayleigh={1.5} 
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
        <CameraController />
      </Canvas>
    </div>
  );
}
