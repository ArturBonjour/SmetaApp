import { useEffect, useRef } from 'react';
import { Trash2, Copy, Edit3, ArrowUp, ArrowDown, Clipboard } from 'lucide-react';
import { useEditorStore } from '../../store/editor';

interface ContextMenuProps {
  x: number;
  y: number;
  elementId: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}

export default function ContextMenu({
  x, y, elementId, onClose, onDelete, onDuplicate, onRename, onBringForward, onSendBackward,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { copyElement } = useEditorStore();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  if (!elementId) return null;

  const menuWidth = 190;
  const menuHeight = 230;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 8);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 8);

  const items = [
    { icon: Edit3, label: 'Переименовать', action: () => { onRename(elementId); onClose(); }, shortcut: 'F2' },
    { icon: Clipboard, label: 'Копировать', action: () => { copyElement(elementId); onClose(); }, shortcut: '⌘C' },
    { icon: Copy, label: 'Дублировать', action: () => { onDuplicate(elementId); onClose(); }, shortcut: '⌘D' },
    null,
    { icon: ArrowUp, label: 'На передний план', action: () => { onBringForward(elementId); onClose(); } },
    { icon: ArrowDown, label: 'На задний план', action: () => { onSendBackward(elementId); onClose(); } },
    null,
    { icon: Trash2, label: 'Удалить', action: () => { onDelete(elementId); onClose(); }, shortcut: 'Del', danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-2xl py-1.5 min-w-[190px] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) => {
        if (!item) {
          return <div key={i} className="my-1 border-t border-[var(--border)]" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors text-left
              ${(item as any).danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-[var(--text-1)] hover:bg-[var(--bg-input)]'
              }`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {(item as any).shortcut && (
              <span className="text-xs text-[var(--text-3)] font-mono">{(item as any).shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
