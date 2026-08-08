import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// 1. Particle Travelling Component
function DataParticle({ start, end, speed = 0.5, delay = 0 }) {
  const meshRef = useRef();
  let progress = delay;

  useFrame((state, delta) => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      if (meshRef.current) meshRef.current.position.copy(start);
      return;
    }

    progress += delta * speed;
    if (progress > 1) progress = 0;

    if (meshRef.current) {
      // Linear interpolation between start and end positions
      meshRef.current.position.lerpVectors(start, end, progress);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshBasicMaterial color="#06b6d4" />
    </mesh>
  );
}

// 2. Connector Line Component
function ConnectorLine({ start, end }) {
  const points = [start, end];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color="rgba(255, 255, 255, 0.15)" linewidth={1} />
    </line>
  );
}

// 3. Floating Node Component
function InteractiveNode({ position, title, subtitle, color, onHover }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !meshRef.current) return;

    // Gentle floating animation
    const t = state.clock.getElapsedTime();
    meshRef.current.position.y = position[1] + Math.sin(t + position[0]) * 0.12;
  });

  const scale = hovered ? 1.25 : 1;

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={[scale, scale, scale]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover({ title, subtitle });
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
      }}
    >
      <sphereGeometry args={[0.3, 32, 32]} />
      <meshStandardMaterial
        color={hovered ? '#ffffff' : color}
        emissive={hovered ? '#ffffff' : color}
        emissiveIntensity={hovered ? 0.8 : 0.25}
        roughness={0.2}
      />
      <Html distanceFactor={6} position={[0, 0.5, 0]} center>
        <div 
          style={{
            background: 'rgba(19, 26, 44, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '4px 10px',
            borderRadius: '6px',
            color: '#fff',
            fontFamily: 'sans-serif',
            fontSize: '0.65rem',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {title}
        </div>
      </Html>
    </mesh>
  );
}

// 4. Main 3D Interactive Group
function SceneGroup({ onHoverDescription }) {
  const groupRef = useRef();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) - 0.5;
      mouse.current.y = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !groupRef.current) return;

    // Slow auto-rotation
    groupRef.current.rotation.y += 0.003;

    // Gentle mouse parallax
    groupRef.current.rotation.x += (mouse.current.y * 0.15 - groupRef.current.rotation.x) * 0.05;
    groupRef.current.rotation.y += (mouse.current.x * 0.15 - groupRef.current.rotation.y) * 0.05;
  });

  // Vector definitions
  const hubPos = new THREE.Vector3(0, 0, 0);
  const custPos = new THREE.Vector3(-2.2, 1.3, 0);
  const invPos = new THREE.Vector3(-2.2, -1.3, 0);
  const salesPos = new THREE.Vector3(2.4, 0, 0);

  return (
    <group ref={groupRef}>
      {/* Central Hub */}
      <mesh position={hubPos}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color="#4f46e5" 
          emissive="#4f46e5" 
          emissiveIntensity={0.3} 
          roughness={0.1}
        />
        <Html distanceFactor={6} position={[0, -0.75, 0]} center>
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.9) 0%, rgba(6, 182, 212, 0.9) 100%)',
              padding: '6px 12px',
              borderRadius: '8px',
              color: '#fff',
              fontFamily: 'sans-serif',
              fontSize: '0.7rem',
              fontWeight: '700',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)'
            }}
          >
            OPERATIONS HUB
          </div>
        </Html>
      </mesh>

      {/* Decorative Outer Rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 0.83, 64]} />
        <meshBasicMaterial color="rgba(79, 70, 229, 0.25)" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[1.1, 1.12, 64]} />
        <meshBasicMaterial color="rgba(6, 182, 212, 0.15)" side={THREE.DoubleSide} />
      </mesh>

      {/* Nodes */}
      <InteractiveNode 
        position={[-2.2, 1.3, 0]} 
        title="Customers CRM" 
        subtitle="Manage leads, customers and follow-ups."
        color="#06b6d4" 
        onHover={onHoverDescription}
      />
      <InteractiveNode 
        position={[-2.2, -1.3, 0]} 
        title="Inventory Control" 
        subtitle="Track products, stock levels and movements."
        color="#10b981" 
        onHover={onHoverDescription}
      />
      <InteractiveNode 
        position={[2.4, 0, 0]} 
        title="Sales Challans" 
        subtitle="Create and confirm sales challans."
        color="#f59e0b" 
        onHover={onHoverDescription}
      />

      {/* Connections lines */}
      <ConnectorLine start={custPos} end={hubPos} />
      <ConnectorLine start={invPos} end={hubPos} />
      <ConnectorLine start={salesPos} end={hubPos} />

      {/* Connection travelling particles */}
      <DataParticle start={custPos} end={hubPos} speed={0.4} delay={0} />
      <DataParticle start={custPos} end={hubPos} speed={0.4} delay={0.5} />
      
      <DataParticle start={hubPos} end={invPos} speed={0.35} delay={0.2} />
      
      <DataParticle start={hubPos} end={salesPos} speed={0.45} delay={0.1} />
      <DataParticle start={hubPos} end={salesPos} speed={0.45} delay={0.6} />
    </group>
  );
}

// 5. Main Canvas Scene Export
export default function ThreeScene() {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [webglSupported, setWebglSupported] = useState(true);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const supported = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      setWebglSupported(supported);
    } catch {
      setWebglSupported(false);
    }
  }, []);

  if (!webglSupported) {
    // Elegant fallback HTML illustration
    return (
      <div 
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(19,26,44,0.3)',
          border: '1px solid var(--border-glass)',
          borderRadius: '20px',
          padding: '24px'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 15px rgba(79, 70, 229, 0.4))' }}>🛰️</div>
          <h4 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Integrated ERP Network</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            A unified operations hub dynamically linking your Customer CRM, Product Catalog, Inventory Safety Bounds, and Sales Challans in one transactional relational database.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, -5, 5]} intensity={0.5} />
        <SceneGroup onHoverDescription={setHoveredNode} />
      </Canvas>

      {/* Description Overlay Pane */}
      {hoveredNode && (
        <div 
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(19, 26, 44, 0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            textAlign: 'center',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out',
            width: '90%',
            maxWidth: '340px',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', textTransform: 'uppercase', marginBottom: '4px' }}>
            {hoveredNode.title}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: '1.4' }}>
            {hoveredNode.subtitle}
          </div>
        </div>
      )}
    </div>
  );
}
