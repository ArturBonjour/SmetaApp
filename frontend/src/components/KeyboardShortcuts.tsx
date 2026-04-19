import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    group: 'Инструменты',
    items: [
      { keys: ['V'], desc: 'Выбор' },
      { keys: ['W'], desc: 'Рисовать стену' },
      { keys: ['F'], desc: 'Рисовать пол' },
      { keys: ['R'], desc: 'Рисовать кровлю' },
      { keys: ['N'], desc: 'Рисовать фундамент' },
      { keys: ['I'], desc: 'Добавить окно' },
      { keys: ['D'], desc: 'Добавить дверь' },
    ],
  },
  {
    group: 'Редактирование',
    items: [
      { keys: ['Ctrl', 'Z'], desc: 'Отменить' },
      { keys: ['Ctrl', 'Y'], desc: 'Повторить' },
      { keys: ['Ctrl', 'S'], desc: 'Сохранить' },
      { keys: ['Del'], desc: 'Удалить элемент' },
      { keys: ['Esc'], desc: 'Отмена / Снять выделение' },
    ],
  },
  {
    group: 'Холст',
    items: [
      { keys: ['Scroll'], desc: 'Масштаб' },
      { keys: ['Space', '+', 'Drag'], desc: 'Перемещение' },
      { keys: ['+'], desc: 'Приблизить' },
      { keys: ['-'], desc: 'Отдалить' },
      { keys: ['0'], desc: 'Сбросить вид' },
    ],
  },
  {
    group: 'Интерфейс',
    items: [
      { keys: ['⌘', 'K'], desc: 'Командная палитра' },
      { keys: ['?'], desc: 'Горячие клавиши' },
    ],
  },
];

export default function KeyboardShortcuts({ open, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <div
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2.5 font-semibold text-[var(--text-1)]">
                  <Keyboard className="w-4 h-4 text-blue-500" />
                  Горячие клавиши
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto p-6 grid grid-cols-2 gap-6">
                {SHORTCUTS.map((group) => (
                  <div key={group.group}>
                    <h3 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">
                      {group.group}
                    </h3>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={item.desc} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-[var(--text-2)]">{item.desc}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {item.keys.map((k) => (
                              <kbd
                                key={k}
                                className="text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-2)] px-1.5 py-0.5 rounded font-mono shadow-sm"
                              >
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
