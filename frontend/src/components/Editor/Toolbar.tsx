import { useEditorStore } from '../../store/editor';
import {
  MousePointer2, Minus, Square, Triangle, AppWindow, DoorOpen,
  Undo2, Redo2, Grid3X3, Trash2, ZoomIn, ZoomOut
} from 'lucide-react';
import clsx from 'clsx';

const TOOLS = [
  { id: 'select', label: 'Выбор', icon: MousePointer2, shortcut: 'V' },
  { id: 'wall', label: 'Стена', icon: Minus, shortcut: 'W' },
  { id: 'floor', label: 'Пол', icon: Square, shortcut: 'F' },
  { id: 'roof', label: 'Кровля', icon: Triangle, shortcut: 'R' },
  { id: 'foundation', label: 'Фундамент', icon: Square, shortcut: 'N' },
  { id: 'window', label: 'Окно', icon: AppWindow, shortcut: 'I' },
  { id: 'door', label: 'Дверь', icon: DoorOpen, shortcut: 'D' },
] as const;

export default function Toolbar() {
  const { tool, setTool, undo, redo, historyIndex, history, snapToGrid, toggleSnap, scale, setScale, selectedId, removeElement } = useEditorStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col gap-1 p-2 bg-white border-r border-gray-200 h-full min-w-[72px] items-center">
      {/* Drawing tools */}
      <div className="flex flex-col gap-1 w-full">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => setTool(t.id as any)}
            title={`${t.label} (${t.shortcut})`}
            className={clsx(
              'flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs transition-all w-full',
              tool === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden lg:block leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-gray-200 my-1" />

      {/* Actions */}
      <div className="flex flex-col gap-1 w-full">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all w-full"
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Отмена</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all w-full"
        >
          <Redo2 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Повтор</span>
        </button>

        <button
          onClick={toggleSnap}
          title="Привязка к сетке"
          className={clsx(
            'flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs transition-all w-full',
            snapToGrid ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'
          )}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden lg:block leading-none">Сетка</span>
        </button>

        {selectedId && (
          <button
            onClick={() => removeElement(selectedId)}
            title="Удалить (Delete)"
            className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-all w-full"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden lg:block leading-none">Удалить</span>
          </button>
        )}
      </div>

      <div className="w-full h-px bg-gray-200 my-1" />

      {/* Zoom */}
      <div className="flex flex-col gap-1 w-full">
        <button
          onClick={() => setScale(Math.min(scale + 10, 120))}
          title="Увеличить"
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-all w-full"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="text-center text-xs text-gray-400 font-mono">{Math.round(scale / 60 * 100)}%</div>
        <button
          onClick={() => setScale(Math.max(scale - 10, 30))}
          title="Уменьшить"
          className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 transition-all w-full"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
