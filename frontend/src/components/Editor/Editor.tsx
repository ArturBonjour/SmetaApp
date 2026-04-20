import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Group, Text } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../../store/editor';
import type { GeometryElement } from '../../types';
import { v4 as uuid } from 'uuid';
import ContextMenu from './ContextMenu';

const ELEMENT_COLORS: Record<string, string> = {
  wall:       '#334155',
  floor:      '#dbeafe',
  roof:       '#fef3c7',
  window:     '#bae6fd',
  door:       '#fecaca',
  foundation: '#d1fae5',
  room:       '#f0f9ff',
};

const ELEMENT_STROKE: Record<string, string> = {
  wall:       '#1e293b',
  floor:      '#3b82f6',
  roof:       '#f59e0b',
  window:     '#0ea5e9',
  door:       '#ef4444',
  foundation: '#10b981',
  room:       '#0ea5e9',
};

interface DrawingState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function snapToGrid(val: number, grid: number): number {
  return Math.round(val / grid) * grid;
}

// Transform a stage-container position to canvas (meter) position
function toWorld(x: number, y: number, offset: { x: number; y: number }, stageScale: number, scale: number) {
  const layerX = (x - offset.x) / stageScale;
  const layerY = (y - offset.y) / stageScale;
  return { x: layerX / scale, y: layerY / scale }; // returns meters
}

