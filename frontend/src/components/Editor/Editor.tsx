import { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Line, Rect, Circle, Group, Text } from 'react-konva';
import Konva from 'konva';
import { useEditorStore } from '../../store/editor';
import type { GeometryElement } from '../../types';
import { v4 as uuid } from 'uuid';

const ELEMENT_COLORS: Record<string, string> = {
  wall: '#1e293b',
  floor: '#dbeafe',
  roof: '#fef3c7',
  window: '#93c5fd',
  door: '#fca5a5',
  foundation: '#d1fae5',
  room: '#f0f9ff',
};

const ELEMENT_STROKE: Record<string, string> = {
  wall: '#1e293b',
  floor: '#3b82f6',
  roof: '#f59e0b',
  window: '#2563eb',
  door: '#dc2626',
  foundation: '#059669',
  room: '#0ea5e9',
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

function pxToM(px: number, scale: number): number {
  return parseFloat((px / scale).toFixed(2));
}

export default function Editor() {
  const stageRef = useRef<Konva.Stage>(null);
  const { geometry, selectedId, tool, snapToGrid: snap, scale, setSelectedId, addElement, updateElement, removeElement } = useEditorStore();
  const [drawing, setDrawing] = useState<DrawingState>({ active: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

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
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        removeElement(selectedId);
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        setDrawing(d => ({ ...d, active: false }));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId, removeElement, setSelectedId]);

  const getSnappedPos = useCallback((x: number, y: number) => {
    if (!snap) return { x, y };
    return { x: snapToGrid(x, scale), y: snapToGrid(y, scale) };
  }, [snap, scale]);

  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const { x, y } = getSnappedPos(pos.x, pos.y);
    setDrawing({ active: true, startX: x, startY: y, currentX: x, currentY: y });
    e.cancelBubble = true;
  }, [tool, getSnappedPos]);

  const handleStageMouseMove = useCallback(() => {
    if (!drawing.active) return;
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const { x, y } = getSnappedPos(pos.x, pos.y);
    setDrawing(d => ({ ...d, currentX: x, currentY: y }));
  }, [drawing.active, getSnappedPos]);

  const handleStageMouseUp = useCallback(() => {
    if (!drawing.active) return;
    const { startX, startY, currentX, currentY } = drawing;
    setDrawing(d => ({ ...d, active: false }));

    const dx = currentX - startX;
    const dy = currentY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) return; // too small

    const id = uuid();
    const lengthM = pxToM(Math.sqrt(dx * dx + dy * dy), scale);
    const widthM = pxToM(Math.abs(dx), scale);
    const depthM = pxToM(Math.abs(dy), scale);
    const minX = Math.min(startX, currentX);
    const minY = Math.min(startY, currentY);

    if (tool === 'wall') {
      const el: GeometryElement = {
        id, type: 'wall',
        x1: pxToM(startX, scale), y1: pxToM(startY, scale),
        x2: pxToM(currentX, scale), y2: pxToM(currentY, scale),
        length: lengthM, height: 2.5,
        label: 'Стена',
      };
      addElement(el);
    } else if (tool === 'floor') {
      const el: GeometryElement = {
        id, type: 'floor',
        x: pxToM(minX, scale), y: pxToM(minY, scale),
        width: widthM, depth: depthM,
        label: 'Пол',
      };
      addElement(el);
    } else if (tool === 'roof') {
      const el: GeometryElement = {
        id, type: 'roof',
        x: pxToM(minX, scale), y: pxToM(minY, scale),
        width: widthM, depth: depthM,
        label: 'Кровля',
      };
      addElement(el);
    } else if (tool === 'foundation') {
      const el: GeometryElement = {
        id, type: 'foundation',
        x: pxToM(minX, scale), y: pxToM(minY, scale),
        width: widthM, depth: depthM,
        label: 'Фундамент',
      };
      addElement(el);
    }
  }, [drawing, tool, scale, addElement]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      if (e.target === e.target.getStage()) {
        setSelectedId(null);
      }
      return;
    }
    if (tool === 'window' || tool === 'door') {
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const { x, y } = getSnappedPos(pos.x, pos.y);
      const id = uuid();
      const el: GeometryElement = {
        id, type: tool,
        x: pxToM(x, scale), y: pxToM(y, scale),
        label: tool === 'window' ? 'Окно' : 'Дверь',
      };
      addElement(el);
    }
  }, [tool, setSelectedId, getSnappedPos, scale, addElement]);

  // Grid lines
  const gridLines = [];
  const cols = Math.ceil(stageSize.width / scale) + 1;
  const rows = Math.ceil(stageSize.height / scale) + 1;
  for (let i = 0; i <= cols; i++) {
    gridLines.push(<Line key={`v${i}`} points={[i * scale, 0, i * scale, stageSize.height]} stroke="#e2e8f0" strokeWidth={1} />);
  }
  for (let j = 0; j <= rows; j++) {
    gridLines.push(<Line key={`h${j}`} points={[0, j * scale, stageSize.width, j * scale]} stroke="#e2e8f0" strokeWidth={1} />);
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-white relative overflow-hidden">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        {/* Grid Layer */}
        <Layer listening={false}>
          {gridLines}
        </Layer>

        {/* Elements Layer */}
        <Layer>
          {geometry.elements.map(el => (
            <ElementRenderer
              key={el.id}
              el={el}
              scale={scale}
              selected={selectedId === el.id}
              onSelect={() => { if (tool === 'select') setSelectedId(el.id); }}
              onUpdate={updates => updateElement(el.id, updates)}
              snap={snap}
            />
          ))}

          {/* Drawing preview */}
          {drawing.active && tool === 'wall' && (
            <Line
              points={[drawing.startX, drawing.startY, drawing.currentX, drawing.currentY]}
              stroke={ELEMENT_COLORS.wall}
              strokeWidth={6}
              lineCap="round"
              dash={[10, 5]}
            />
          )}
          {drawing.active && (tool === 'floor' || tool === 'roof' || tool === 'foundation') && (
            <Rect
              x={Math.min(drawing.startX, drawing.currentX)}
              y={Math.min(drawing.startY, drawing.currentY)}
              width={Math.abs(drawing.currentX - drawing.startX)}
              height={Math.abs(drawing.currentY - drawing.startY)}
              fill={ELEMENT_COLORS[tool]}
              stroke={ELEMENT_STROKE[tool]}
              strokeWidth={2}
              dash={[8, 4]}
              opacity={0.6}
            />
          )}
        </Layer>

        {/* Dimension Labels Layer */}
        <Layer listening={false}>
          {geometry.elements.map(el => <DimensionLabel key={`dim-${el.id}`} el={el} scale={scale} />)}
        </Layer>
      </Stage>

      {/* Compass / Scale indicator */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur rounded-lg px-3 py-1.5 text-xs text-gray-500 border border-gray-200 shadow-sm">
        1 клетка = 1 м
      </div>
    </div>
  );
}

