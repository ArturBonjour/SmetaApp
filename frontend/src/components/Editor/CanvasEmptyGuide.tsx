import { motion } from 'framer-motion';
import { MousePointer2, Minus, Square, AppWindow, Keyboard } from 'lucide-react';

const STEPS = [
  { icon: MousePointer2, title: 'Выбери инструмент', desc: 'Нажми W — стена, F — пол, R — кровля', shortcut: 'W / F / R', color: 'text-blue-500' },
  { icon: Minus, title: 'Нарисуй стену', desc: 'Кликни начало → кликни конец. Shift = угол 45°/90°', shortcut: 'Shift', color: 'text-slate-500' },
  { icon: Square, title: 'Добавь пол', desc: 'Инструмент F — нарисуй прямоугольник пола', shortcut: 'F', color: 'text-sky-500' },
  { icon: AppWindow, title: 'Окна и двери', desc: 'Инструменты I и D — клик на план', shortcut: 'I / D', color: 'text-emerald-500' },
];

interface Props {
  onPickTool: (tool: string) => void;
}

export default function CanvasEmptyGuide({ onPickTool }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
    >
      <div className="pointer-events-auto max-w-lg w-full px-4">
        {/* Central illustration */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/50 mb-4">
            <div className="text-3xl">🏗️</div>
          </div>
          <h3 className="text-lg font-bold text-[var(--text-1)] mb-1">Начните проектирование</h3>
          <p className="text-sm text-[var(--text-3)]">Используйте инструменты слева или нажмите горячую клавишу</p>
        </div>

        {/* Step guide */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="bg-[var(--bg-card)]/90 backdrop-blur border border-[var(--border)] rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`flex-shrink-0 mt-0.5 ${step.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--text-1)] mb-0.5">{step.title}</div>
                    <div className="text-xs text-[var(--text-3)] leading-relaxed">{step.desc}</div>
                  </div>
                  <kbd className="flex-shrink-0 text-[10px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-3)] px-1.5 py-0.5 rounded font-mono self-start">
                    {step.shortcut}
                  </kbd>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quick start buttons */}
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <button
            onClick={() => onPickTool('wall')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Minus className="w-3.5 h-3.5" />
            Рисовать стену
          </button>
          <button
            onClick={() => onPickTool('floor')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-1)] border border-[var(--border)] text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Square className="w-3.5 h-3.5" />
            Добавить пол
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('show-shortcuts'))}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[var(--text-3)] border border-[var(--border)] text-xs font-medium rounded-lg transition-colors shadow-sm"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Клавиши
          </button>
        </div>
      </div>
    </motion.div>
  );
}