export default function Editor() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [drawing, setDrawing] = useState<DrawingState>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stageScale, setStageScale] = useState(1);
  const [stageOffset, setStageOffset] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);
  const { geometry, selectedId, tool, snapToGrid: snap, scale,
    setSelectedId, addElement, updateElement, removeElement, duplicateElement,
  } = useEditorStore();

  // Resize observer
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeElement(selectedId);
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setDrawing((d) => ({ ...d, active: false }));
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPanning(true);
      }
      if (e.key === '+' || e.key === '=') {
        setStageScale((s) => Math.min(s * 1.15, 8));
      }
      if (e.key === '-') {
        setStageScale((s) => Math.max(s / 1.15, 0.1));
      }
      if (e.key === '0') {
        setStageScale(1);
        setStageOffset({ x: 40, y: 40 });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsPanning(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, removeElement, setSelectedId]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = stageScale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(Math.max(newScale, 0.1), 8);

    const mousePointTo = {
      x: (pointer.x - stageOffset.x) / oldScale,
      y: (pointer.y - stageOffset.y) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    };
    setStageScale(clamped);
    setStageOffset(newPos);
  }, [stageScale, stageOffset]);

  const getWorldPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return toWorld(pointer.x, pointer.y, stageOffset, stageScale, scale); // returns meters
  }, [stageOffset, stageScale, scale]);

  const getSnappedWorldPos = useCallback(() => {
    const { x, y } = getWorldPos(); // meters
    if (!snap) return { x, y };
    const SNAP_STEP = 0.5; // snap to 0.5m grid
    return { x: Math.round(x / SNAP_STEP) * SNAP_STEP, y: Math.round(y / SNAP_STEP) * SNAP_STEP };
  }, [getWorldPos, snap]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Pan with space or middle mouse
    if (isPanning || e.evt.button === 1) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setPanStart({ x: pointer.x - stageOffset.x, y: pointer.y - stageOffset.y });
      setIsPanningActive(true);
      return;
    }
    if (tool === 'select') return;
    const { x, y } = getSnappedWorldPos();
    setDrawing({ active: true, startX: x, startY: y, currentX: x, currentY: y });
    e.cancelBubble = true;
  }, [tool, isPanning, stageOffset, getSnappedWorldPos]);

  const handleStageMouseMove = useCallback(() => {
    if (isPanningActive) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      setStageOffset({ x: pointer.x - panStart.x, y: pointer.y - panStart.y });
      return;
    }
    if (!drawing.active) return;
    const { x, y } = getSnappedWorldPos();
    setDrawing((d) => ({ ...d, currentX: x, currentY: y }));
  }, [isPanningActive, panStart, drawing.active, getSnappedWorldPos]);

  const handleStageMouseUp = useCallback(() => {
    if (isPanningActive) {
      setIsPanningActive(false);
      return;
    }
    if (!drawing.active) return;
    const { startX, startY, currentX, currentY } = drawing;
    setDrawing((d) => ({ ...d, active: false }));

    // startX/currentX are in METERS (returned by getSnappedWorldPos)
    const dx = currentX - startX; // meters
    const dy = currentY - startY; // meters
    const distM = Math.sqrt(dx * dx + dy * dy);
    if (distM < 0.1) return; // less than 10cm, ignore

    const id = uuid();
    const lengthM = parseFloat(distM.toFixed(2));
    const widthM = parseFloat(Math.abs(dx).toFixed(2));
    const depthM = parseFloat(Math.abs(dy).toFixed(2));
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);

    if (tool === 'wall') {
      addElement({
        id, type: 'wall',
        x1: startX, y1: startY, x2: currentX, y2: currentY,
        length: lengthM, height: 2.5, label: 'Стена',
      });
    } else if (tool === 'floor') {
      addElement({ id, type: 'floor', x: minX, y: minY, width: widthM, depth: depthM, label: 'Пол' });
    } else if (tool === 'roof') {
      addElement({ id, type: 'roof', x: minX, y: minY, width: widthM, depth: depthM, label: 'Кровля' });
    } else if (tool === 'foundation') {
      addElement({ id, type: 'foundation', x: minX, y: minY, width: widthM, depth: depthM, label: 'Фундамент' });
    }
  }, [isPanningActive, drawing, tool, scale, addElement]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning || isPanningActive) return;
    if (tool === 'select') {
      if (e.target === e.target.getStage()) setSelectedId(null);
      return;
    }
    if (tool === 'window' || tool === 'door') {
      const { x, y } = getSnappedWorldPos();
      const id = uuid();
      addElement({
        id, type: tool, x, y,
        label: tool === 'window' ? 'Окно' : 'Дверь',
      });
    }
  }, [tool, isPanning, isPanningActive, setSelectedId, getSnappedWorldPos, addElement]);

  const cursor = isPanning || isPanningActive ? (isPanningActive ? 'grabbing' : 'grab') : tool === 'select' ? 'default' : 'crosshair';

  // Grid lines (world coords × scale, then stage transforms handle the rest)
  const GRID_STEP = scale; // pixels per meter in world coords
  const gridLines = [];
  const worldLeft = Math.floor(-stageOffset.x / stageScale / GRID_STEP) - 2;
  const worldRight = Math.ceil((stageSize.width - stageOffset.x) / stageScale / GRID_STEP) + 2;
  const worldTop = Math.floor(-stageOffset.y / stageScale / GRID_STEP) - 2;
  const worldBottom = Math.ceil((stageSize.height - stageOffset.y) / stageScale / GRID_STEP) + 2;

  for (let i = worldLeft; i <= worldRight; i++) {
    const x = i * GRID_STEP;
    const isMajor = i % 5 === 0;
    gridLines.push(
      <Line
        key={`v${i}`}
        points={[x, worldTop * GRID_STEP, x, worldBottom * GRID_STEP]}
        stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={isMajor ? 0.8 : 0.5}
        opacity={0.7}
      />
    );
  }
  for (let j = worldTop; j <= worldBottom; j++) {
    const y = j * GRID_STEP;
    const isMajor = j % 5 === 0;
    gridLines.push(
      <Line
        key={`h${j}`}
        points={[worldLeft * GRID_STEP, y, worldRight * GRID_STEP, y]}
        stroke={isMajor ? '#cbd5e1' : '#e2e8f0'}
        strokeWidth={isMajor ? 0.8 : 0.5}
        opacity={0.7}
      />
    );
  }

  const zoomPercent = Math.round(stageScale * 100);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 dark:bg-[#0e1420] relative overflow-hidden select-none">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageOffset.x}
        y={stageOffset.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        style={{ cursor }}
      >
        {/* Grid */}
        <Layer listening={false}>{gridLines}</Layer>

        {/* Elements */}
        <Layer>
          {geometry.elements.map((el) => (
            <ElementRenderer
              key={el.id}
              el={el}
              scale={scale}
              selected={selectedId === el.id}
              onSelect={() => { if (tool === 'select') setSelectedId(el.id); }}
              onContextMenu={(e) => {
                e.evt.preventDefault();
                setSelectedId(el.id);
                setCtxMenu({ x: e.evt.clientX, y: e.evt.clientY, elementId: el.id });
              }}
              onUpdate={(updates) => updateElement(el.id, updates)}
              snap={snap}
              gridSize={scale}
            />
          ))}

          {/* Drawing preview */}
          {drawing.active && tool === 'wall' && (
            <>
              <Line
                points={[drawing.startX * scale, drawing.startY * scale, drawing.currentX * scale, drawing.currentY * scale]}
                stroke="#3b82f6"
                strokeWidth={6 / stageScale}
                lineCap="round"
                dash={[10 / stageScale, 5 / stageScale]}
              />
              {/* Live dimension label */}
              {(() => {
                const dx = drawing.currentX - drawing.startX;
                const dy = drawing.currentY - drawing.startY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len < 0.1) return null;
                const mx = ((drawing.startX + drawing.currentX) / 2) * scale;
                const my = ((drawing.startY + drawing.currentY) / 2) * scale;
                const fontSize = Math.max(8, Math.min(14, 13 / stageScale));
                return (
                  <Group x={mx} y={my - 18 / stageScale}>
                    <Rect x={-28 / stageScale} y={-8 / stageScale} width={56 / stageScale} height={16 / stageScale}
                      fill="#3b82f6" cornerRadius={4 / stageScale} />
                    <Text text={`${len.toFixed(2)}м`} x={-28 / stageScale} y={-7 / stageScale}
                      width={56 / stageScale} align="center" fontSize={fontSize} fill="white" fontStyle="bold" />
                  </Group>
                );
              })()}
            </>
          )}
          {drawing.active && (tool === 'floor' || tool === 'roof' || tool === 'foundation') && (
            <>
              <Rect
                x={Math.min(drawing.startX, drawing.currentX) * scale}
                y={Math.min(drawing.startY, drawing.currentY) * scale}
                width={Math.abs(drawing.currentX - drawing.startX) * scale}
                height={Math.abs(drawing.currentY - drawing.startY) * scale}
                fill={ELEMENT_COLORS[tool]}
                stroke="#3b82f6"
                strokeWidth={2 / stageScale}
                dash={[8 / stageScale, 4 / stageScale]}
                opacity={0.6}
              />
              {/* Live area label */}
              {(() => {
                const w = Math.abs(drawing.currentX - drawing.startX);
                const h = Math.abs(drawing.currentY - drawing.startY);
                if (w < 0.5 || h < 0.5) return null;
                const cx = ((drawing.startX + drawing.currentX) / 2) * scale;
                const cy = ((drawing.startY + drawing.currentY) / 2) * scale;
                const label = `${w.toFixed(1)}×${h.toFixed(1)} = ${(w * h).toFixed(1)}м²`;
                const fontSize = Math.max(8, Math.min(12, 11 / stageScale));
                return (
                  <Group x={cx} y={cy}>
                    <Rect x={-40 / stageScale} y={-10 / stageScale} width={80 / stageScale} height={20 / stageScale}
                      fill="rgba(59,130,246,0.85)" cornerRadius={4 / stageScale} />
                    <Text text={label} x={-40 / stageScale} y={-9 / stageScale}
                      width={80 / stageScale} align="center" fontSize={fontSize} fill="white" fontStyle="bold" />
                  </Group>
                );
              })()}
            </>
          )}
        </Layer>

        {/* Dimension labels */}
        <Layer listening={false}>
          {geometry.elements.map((el) => (
            <DimensionLabel key={`dim-${el.id}`} el={el} scale={scale} stageScale={stageScale} />
          ))}
        </Layer>
      </Stage>

      {/* Status bar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        {/* Minimap */}
        <Minimap
          elements={geometry.elements}
          scale={scale}
          stageSize={stageSize}
          stageOffset={stageOffset}
          stageScale={stageScale}
        />
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm font-mono">
          {zoomPercent}% · 1☐=1м
        </div>
      </div>

      {/* Quick stats bar – bottom left */}
      {geometry.elements.length > 0 && (
        <div className="absolute bottom-4 left-4 flex items-center gap-2 flex-wrap">
          {(() => {
            const walls = geometry.elements.filter((e) => e.type === 'wall');
            const totalWallLen = walls.reduce((s, e) => s + (e.length ?? 0), 0);
            const floors = geometry.elements.filter((e) => e.type === 'floor');
            const totalArea = floors.reduce((s, e) => s + (e.width ?? 0) * (e.depth ?? 0), 0);
            const roofs = geometry.elements.filter((e) => e.type === 'roof');
            const stats = [
              walls.length > 0 && `🧱 ${walls.length} ст · ${totalWallLen.toFixed(1)}м`,
              floors.length > 0 && `📐 ${totalArea.toFixed(1)}м² пол`,
              roofs.length > 0 && `🏠 кровля`,
            ].filter(Boolean);
            return stats.map((s, i) => (
              <div key={i} className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm">
                {s}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Context Menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          elementId={ctxMenu.elementId}
          onClose={() => setCtxMenu(null)}
          onDelete={(eid) => removeElement(eid)}
          onDuplicate={(eid) => duplicateElement(eid)}
          onRename={(eid) => {
            const newLabel = prompt('Новое название:');
            if (newLabel !== null) updateElement(eid, { label: newLabel });
          }}
          onBringForward={(eid) => {
            const els = useEditorStore.getState().geometry.elements;
            const idx = els.findIndex((e) => e.id === eid);
            if (idx < els.length - 1) {
              const next = [...els];
              [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
              useEditorStore.getState().setGeometry({ ...useEditorStore.getState().geometry, elements: next });
            }
          }}
          onSendBackward={(eid) => {
            const els = useEditorStore.getState().geometry.elements;
            const idx = els.findIndex((e) => e.id === eid);
            if (idx > 0) {
              const next = [...els];
              [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
              useEditorStore.getState().setGeometry({ ...useEditorStore.getState().geometry, elements: next });
            }
          }}
        />
      )}
    </div>
  );
}

/* ─── ElementRenderer ──────────────────────────────────────────────────── */
interface ElementRendererProps {
  el: GeometryElement;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onContextMenu: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onUpdate: (updates: Partial<GeometryElement>) => void;
  snap: boolean;
  gridSize: number;
}

function ElementRenderer({ el, scale, selected, onSelect, onContextMenu, onUpdate, snap, gridSize }: ElementRendererProps) {
  const color = ELEMENT_COLORS[el.type] || '#ccc';
  const stroke = ELEMENT_STROKE[el.type] || '#999';
  const strokeWidth = selected ? 2.5 : el.type === 'wall' ? 5 : 1.5;

  const snapVal = (v: number) => snap ? snapToGrid(v, gridSize) : v;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    if (el.type === 'wall') {
      const origX = (el.x1 ?? 0) * scale;
      const origY = (el.y1 ?? 0) * scale;
      const dx = e.target.x() - origX;
      const dy = e.target.y() - origY;
      const newX1 = snapVal((el.x1 ?? 0) * scale + dx) / scale;
      const newY1 = snapVal((el.y1 ?? 0) * scale + dy) / scale;
      const newX2 = snapVal((el.x2 ?? 0) * scale + dx) / scale;
      const newY2 = snapVal((el.y2 ?? 0) * scale + dy) / scale;
      const newLen = parseFloat(Math.sqrt((newX2 - newX1) ** 2 + (newY2 - newY1) ** 2).toFixed(2));
      onUpdate({ x1: newX1, y1: newY1, x2: newX2, y2: newY2, length: newLen });
      e.target.position({ x: newX1 * scale, y: newY1 * scale });
    } else {
      const nx = snapVal(e.target.x()) / scale;
      const ny = snapVal(e.target.y()) / scale;
      onUpdate({ x: nx, y: ny });
      e.target.position({ x: nx * scale, y: ny * scale });
    }
  };

  if (el.type === 'wall') {
    const x1 = (el.x1 ?? 0) * scale;
    const y1 = (el.y1 ?? 0) * scale;
    const x2 = (el.x2 ?? 0) * scale;
    const y2 = (el.y2 ?? 0) * scale;
    return (
      <>
        <Group draggable onDragEnd={handleDragEnd} x={x1} y={y1} onClick={onSelect} onContextMenu={onContextMenu}>
          <Line
            points={[0, 0, x2 - x1, y2 - y1]}
            stroke={selected ? '#3b82f6' : stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
            hitStrokeWidth={20}
          />
        </Group>
        {/* Endpoint drag handles – rendered as Layer siblings so they don't inherit Group position */}
        {selected && (
          <>
            <Circle
              x={x1} y={y1} radius={7}
              fill="#3b82f6" stroke="white" strokeWidth={2.5}
              draggable
              onDragMove={(e) => {
                const nx = snapVal(e.target.x()) / scale;
                const ny = snapVal(e.target.y()) / scale;
                const newLen = parseFloat(Math.sqrt((nx - (el.x2 ?? 0)) ** 2 + (ny - (el.y2 ?? 0)) ** 2).toFixed(2));
                onUpdate({ x1: nx, y1: ny, length: newLen });
              }}
              onDragEnd={(e) => {
                const nx = snapVal(e.target.x()) / scale;
                const ny = snapVal(e.target.y()) / scale;
                e.target.position({ x: nx * scale, y: ny * scale });
              }}
            />
            <Circle
              x={x2} y={y2} radius={7}
              fill="#3b82f6" stroke="white" strokeWidth={2.5}
              draggable
              onDragMove={(e) => {
                const nx = snapVal(e.target.x()) / scale;
                const ny = snapVal(e.target.y()) / scale;
                const newLen = parseFloat(Math.sqrt(((el.x1 ?? 0) - nx) ** 2 + ((el.y1 ?? 0) - ny) ** 2).toFixed(2));
                onUpdate({ x2: nx, y2: ny, length: newLen });
              }}
              onDragEnd={(e) => {
                const nx = snapVal(e.target.x()) / scale;
                const ny = snapVal(e.target.y()) / scale;
                e.target.position({ x: nx * scale, y: ny * scale });
              }}
            />
          </>
        )}
      </>
    );
  }

  if (el.type === 'window') {
    const cx = (el.x ?? 0) * scale;
    const cy = (el.y ?? 0) * scale;
    const W = 1.2 * scale;
    const H = 0.5 * scale;
    return (
      <Group draggable x={cx} y={cy} onDragEnd={handleDragEnd} onClick={onSelect} onContextMenu={onContextMenu}>
        <Rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#bae6fd" stroke={selected ? '#3b82f6' : '#0ea5e9'} strokeWidth={selected ? 2 : 1.5} cornerRadius={2} />
        <Line points={[0, -H / 2, 0, H / 2]} stroke="#0ea5e9" strokeWidth={1} />
        {selected && <Rect x={-W / 2 - 3} y={-H / 2 - 3} width={W + 6} height={H + 6} stroke="#3b82f6" strokeWidth={1.5} dash={[4, 2]} fill="transparent" />}
      </Group>
    );
  }

  if (el.type === 'door') {
    const cx = (el.x ?? 0) * scale;
    const cy = (el.y ?? 0) * scale;
    const W = 0.9 * scale;
    const H = 2.0 * scale;
    return (
      <Group draggable x={cx} y={cy} onDragEnd={handleDragEnd} onClick={onSelect} onContextMenu={onContextMenu}>
        <Rect x={-W / 2} y={-H / 2} width={W} height={H} fill="#fecaca" stroke={selected ? '#3b82f6' : '#ef4444'} strokeWidth={selected ? 2 : 1.5} cornerRadius={2} />
        {/* Door swing arc */}
        <ArcShape radius={H * 0.6} startAngle={-45} endAngle={45} stroke="#ef4444" strokeWidth={1} />
        {selected && <Rect x={-W / 2 - 3} y={-H / 2 - 3} width={W + 6} height={H + 6} stroke="#3b82f6" strokeWidth={1.5} dash={[4, 2]} fill="transparent" />}
      </Group>
    );
  }

  // Area elements: floor, roof, foundation
  const rx = (el.x ?? 0) * scale;
  const ry = (el.y ?? 0) * scale;
  const rw = (el.width ?? 0) * scale;
  const rh = (el.depth ?? 0) * scale;

  return (
    <Group draggable x={rx} y={ry} onDragEnd={handleDragEnd} onClick={onSelect} onContextMenu={onContextMenu}>
      <Rect
        width={rw} height={rh}
        fill={color}
        stroke={selected ? '#3b82f6' : stroke}
        strokeWidth={selected ? 2 : 1.5}
        opacity={0.75}
        cornerRadius={2}
        dash={el.type === 'roof' ? [8, 4] : undefined}
      />
      {el.type === 'roof' && rw > 0 && rh > 0 && (
        <Line
          points={[rw / 2, 0, 0, rh / 2, rw / 2, rh, rw, rh / 2, rw / 2, 0]}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.4}
        />
      )}
    </Group>
  );
}

function ArcShape({ radius, startAngle, endAngle, stroke, strokeWidth }: {
  radius: number; startAngle: number; endAngle: number; stroke: string; strokeWidth: number;
}) {
  const pts: number[] = [];
  for (let a = startAngle; a <= endAngle; a += 5) {
    const rad = (a * Math.PI) / 180;
    pts.push(Math.cos(rad) * radius, Math.sin(rad) * radius);
  }
  return <Line points={pts} stroke={stroke} strokeWidth={strokeWidth} dash={[3, 2]} />;
}

function DimensionLabel({ el, scale, stageScale }: { el: GeometryElement; scale: number; stageScale: number }) {
  const fontSize = Math.max(8, Math.min(14, 11 / stageScale));
  if (el.type === 'wall' && el.length) {
    const mx = ((el.x1! + el.x2!) / 2) * scale;
    const my = ((el.y1! + el.y2!) / 2) * scale;
    return <Text x={mx - 20} y={my - 14} text={`${el.length}м`} fontSize={fontSize} fill="#64748b" />;
  }
  if ((el.type === 'floor' || el.type === 'foundation') && el.width && el.depth) {
    const cx = (el.x! + el.width / 2) * scale;
    const cy = (el.y! + el.depth / 2) * scale;
    return <Text x={cx - 30} y={cy - 8} text={`${el.width}×${el.depth}м`} fontSize={fontSize} fill="#475569" align="center" />;
  }
  return null;
}

/* ─── Minimap ──────────────────────────────────────────────────────────── */
interface MinimapProps {
  elements: GeometryElement[];
  scale: number;
  stageSize: { width: number; height: number };
  stageOffset: { x: number; y: number };
  stageScale: number;
}

function Minimap({ elements, scale, stageSize, stageOffset, stageScale }: MinimapProps) {
  if (elements.length === 0) return null;

  const W = 140;
  const H = 100;

  // Find bounding box in world coords
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    if (el.type === 'wall') {
      minX = Math.min(minX, el.x1! * scale, el.x2! * scale);
      minY = Math.min(minY, el.y1! * scale, el.y2! * scale);
      maxX = Math.max(maxX, el.x1! * scale, el.x2! * scale);
      maxY = Math.max(maxY, el.y1! * scale, el.y2! * scale);
    } else {
      const x = (el.x ?? 0) * scale;
      const y = (el.y ?? 0) * scale;
      const w = (el.width ?? 0.5) * scale;
      const h = (el.depth ?? 0.5) * scale;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  }

  const pad = 8;
  const boundsW = maxX - minX || 1;
  const boundsH = maxY - minY || 1;
  const mapScale = Math.min((W - pad * 2) / boundsW, (H - pad * 2) / boundsH);

  const toMap = (wx: number, wy: number) => ({
    x: pad + (wx - minX) * mapScale,
    y: pad + (wy - minY) * mapScale,
  });

  // Viewport rect in world coords
  const vpX = -stageOffset.x / stageScale;
  const vpY = -stageOffset.y / stageScale;
  const vpW = stageSize.width / stageScale;
  const vpH = stageSize.height / stageScale;

  const vp = {
    x: pad + (vpX - minX) * mapScale,
    y: pad + (vpY - minY) * mapScale,
    w: vpW * mapScale,
    h: vpH * mapScale,
  };

  const COLORS: Record<string, string> = {
    wall: '#334155', floor: '#93c5fd', roof: '#fbbf24',
    window: '#38bdf8', door: '#f87171', foundation: '#34d399',
  };

  return (
    <div
      className="bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
      style={{ width: W, height: H }}
    >
      <svg width={W} height={H}>
        {elements.map((el) => {
          const c = COLORS[el.type] || '#94a3b8';
          if (el.type === 'wall') {
            const p1 = toMap(el.x1! * scale, el.y1! * scale);
            const p2 = toMap(el.x2! * scale, el.y2! * scale);
            return <line key={el.id} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={c} strokeWidth={2} strokeLinecap="round" />;
          }
          const x = (el.x ?? 0) * scale;
          const y = (el.y ?? 0) * scale;
          const w = (el.width ?? 0.5) * scale;
          const h = (el.depth ?? 0.5) * scale;
          const m = toMap(x, y);
          return (
            <rect key={el.id} x={m.x} y={m.y} width={Math.max(2, w * mapScale)} height={Math.max(2, h * mapScale)}
              fill={c} fillOpacity={0.5} stroke={c} strokeWidth={0.5} />
          );
        })}
        {/* Viewport indicator */}
        <rect
          x={Math.max(0, vp.x)} y={Math.max(0, vp.y)}
          width={Math.min(W, vp.w)} height={Math.min(H, vp.h)}
          fill="rgba(59,130,246,0.1)" stroke="#3b82f6" strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