interface ElementRendererProps {
  el: GeometryElement;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<GeometryElement>) => void;
  snap: boolean;
}

function ElementRenderer({ el, scale, selected, onSelect, onUpdate, snap }: ElementRendererProps) {
  const color = ELEMENT_COLORS[el.type] || '#ccc';
  const stroke = ELEMENT_STROKE[el.type] || '#999';
  const strokeWidth = selected ? 3 : el.type === 'wall' ? 6 : 2;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const x = snap ? snapToGrid(e.target.x(), scale) : e.target.x();
    const y = snap ? snapToGrid(e.target.y(), scale) : e.target.y();
    if (el.type === 'wall') {
      const dx = x - (el.x1! * scale);
      const dy = y - (el.y1! * scale);
      onUpdate({
        x1: parseFloat(((el.x1! * scale + dx) / scale).toFixed(2)),
        y1: parseFloat(((el.y1! * scale + dy) / scale).toFixed(2)),
        x2: parseFloat(((el.x2! * scale + dx) / scale).toFixed(2)),
        y2: parseFloat(((el.y2! * scale + dy) / scale).toFixed(2)),
      });
    } else {
      onUpdate({
        x: parseFloat((x / scale).toFixed(2)),
        y: parseFloat((y / scale).toFixed(2)),
      });
    }
  };

  if (el.type === 'wall') {
    const x1 = (el.x1 || 0) * scale;
    const y1 = (el.y1 || 0) * scale;
    const x2 = (el.x2 || 0) * scale;
    const y2 = (el.y2 || 0) * scale;
    return (
      <Group draggable onDragEnd={handleDragEnd} onClick={onSelect}>
        <Line
          points={[x1, y1, x2, y2]}
          stroke={selected ? '#3b82f6' : stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          hitStrokeWidth={20}
        />
        {selected && (
          <>
            <Circle x={x1} y={y1} radius={6} fill="#3b82f6" stroke="white" strokeWidth={2} />
            <Circle x={x2} y={y2} radius={6} fill="#3b82f6" stroke="white" strokeWidth={2} />
          </>
        )}
      </Group>
    );
  }

  if (el.type === 'window') {
    const cx = (el.x || 0) * scale;
    const cy = (el.y || 0) * scale;
    return (
      <Group draggable x={cx} y={cy} onDragEnd={handleDragEnd} onClick={onSelect}>
        <Rect x={-12} y={-6} width={24} height={12} fill="#bfdbfe" stroke={selected ? '#3b82f6' : '#2563eb'} strokeWidth={selected ? 2 : 1.5} cornerRadius={2} />
        <Line points={[0, -6, 0, 6]} stroke="#2563eb" strokeWidth={1} />
        {selected && <Rect x={-14} y={-8} width={28} height={16} stroke="#3b82f6" strokeWidth={2} dash={[4, 2]} fill="transparent" />}
      </Group>
    );
  }

  if (el.type === 'door') {
    const cx = (el.x || 0) * scale;
    const cy = (el.y || 0) * scale;
    return (
      <Group draggable x={cx} y={cy} onDragEnd={handleDragEnd} onClick={onSelect}>
        <Rect x={-10} y={-20} width={20} height={40} fill="#fee2e2" stroke={selected ? '#3b82f6' : '#dc2626'} strokeWidth={selected ? 2 : 1.5} cornerRadius={2} />
        <Arc
          angle={90}
          outerRadius={18}
          rotation={-45}
          fill="transparent"
          stroke="#dc2626"
          strokeWidth={1}
          dash={[3, 2]}
        />
        {selected && <Rect x={-14} y={-24} width={28} height={48} stroke="#3b82f6" strokeWidth={2} dash={[4, 2]} fill="transparent" />}
      </Group>
    );
  }

  // Area elements: floor, roof, foundation
  const rx = (el.x || 0) * scale;
  const ry = (el.y || 0) * scale;
  const rw = (el.width || 0) * scale;
  const rh = (el.depth || 0) * scale;

  return (
    <Group draggable x={rx} y={ry} onDragEnd={handleDragEnd} onClick={onSelect}>
      <Rect
        width={rw}
        height={rh}
        fill={color}
        stroke={selected ? '#3b82f6' : stroke}
        strokeWidth={selected ? 2 : 1.5}
        opacity={0.7}
        cornerRadius={2}
        dash={el.type === 'roof' ? [8, 4] : undefined}
      />
      {el.type === 'roof' && (
        <Line
          points={[rw / 2, 0, 0, rh / 2, rw / 2, rh, rw, rh / 2, rw / 2, 0]}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.5}
        />
      )}
    </Group>
  );
}

