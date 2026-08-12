'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Scene constants ──────────────────────────────────────────────────────────

const DOOR = { w: 3.8, h: 8.2, d: 0.63 };

// Maximum space on the door that the magnet grid can use
const MAX_GRID = { w: 1.5, h: 3.8 };
const MAGNET_GAP = 0.01;
const MAGNET_DEPTH = 0.038;
const MAX_SINGLE_SIZE = 1.55; // cap for 1×1 so it doesn't fill the whole door

// ─── UV tile helpers ──────────────────────────────────────────────────────────

function magnetSize(rows: number, cols: number): number {
  const byW = (MAX_GRID.w - MAGNET_GAP * (cols - 1)) / cols;
  const byH = (MAX_GRID.h - MAGNET_GAP * (rows - 1)) / rows;
  return Math.min(byW, byH, MAX_SINGLE_SIZE);
}

// ─── Individual magnet ────────────────────────────────────────────────────────

interface MagnetProps {
  baseTexture: THREE.Texture | null;
  r: number;
  c: number;
  rows: number;
  cols: number;
  size: number;
  x: number;
  y: number;
}

function Magnet({ baseTexture, r, c, rows, cols, size, x, y }: MagnetProps) {
  const z = DOOR.d / 2 + MAGNET_DEPTH / 2 + 0.002;

  // Front face material — UV-sliced from base texture
  const [frontMat, setFrontMat] = useState<THREE.MeshStandardMaterial>(() =>
    new THREE.MeshStandardMaterial({ color: '#DEDEDE', roughness: 0.35, metalness: 0 }),
  );

  useEffect(() => {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.0 });
    if (baseTexture) {
      const t = baseTexture.clone();
      // UV math: flipY=true is default, so V=1 is top of image
      t.repeat.set(1 / cols, 1 / rows);
      t.offset.set(c / cols, (rows - 1 - r) / rows);
      t.needsUpdate = true;
      mat.map = t;
      mat.color.set(0xffffff);
    } else {
      mat.color.set('#DEDEDE');
    }
    setFrontMat(prev => {
      if (prev.map) prev.map.dispose();
      prev.dispose();
      return mat;
    });
    return () => {
      if (mat.map) mat.map.dispose();
      mat.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTexture, r, c, rows, cols]);

  const edgeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#ADADAD', roughness: 0.45, metalness: 0.08 }),
    [],
  );

  // BoxGeometry face order: +X,-X,+Y,-Y,+Z(front),-Z(back)
  const mats = useMemo(
    () => [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, edgeMat],
    [edgeMat, frontMat],
  );

  return (
    <mesh position={[x, y, z]} material={mats} castShadow>
      <boxGeometry args={[size, size, MAGNET_DEPTH]} />
    </mesh>
  );
}

// ─── Magnet grid ──────────────────────────────────────────────────────────────

function MagnetGrid({
  baseTexture,
  rows,
  cols,
}: {
  baseTexture: THREE.Texture | null;
  rows: number;
  cols: number;
}) {
  const ms = magnetSize(rows, cols);
  const gridW = cols * ms + (cols - 1) * MAGNET_GAP;
  const gridH = rows * ms + (rows - 1) * MAGNET_GAP;
  const startX = -gridW / 2 + ms / 2;
  const startY = gridH / 2 - ms / 2;

  return (
    // Shift grid slightly above door centre — magnets look natural when not perfectly centred
    <group position={[0, 0.5, 0]}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <Magnet
            key={`${r}-${c}`}
            baseTexture={baseTexture}
            r={r} c={c} rows={rows} cols={cols}
            size={ms}
            x={startX + c * (ms + MAGNET_GAP)}
            y={startY - r * (ms + MAGNET_GAP)}
          />
        )),
      )}
    </group>
  );
}

// ─── Fridge door ──────────────────────────────────────────────────────────────

