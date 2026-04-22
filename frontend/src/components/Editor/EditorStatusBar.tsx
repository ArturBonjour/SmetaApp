import { useEditorStore } from '../../store/editor';
import { Maximize2, Grid3X3, Layers } from 'lucide-react';

interface Props {
  mouseWorldPos: { x: number; y: number } | null;
  stageScale: number;
  onFitToScreen: () => void;
}

export default function EditorStatusBar({ mouseWorldPos, stageScale, onFitToScreen }: Props) {
  const { geometry, selectedId, snapToGrid, toggleSnap, setScale, scale } = useEditorStore();
  const selected = selectedId ? geometry.elements.find((e) => e.id === selectedId) : null;

  const zoomPercent = Math.round(stageScale * 100);

  const totalWalls = geometry.elements.filter((e) => e.type === 'wall').length;
  const totalWallLen = geometry.elements
    .filter((e) => e.type === 'wall')
    .reduce((s, e) => s + (e.length ?? 0), 0);
  const totalArea = geometry.elements
    .filter((e) => e.type === 'floor')
    .reduce((s, e) => s + (e.width ?? 0) * (e.depth ?? 0), 0);

  const divider = <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 flex-shrink-0" />;

  return (
    <div className="flex items-center gap-0 h-7 bg-[var(--bg-card)] border-t border-[var(--border)] px-3 text-xs text-[var(--text-3)] select-none flex-shrink-0 overflow-hidden">
      {/* Cursor coordinates */}
      <div className="flex items-center gap-1.5 pr-3 font-mono whitespace-nowrap min-w-[110px]">
        <span className="opacity-50">X</span>
        <span className="text-[var(--text-2)]">{mouseWorldPos ? mouseWorldPos.x.toFixed(2) : '—'}</span>
        <span className="opacity-50 ml-1">Y</span>
        <span className="text-[var(--text-2)]">{mouseWorldPos ? mouseWorldPos.y.toFixed(2) : '—'}</span>
        <span className="opacity-40">м</span>
      </div>

      {divider}

      {/* Element count */}
      <div className="flex items-center gap-1.5 px-3 whitespace-nowrap">
        <Layers className="w-3 h-3 opacity-50" />
        <span>{geometry.elements.length} эл.</span>
        {totalWalls > 0 && (
          <span className="text-slate-400 dark:text-slate-600">
            {totalWalls} ст. {totalWallLen.toFixed(1)}м
          </span>
        )}
        {totalArea > 0 && (
          <span className="text-slate-400 dark:text-slate-600">
            {totalArea.toFixed(1)}м²
          </span>
        )}
      </div>

      {divider}

      {/* Selected element info */}
      {selected ? (
        <div className="flex items-center gap-1.5 px-3 whitespace-nowrap text-blue-500 dark:text-blue-400">
          <span className="font-medium">{selected.label || selected.type}</span>
          {selected.type === 'wall' && selected.length && (
            <span className="opacity-70">· {selected.length.toFixed(2)}м × {(selected.height ?? 2.5).toFixed(1)}м</span>
          )}
          {(selected.type === 'floor' || selected.type === 'roof') && selected.width && selected.depth && (
            <span className="opacity-70">
              · {selected.width.toFixed(1)}×{selected.depth.toFixed(1)} = {(selected.width * selected.depth).toFixed(1)}м²
            </span>
          )}
        </div>
      ) : (
        <div className="px-3 opacity-40 whitespace-nowrap">Ничего не выбрано</div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Snap toggle */}
      <button
        onClick={toggleSnap}
        title="Привязка к сетке (G)"
        className={`flex items-center gap-1 px-2.5 h-full transition-colors ${
          snapToGrid ? 'text-blue-500' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
        }`}
      >
        <Grid3X3 className="w-3 h-3" />
        <span className="hidden sm:inline">Сетка</span>
      </button>

      {divider}

      {/* Fit-to-screen */}
      <button
        onClick={onFitToScreen}
        title="По размеру (F)"
        className="flex items-center gap-1 px-2.5 h-full text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors"
      >
        <Maximize2 className="w-3 h-3" />
      </button>

      {divider}

      {/* Zoom control */}
      <div className="flex items-center gap-1 px-2">
        <button
          onClick={() => setScale(Math.max(scale - 10, 20))}
          className="w-4 h-4 flex items-center justify-center hover:text-[var(--text-1)] transition-colors rounded"
          title="Отдалить (-)"
        >
          −
        </button>
        <button
          onClick={() => setScale(60)}
          title="Сбросить масштаб (0)"
          className="w-10 text-center font-mono hover:text-[var(--text-1)] transition-colors"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={() => setScale(Math.min(scale + 10, 160))}
          className="w-4 h-4 flex items-center justify-center hover:text-[var(--text-1)] transition-colors rounded"
          title="Приблизить (+)"
        >
          +
        </button>
      </div>
    </div>
  );
}