// Simple arc component using Line
function Arc({ angle, outerRadius, rotation, fill, stroke, strokeWidth, dash }: {
  angle: number; outerRadius: number; rotation: number;
  fill: string; stroke: string; strokeWidth: number; dash?: number[];
}) {
  const points: number[] = [];
  for (let a = 0; a <= angle; a += 5) {
    const rad = ((a + rotation) * Math.PI) / 180;
    points.push(Math.cos(rad) * outerRadius, Math.sin(rad) * outerRadius);
  }
  return <Line points={points} fill={fill} stroke={stroke} strokeWidth={strokeWidth} dash={dash} />;
}

function DimensionLabel({ el, scale }: { el: GeometryElement; scale: number }) {
  if (el.type === 'wall' && el.length) {
    const mx = ((el.x1! + el.x2!) / 2) * scale;
    const my = ((el.y1! + el.y2!) / 2) * scale;
    return (
      <Text
        x={mx - 20}
        y={my - 12}
        text={`${el.length}м`}
        fontSize={10}
        fill="#64748b"
        background="#ffffff"
        padding={2}
      />
    );
  }
  if ((el.type === 'floor' || el.type === 'foundation') && el.width && el.depth) {
    const cx = (el.x! + el.width / 2) * scale;
    const cy = (el.y! + el.depth / 2) * scale;
    return (
      <Text
        x={cx - 25}
        y={cy - 8}
        text={`${el.width}×${el.depth}м`}
        fontSize={10}
        fill="#475569"
        align="center"
      />
    );
  }
  return null;
}
