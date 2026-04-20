import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Text, PerspectiveCamera } from '@react-three/drei';
import type { GeometryElement } from '../../types';

// --- Element colours matching 2D ---
const MATERIALS = {
  wall:       { color: '#334155', emissive: '#000000' },
  floor:      { color: '#bfdbfe', emissive: '#1e3a5f' },
  roof:       { color: '#fde68a', emissive: '#78350f' },
  foundation: { color: '#a7f3d0', emissive: '#064e3b' },
  window:     { color: '#7dd3fc', emissive: '#075985', transparent: true, opacity: 0.7 },
  door:       { color: '#fca5a5', emissive: '#7f1d1d' },
};

// Placeholder for future auto-rotate animation
function AutoRotateCamera() {
  return null;
}

// --- Wall as a box ---
function WallMesh({ el }: { el: GeometryElement }) {
  if (el.x1 === undefined || el.y1 === undefined || el.x2 === undefined || el.y2 === undefined) return null;
  const dx = (el.x2 ?? 0) - (el.x1 ?? 0);
  const dy = (el.y2 ?? 0) - (el.y1 ?? 0);
  const length = Math.sqrt(dx * dx + dy * dy);
  const height = el.height ?? 2.5;
  const thickness = 0.2;
  const angle = Math.atan2(dy, dx);

  // Center of wall
  const cx = ((el.x1 ?? 0) + (el.x2 ?? 0)) / 2;
  const cz = ((el.y1 ?? 0) + (el.y2 ?? 0)) / 2;

  const mat = MATERIALS.wall;

  return (
    <group position={[cx, height / 2, cz]} rotation={[0, -angle, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, height, thickness]} />
        <meshStandardMaterial color={mat.color} roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Wall label */}
      {length > 0.5 && (
        <Text
          position={[0, height / 2 + 0.25, 0]}
          fontSize={0.25}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          rotation={[0, 0, 0]}
        >
          {`${length.toFixed(1)}м`}
        </Text>
      )}
    </group>
  );
}

// --- Floor as a flat plane ---
function FloorMesh({ el }: { el: GeometryElement }) {
  const w = el.width ?? 0;
  const d = el.depth ?? 0;
  if (w < 0.1 || d < 0.1) return null;
  const cx = (el.x ?? 0) + w / 2;
  const cz = (el.y ?? 0) + d / 2;
  const mat = MATERIALS.floor;

  return (
    <mesh position={[cx, 0.01, cz]} receiveShadow>
      <boxGeometry args={[w, 0.08, d]} />
      <meshStandardMaterial color={mat.color} roughness={0.8} metalness={0} />
    </mesh>
  );
}

// --- Foundation ---
function FoundationMesh({ el }: { el: GeometryElement }) {
  const w = el.width ?? 0;
  const d = el.depth ?? 0;
  if (w < 0.1 || d < 0.1) return null;
  const cx = (el.x ?? 0) + w / 2;
  const cz = (el.y ?? 0) + d / 2;
  const mat = MATERIALS.foundation;

  return (
    <mesh position={[cx, -0.2, cz]} receiveShadow>
      <boxGeometry args={[w + 0.4, 0.4, d + 0.4]} />
      <meshStandardMaterial color={mat.color} roughness={0.9} />
    </mesh>
  );
}

