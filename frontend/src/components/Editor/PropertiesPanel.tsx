import { useEditorStore } from '../../store/editor';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { CatalogItem } from '../../types';
import { Ruler, Tag, Settings, Package } from 'lucide-react';

interface Props {
  projectId: string;
}

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  wall: 'Стена', floor: 'Пол', roof: 'Кровля',
  window: 'Окно', door: 'Дверь', foundation: 'Фундамент', room: 'Комната',
};

const TYPE_COLORS: Record<string, string> = {
  wall:       'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  floor:      'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
  roof:       'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  window:     'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  door:       'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
  foundation: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
};

const inputClass = 'w-full px-2.5 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';
const labelClass = 'text-xs font-medium text-[var(--text-3)] block mb-1';

export default function PropertiesPanel({ projectId: _projectId }: Props) {
  const { geometry, selectedId, updateElement } = useEditorStore();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const selected = geometry.elements.find((e) => e.id === selectedId);

  useEffect(() => {
    api.get('/catalog').then((r) => setCatalog(r.data)).catch(() => {});
  }, []);

  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-[var(--bg-sidebar)]">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--text-1)] text-sm">
            <Settings className="w-4 h-4 text-[var(--text-3)]" />
            Свойства
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-center p-4">
          <div>
            <Ruler className="w-10 h-10 mx-auto mb-3 text-[var(--text-3)] opacity-30" />
            <p className="text-sm text-[var(--text-3)]">Выберите элемент<br />на плане</p>
          </div>
        </div>

        {/* Building dimensions */}
        <div className="border-t border-[var(--border)] p-4">
          <h4 className="text-xs font-semibold text-[var(--text-3)] uppercase tracking-wider mb-3">Габариты здания</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Ширина (м)</label>
              <input
                type="number"
                value={geometry.width}
                onChange={(e) => useEditorStore.getState().updateDimensions(parseFloat(e.target.value) || 0, geometry.height)}
                className={inputClass}
                min="1" max="100" step="0.5"
              />
            </div>
            <div>
              <label className={labelClass}>Длина (м)</label>
              <input
                type="number"
                value={geometry.height}
                onChange={(e) => useEditorStore.getState().updateDimensions(geometry.width, parseFloat(e.target.value) || 0)}
                className={inputClass}
                min="1" max="100" step="0.5"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const relatedCatalog = catalog.filter((c) => c.category === selected.type);
  const handleChange = (key: string, value: string | number) => {
    updateElement(selected.id, { [key]: typeof value === 'string' ? value : parseFloat(String(value)) || 0 });
  };

  const typeColor = TYPE_COLORS[selected.type] || 'bg-gray-100 text-gray-700';

  return (
    <div className="h-full flex flex-col bg-[var(--bg-sidebar)] overflow-y-auto">
      <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-2 font-semibold text-[var(--text-1)] text-sm">
          <Settings className="w-4 h-4 text-[var(--text-3)]" />
          Свойства
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Type badge */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${typeColor}`}>
          <Tag className="w-3.5 h-3.5" />
          {ELEMENT_TYPE_LABELS[selected.type] || selected.type}
        </div>

        {/* Label */}
        <div>
          <label className={labelClass}>Название</label>
          <input
            type="text"
            value={selected.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Window / Door specific */}
        {(selected.type === 'window' || selected.type === 'door') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Ширина (м)</label>
                <input
                  type="number"
                  value={selected.width ?? (selected.type === 'window' ? 1.2 : 0.9)}
                  onChange={(e) => handleChange('width', e.target.value)}
                  className={inputClass}
                  step="0.1" min="0.4" max="4"
                />
              </div>
              <div>
                <label className={labelClass}>Высота (м)</label>
                <input
                  type="number"
                  value={selected.height ?? (selected.type === 'window' ? 1.4 : 2.1)}
                  onChange={(e) => handleChange('height', e.target.value)}
                  className={inputClass}
                  step="0.1" min="0.5" max="3"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Поворот (°)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-180" max="180" step="5"
                  value={Math.round((selected.rotation ?? 0) * 180 / Math.PI)}
                  onChange={(e) => updateElement(selected.id, { rotation: parseFloat(e.target.value) * Math.PI / 180 })}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-[var(--text-2)] font-mono w-10 text-right">
                  {Math.round((selected.rotation ?? 0) * 180 / Math.PI)}°
                </span>
              </div>
            </div>
            {selected.type === 'door' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selected.flipSwing ?? false}
                  onChange={(e) => updateElement(selected.id, { flipSwing: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
                <span className="text-sm text-[var(--text-2)]">Зеркалить открывание</span>
              </label>
            )}
          </>
        )}

        {/* Wall specific */}
        {selected.type === 'wall' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Длина (м)</label>
                <input
                  type="number"
                  value={selected.length || 0}
                  readOnly
                  className="w-full px-2.5 py-2 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-3)] rounded-lg cursor-not-allowed"
                />
              </div>
              <div>
                <label className={labelClass}>Высота (м)</label>
                <input
                  type="number"
                  value={selected.height || 2.5}
                  onChange={(e) => handleChange('height', e.target.value)}
                  className={inputClass}
                  min="1" max="10" step="0.1"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Толщина (м)</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.1" max="0.5" step="0.05"
                  value={selected.thickness ?? 0.2}
                  onChange={(e) => handleChange('thickness', e.target.value)}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-[var(--text-2)] font-mono w-10 text-right">
                  {(selected.thickness ?? 0.2).toFixed(2)}м
                </span>
              </div>
            </div>
            {selected.length && selected.height && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between">
                <span className="text-[var(--text-3)]">Площадь ст.</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {(selected.length * (selected.height ?? 2.5)).toFixed(1)} м²
                </span>
              </div>
            )}
          </>
        )}

        {/* Area elements */}
        {(selected.type === 'floor' || selected.type === 'roof' || selected.type === 'foundation') && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Ширина (м)</label>
                <input type="number" value={selected.width || 0} onChange={(e) => handleChange('width', e.target.value)} className={inputClass} step="0.1" />
              </div>
              <div>
                <label className={labelClass}>Глубина (м)</label>
                <input type="number" value={selected.depth || 0} onChange={(e) => handleChange('depth', e.target.value)} className={inputClass} step="0.1" />
              </div>
            </div>
            {selected.width && selected.depth && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg px-3 py-2.5 text-sm flex items-center justify-between">
                <span className="text-[var(--text-3)]">Площадь</span>
                <span className="font-bold text-blue-700 dark:text-blue-300">
                  {(selected.width * selected.depth).toFixed(1)} м²
                </span>
              </div>
            )}
          </>
        )}

        {/* Material selector */}
        {relatedCatalog.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-3.5 h-3.5 text-[var(--text-3)]" />
              <label className="text-xs font-medium text-[var(--text-3)] uppercase tracking-wider">Материал</label>
            </div>
            <div className="space-y-1.5">
              {relatedCatalog.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleChange('catalogItemId', item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                    selected.catalogItemId === item.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                      : 'border-[var(--border)] text-[var(--text-2)] hover:border-blue-400 hover:bg-[var(--bg-input)]'
                  }`}
                >
                  <div className="font-medium truncate">{item.name}</div>
                  <div className={`text-xs mt-0.5 ${selected.catalogItemId === item.id ? 'text-blue-500' : 'text-[var(--text-3)]'}`}>
                    {item.unitPrice.toLocaleString('ru-RU')} ₽/{item.unit === 'm2' ? 'м²' : item.unit === 'pcs' ? 'шт' : item.unit}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
