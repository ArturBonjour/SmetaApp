import { useState, useRef, useEffect } from 'react';
import { useEditorStore } from '../../store/editor';
import {
  Minus, Square, Triangle, AppWindow, DoorOpen, Layers3,
  Eye, EyeOff, Trash2, Copy, ChevronDown, ChevronRight,
} from 'lucide-react';

const TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  wall: Minus,
  floor: Square,
  roof: Triangle,
  foundation: Square,
  window: AppWindow,
  door: DoorOpen,
};

const TYPE_COLOR: Record<string, string> = {
  wall:       'text-slate-500',
  floor:      'text-blue-500',
  roof:       'text-amber-500',
  foundation: 'text-emerald-500',
  window:     'text-sky-500',
  door:       'text-rose-500',
};

const TYPE_LABEL: Record<string, string> = {
  wall: 'Стена', floor: 'Пол', roof: 'Кровля',
  foundation: 'Фундамент', window: 'Окно', door: 'Дверь', room: 'Комната',
};

const TYPE_ORDER = ['wall', 'floor', 'roof', 'foundation', 'window', 'door', 'room'];

function getDisplayName(el: { type: string; label?: string; length?: number; width?: number; depth?: number }) {
  if (el.label) return el.label;
  const base = TYPE_LABEL[el.type] || el.type;
  if (el.type === 'wall' && el.length) return `${base} ${el.length}м`;
  if ((el.type === 'floor' || el.type === 'foundation' || el.type === 'roof') && el.width && el.depth) {
    return `${base} ${el.width}×${el.depth}м`;
  }
  return base;
}

export default function ObjectsPanel() {
  const { geometry, selectedId, hiddenIds, setSelectedId, updateElement, removeElement, duplicateElement, copyElement } =
    useEditorStore();
  const { toggleHidden } = useEditorStore();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const grouped = TYPE_ORDER.reduce<Record<string, typeof geometry.elements>>((acc, t) => {
    const els = geometry.elements.filter((e) => e.type === t);
    if (els.length > 0) acc[t] = els;
    return acc;
  }, {});

  const toggleGroup = (type: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(type)) n.delete(type); else n.add(type);
      return n;
    });

  const startRename = (el: (typeof geometry.elements)[0]) => {
    setRenamingId(el.id);
    setRenameValue(el.label || getDisplayName(el));
  };

  const commitRename = () => {
    if (renamingId) {
      updateElement(renamingId, { label: renameValue.trim() || undefined });
      setRenamingId(null);
    }
  };

  if (geometry.elements.length === 0) {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
        <PanelHeader count={0} />
        <div className="flex-1 flex items-center justify-center p-4 text-center">
          <div>
            <Layers3 className="w-8 h-8 mx-auto mb-2 text-[var(--text-3)] opacity-30" />
            <p className="text-xs text-[var(--text-3)]">На плане пока нет элементов</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)] overflow-hidden">
      <PanelHeader count={geometry.elements.length} />

      <div className="flex-1 overflow-y-auto">
        {Object.entries(grouped).map(([type, els]) => {
          const Icon = TYPE_ICON[type] || Square;
          const isCollapsed = collapsed.has(type);
          return (
            <div key={type} className="border-b border-[var(--border)]">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(type)}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--bg-input)] transition-colors"
              >
                {isCollapsed
                  ? <ChevronRight className="w-3 h-3 text-[var(--text-3)]" />
                  : <ChevronDown className="w-3 h-3 text-[var(--text-3)]" />}
                <Icon className={`w-3.5 h-3.5 ${TYPE_COLOR[type] || 'text-slate-400'}`} />
                <span className="text-xs font-semibold text-[var(--text-2)] flex-1 text-left">
                  {TYPE_LABEL[type] || type}
                </span>
                <span className="text-xs text-[var(--text-3)] bg-[var(--bg-input)] px-1.5 py-0.5 rounded-full">
                  {els.length}
                </span>
              </button>

              {/* Elements in this group */}
              {!isCollapsed && (
                <div className="pb-1">
                  {els.map((el) => {
                    const isSelected = el.id === selectedId;
                    const isHidden = hiddenIds.has(el.id);
                    const isRenaming = el.id === renamingId;

                    return (
                      <div
                        key={el.id}
                        onClick={() => { setSelectedId(el.id); useEditorStore.getState().setTool('select'); }}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40'
                            : 'hover:bg-[var(--bg-input)]'
                        } ${isHidden ? 'opacity-40' : ''}`}
                      >
                        <div className="w-3" /> {/* indent */}
                        <Icon className={`w-3 h-3 flex-shrink-0 ${TYPE_COLOR[type] || 'text-slate-400'} ${isSelected ? 'opacity-100' : 'opacity-60'}`} />

                        {isRenaming ? (
                          <input
                            ref={renameRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                              e.stopPropagation();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 min-w-0 text-xs bg-[var(--bg-card)] border border-blue-400 rounded px-1 py-0.5 text-[var(--text-1)] outline-none"
                          />
                        ) : (
                          <span
                            className={`flex-1 min-w-0 text-xs truncate ${isSelected ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-[var(--text-2)]'}`}
                            onDoubleClick={(e) => { e.stopPropagation(); startRename(el); }}
                          >
                            {getDisplayName(el)}
                          </span>
                        )}

                        {/* Action buttons - show on hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHidden(el.id); }}
                            className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
                            title={isHidden ? 'Показать' : 'Скрыть'}
                          >
                            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); copyElement(el.id); duplicateElement(el.id); }}
                            className="p-1 rounded hover:bg-[var(--border)] text-[var(--text-3)]"
                            title="Дублировать"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-3)] hover:text-red-500"
                            title="Удалить"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="border-t border-[var(--border)] px-3 py-2 text-xs text-[var(--text-3)]">
        Дважды кликните для переименования
      </div>
    </div>
  );
}

function PanelHeader({ count }: { count: number }) {
  return (
    <div className="px-3 py-2.5 border-b border-[var(--border)] flex items-center gap-2 flex-shrink-0">
      <Layers3 className="w-4 h-4 text-[var(--text-3)]" />
      <span className="text-sm font-semibold text-[var(--text-1)]">Объекты</span>
      {count > 0 && (
        <span className="ml-auto text-xs text-[var(--text-3)]">{count} эл.</span>
      )}
    </div>
  );
}