// --- Roof as a flat top with slight pitch simulation ---
function RoofMesh({ el }: { el: GeometryElement }) {
  const w = el.width ?? 0;
  const d = el.depth ?? 0;
  if (w < 0.1 || d < 0.1) return null;
  const cx = (el.x ?? 0) + w / 2;
  const cz = (el.y ?? 0) + d / 2;

  // Compute approximate roof height from geometry
  const wallHeight = 2.5; // default
  const ridgeHeight = 1.2;

  // Simple gabled roof using two boxes tilted
  const halfW = w / 2;
  const slope = Math.atan2(ridgeHeight, halfW);
  const panelLength = Math.sqrt(halfW * halfW + ridgeHeight * ridgeHeight);
  const thickness = 0.12;

  const mat = MATERIALS.roof;

  return (
    <group position={[cx, wallHeight, cz]}>
      {/* Left panel */}
      <mesh
        position={[-halfW / 2, ridgeHeight / 2, 0]}
        rotation={[0, 0, slope]}
        castShadow
      >
        <boxGeometry args={[panelLength, thickness, d]} />
        <meshStandardMaterial color={mat.color} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Right panel */}
      <mesh
        position={[halfW / 2, ridgeHeight / 2, 0]}
        rotation={[0, 0, -slope]}
        castShadow
      >
        <boxGeometry args={[panelLength, thickness, d]} />
        <meshStandardMaterial color={mat.color} roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

// --- Window as colored slab on a wall approximation ---
function WindowMesh({ el }: { el: GeometryElement }) {
  const x = el.x ?? 0;
  const z = el.y ?? 0;
  const mat = MATERIALS.window;

  return (
    <mesh position={[x, 1.2, z]} castShadow>
      <boxGeometry args={[1.0, 1.0, 0.08]} />
      <meshStandardMaterial color={mat.color} transparent opacity={0.7} roughness={0.05} metalness={0.3} />
    </mesh>
  );
}

// --- Door ---
function DoorMesh({ el }: { el: GeometryElement }) {
  const x = el.x ?? 0;
  const z = el.y ?? 0;
  const mat = MATERIALS.door;

  return (
    <mesh position={[x, 1.1, z]} castShadow>
      <boxGeometry args={[0.9, 2.2, 0.08]} />
      <meshStandardMaterial color={mat.color} roughness={0.7} />
    </mesh>
  );
}

// --- Ground plane ---
function Ground({ size }: { size: number }) {
  return (
    <mesh position={[size / 2, -0.01, size / 2]} receiveShadow>
      <boxGeometry args={[size * 4, 0.1, size * 4]} />
      <meshStandardMaterial color="#c8d6b0" roughness={0.95} metalness={0} />
    </mesh>
  );
}

// --- Scene ---
function Scene({ elements, buildingSize }: { elements: GeometryElement[]; buildingSize: number }) {
  return (
    <>
      <AutoRotateCamera />

      {/* Sky / Fog */}
      <color attach="background" args={['#b8d4e8']} />
      <fog attach="fog" args={['#b8d4e8', buildingSize * 4, buildingSize * 20]} />

      {/* Lighting */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[buildingSize * 2, buildingSize * 3, buildingSize * 2]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-camera-left={-buildingSize * 2}
        shadow-camera-right={buildingSize * 2}
        shadow-camera-top={buildingSize * 2}
        shadow-camera-bottom={-buildingSize * 2}
      />
      <hemisphereLight args={['#b8d4e8', '#c8d6b0', 0.4]} />
      <pointLight position={[-buildingSize, buildingSize * 2, -buildingSize]} intensity={0.3} color="#a5b4fc" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Ground */}
      <Ground size={buildingSize} />

      {/* Grid */}
      <Grid
        args={[buildingSize * 4, buildingSize * 4]}
        position={[buildingSize / 2, 0.06, buildingSize / 2]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#8aad6e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#6a9a50"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
      />

      {/* Building elements */}
      {elements.map((el) => {
        switch (el.type) {
          case 'wall':       return <WallMesh key={el.id} el={el} />;
          case 'floor':      return <FloorMesh key={el.id} el={el} />;
          case 'roof':       return <RoofMesh key={el.id} el={el} />;
          case 'foundation': return <FoundationMesh key={el.id} el={el} />;
          case 'window':     return <WindowMesh key={el.id} el={el} />;
          case 'door':       return <DoorMesh key={el.id} el={el} />;
          default:           return null;
        }
      })}
    </>
  );
}

// --- Loading fallback ---
function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
      <div className="text-center text-white">
        <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm opacity-70">Загрузка 3D...</div>
      </div>
    </div>
  );
}

// --- Main exported component ---
interface Props {
  elements: GeometryElement[];
  buildingWidth?: number;
  buildingDepth?: number;
}

export default function View3D({ elements, buildingWidth = 10, buildingDepth = 8 }: Props) {
  const buildingSize = Math.max(buildingWidth, buildingDepth);
  const camX = buildingWidth / 2;
  const camZ = buildingDepth / 2;
  const camDist = buildingSize * 1.5 + 6;

  return (
    <div className="w-full h-full bg-[#b8d4e8] relative">
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-2.5 text-xs text-slate-700 dark:text-white/80 space-y-1 shadow-lg border border-white/50">
        <div className="font-semibold text-slate-900 dark:text-white mb-1.5">Условные обозначения</div>
        {[
          { color: '#334155', label: 'Стены' },
          { color: '#bfdbfe', label: 'Пол' },
          { color: '#fde68a', label: 'Кровля' },
          { color: '#a7f3d0', label: 'Фундамент' },
          { color: '#7dd3fc', label: 'Окна' },
          { color: '#fca5a5', label: 'Двери' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded border border-black/10" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute top-3 right-3 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-xl p-2.5 text-xs text-slate-600 dark:text-white/70 space-y-0.5 shadow-lg border border-white/50">
        <div className="text-slate-900 dark:text-white/90 font-semibold mb-1">Управление</div>
        <div>🖱 ЛКМ — вращение</div>
        <div>🖱 ПКМ — перемещение</div>
        <div>🖱 Колесо — масштаб</div>
      </div>

      {elements.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div className="text-slate-500">
            <div className="text-5xl mb-4">🏗</div>
            <div className="text-lg font-medium mb-1 text-slate-700">3D вид пуст</div>
            <div className="text-sm text-slate-500">Добавьте элементы в 2D редакторе,<br />чтобы увидеть здание здесь</div>
          </div>
        </div>
      ) : (
        <Suspense fallback={<Loader />}>
          <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
            <PerspectiveCamera
              makeDefault
              position={[camX + camDist * 0.7, camDist * 0.6, camZ + camDist * 0.7]}
              fov={50}
              near={0.1}
              far={500}
            />
            <OrbitControls
              target={[camX, 1.5, camZ]}
              minDistance={3}
              maxDistance={120}
              maxPolarAngle={Math.PI / 2 - 0.05}
              enableDamping
              dampingFactor={0.08}
            />
            <Scene elements={elements} buildingSize={buildingSize} />
          </Canvas>
        </Suspense>
      )}
    </div>
  );
}