function FridgeDoor() {
  const doorMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#EFF2F5', roughness: 0.1, metalness: 0.1 }),
    [],
  );
  const rimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#C8CDD3', roughness: 0.3, metalness: 0.18 }),
    [],
  );
  const handleMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#8A98AC', roughness: 0.08, metalness: 0.85 }),
    [],
  );

  const HANDLE_X = DOOR.w / 2 - 0.2;
  const HANDLE_Z = DOOR.d / 2 + 0.1;
  const BRACKET_W = 0.22;
  const BRACKET_H = 0.09;
  const BRACKET_D = 0.15;

  return (
    <group>
      {/* Main door panel */}
      <mesh material={doorMat} receiveShadow>
        <boxGeometry args={[DOOR.w, DOOR.h, DOOR.d]} />
      </mesh>

      {/* Top rim strip */}
      <mesh material={rimMat} position={[0, DOOR.h / 2 + 0.025, DOOR.d / 4]}>
        <boxGeometry args={[DOOR.w, 0.05, DOOR.d / 2]} />
      </mesh>
      {/* Bottom rim strip */}
      <mesh material={rimMat} position={[0, -(DOOR.h / 2 + 0.025), DOOR.d / 4]}>
        <boxGeometry args={[DOOR.w, 0.05, DOOR.d / 2]} />
      </mesh>

      {/* Handle bar */}
      <mesh material={handleMat} position={[HANDLE_X, 0, HANDLE_Z]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.055, 2.4, 24]} />
      </mesh>
      {/* Top bracket */}
      <mesh material={handleMat} position={[HANDLE_X - 0.02, 1.2, HANDLE_Z - 0.06]} castShadow>
        <boxGeometry args={[BRACKET_W, BRACKET_H, BRACKET_D]} />
      </mesh>
      {/* Bottom bracket */}
      <mesh material={handleMat} position={[HANDLE_X - 0.02, -1.2, HANDLE_Z - 0.06]} castShadow>
        <boxGeometry args={[BRACKET_W, BRACKET_H, BRACKET_D]} />
      </mesh>
    </group>
  );
}

// ─── Gentle camera sway ───────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta * 0.28;
    camera.position.x = Math.sin(t.current) * 0.28;
    camera.position.y = 0.35 + Math.sin(t.current * 0.65 + 0.8) * 0.1;
    camera.lookAt(0, 0.25, 0);
  });
  return null;
}

// ─── Full scene ───────────────────────────────────────────────────────────────

function Scene({
  textureUrl,
  rows,
  cols,
}: {
  textureUrl: string | null;
  rows: number;
  cols: number;
}) {
  const [baseTexture, setBaseTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!textureUrl) {
      setBaseTexture(prev => {
        prev?.dispose();
        return null;
      });
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(textureUrl, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      setBaseTexture(prev => {
        prev?.dispose();
        return tex;
      });
    });
  }, [textureUrl]);

  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.6} color="#FFF8F4" />

      {/* Key light — upper front-right, warm */}
      <directionalLight
        position={[4, 9, 6]}
        intensity={2.0}
        color="#FFF5EE"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Fill — cool blue from left */}
      <directionalLight position={[-5, 2, 5]} intensity={0.5} color="#C8D8FF" />
      {/* Rim — subtle warm from below */}
      <directionalLight position={[0, -4, 3]} intensity={0.28} color="#FFE4CC" />
      {/* Point light near magnets so they pop */}
      <pointLight position={[0, 0.5, 5]} intensity={0.5} color="#FFFAF5" decay={2} />

      <FridgeDoor />
      <MagnetGrid baseTexture={baseTexture} rows={rows} cols={cols} />
      <CameraRig />
    </>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface FridgePreview3DProps {
  textureUrl: string | null;
  rows: number;
  cols: number;
  sizeMm?: number;
  canvasSize?: number;
}

export default function FridgePreview3D({
  textureUrl,
  rows,
  cols,
  canvasSize = 360,
}: FridgePreview3DProps) {
  return (
    <div
      className="rounded-[18px] overflow-hidden"
      style={{
        width: '100%',
        maxWidth: canvasSize,
        aspectRatio: '1 / 1',
      }}
    >
      <Canvas
        shadows
        camera={{ fov: 48, position: [0, 0.35, 8.8], near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene textureUrl={textureUrl} rows={rows} cols={cols} />
      </Canvas>
    </div>
  );
}
