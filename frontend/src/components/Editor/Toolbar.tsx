import { useEditorStore } from '../../store/editor';
import {
  MousePointer2, Minus, Square, Triangle, AppWindow, DoorOpen,
  Undo2, Redo2, Grid3X3, Trash2, ZoomIn, ZoomOut, RotateCcw, Keyboard
} from 'lucide-react';
import clsx from 'clsx';

const DRAW_TOOLS = [
  { id: 'select',     label: 'Выбор',      icon: MousePointer2, shortcut: 'V' },
  { id: 'wall',       label: 'Стена',      icon: Minus,        shortcut: 'W' },
  { id: 'floor',      label: 'Пол',        icon: Square,       shortcut: 'P' },
  { id: 'roof',       label: 'Кровля',     icon: Triangle,     shortcut: 'R' },
  { id: 'foundation', label: 'Фундамент',  icon: Square,       shortcut: 'N' },
  { id: 'window',     label: 'Окно',       icon: AppWindow,    shortcut: 'I' },
  { id: 'door',       label: 'Дверь',      icon: DoorOpen,     shortcut: 'D' },
] as const;

type ToolId = typeof DRAW_TOOLS[number]['id'];

const TOOL_COLORS: Record<ToolId, string> = {
  select:     'bg-blue-600 text-white',
  wall:       'bg-slate-800 text-white',
  floor:      'bg-blue-500 text-white',
  roof:       'bg-amber-500 text-white',
  foundation: 'bg-emerald-600 text-white',
  window:     'bg-sky-500 text-white',
  door:       'bg-rose-500 text-white',
};

export default function Toolbar() {
  const {
    tool, setTool, undo, redo, historyIndex, history,
    snapToGrid, toggleSnap, scale, setScale, selectedId, removeElement,
  } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col gap-1 p-2 bg-[var(--bg-sidebar)] border-r border-[var(--border)] h-full min-w-[72px] items-center overflow-y-auto">
      {/* Draw tools */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs text-[var(--text-3)] text-center py-1 font-medium uppercase tracking-wider select-none hidden lg:block">
          Инстр.
        </div>
        {DRAW_TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs transition-all w-full',
              tool === t.id
                ? TOOL_COLORS[t.id]
                : 'text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)]'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden lg:block leading-none font-medium">{t.label}</span>
            <span className="text-[10px] opacity-50 hidden lg:block">{t.shortcut}</span>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-[var(--border)] my-1" />

      {/* Edit actions */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs text-[var(--text-3)] text-center py-1 font-medium uppercase tracking-wider select-none hidden lg:block">
          Правка
        </div>
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] disabled:opacity-25 transition-all w-full"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Отмена</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] disabled:opacity-25 transition-all w-full"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Повтор</span>
        </button>

        <button
          onClick={toggleSnap}
          title="Привязка к сетке (G)"
          className={clsx(
            'flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs transition-all w-full',
            snapToGrid ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)]'
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Сетка</span>
        </button>

        {selectedId && (
          <button
            onClick={() => removeElement(selectedId)}
            title="Удалить (Del)"
            className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden lg:block leading-none">Удалить</span>
          </button>
        )}
      </div>

      <div className="w-full h-px bg-[var(--border)] my-1" />

      {/* Zoom */}
      <div className="flex flex-col gap-1 w-full">
        <div className="text-xs text-[var(--text-3)] text-center py-1 font-medium uppercase tracking-wider select-none hidden lg:block">
          Вид
        </div>
        <button
          onClick={() => setScale(Math.min(scale + 10, 120))}
          title="Увеличить (+)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] transition-all w-full"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="text-center text-xs text-[var(--text-3)] font-mono">
          {Math.round(scale / 60 * 100)}%
        </div>
        <button
          onClick={() => setScale(Math.max(scale - 10, 30))}
          title="Отдалить (-)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] transition-all w-full"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale(60)}
          title="Сбросить (0)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] transition-all w-full"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Keyboard shortcut hint */}
      <div className="mt-auto pt-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('show-shortcuts'))}
          title="Горячие клавиши (?)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs text-[var(--text-3)] hover:bg-[var(--bg-input)] hover:text-[var(--text-1)] transition-all w-full"
        >
          <Keyboard className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

