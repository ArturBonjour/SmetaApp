import { useEditorStore } from '../../store/editor';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { CatalogItem } from '../../types';
import { Ruler, Tag, Settings } from 'lucide-react';

interface Props {
  projectId: string;
}

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  wall: 'Стена', floor: 'Пол', roof: 'Кровля',
  window: 'Окно', door: 'Дверь', foundation: 'Фундамент', room: 'Комната',
};

export default function PropertiesPanel({ projectId: _projectId }: Props) {
  const { geometry, selectedId, updateElement } = useEditorStore();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const selected = geometry.elements.find(e => e.id === selectedId);

  useEffect(() => {
    api.get('/catalog').then(r => setCatalog(r.data)).catch(() => {});
  }, []);

  if (!selected) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
          <Settings className="w-4 h-4" />
          <span>Свойства</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-center text-gray-400 text-sm">
          <div>
            <Ruler className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>Выберите элемент<br />на плане</p>
          </div>
        </div>

        {/* Building dimensions */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Габариты здания</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ширина (м)</label>
              <input
                type="number"
                value={geometry.width}
                onChange={e => useEditorStore.getState().updateDimensions(parseFloat(e.target.value) || 0, geometry.height)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1" max="100" step="0.5"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Длина (м)</label>
              <input
                type="number"
                value={geometry.height}
                onChange={e => useEditorStore.getState().updateDimensions(geometry.width, parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1" max="100" step="0.5"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const relatedCatalog = catalog.filter(c => c.category === selected.type);

  const handleChange = (key: string, value: string | number) => {
    updateElement(selected.id, { [key]: typeof value === 'string' ? value : parseFloat(String(value)) || 0 });
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center gap-2 font-semibold text-gray-700 mb-4">
        <Settings className="w-4 h-4" />
        <span>Свойства</span>
      </div>

      {/* Type badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium mb-4 w-fit">
        <Tag className="w-3.5 h-3.5" />
        {ELEMENT_TYPE_LABELS[selected.type] || selected.type}
      </div>

      {/* Label */}
      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500 block mb-1">Название</label>
        <input
          type="text"
          value={selected.label || ''}
          onChange={e => handleChange('label', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Wall specific */}
      {selected.type === 'wall' && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Длина (м)</label>
              <input
                type="number"
                value={selected.length || 0}
                readOnly
                className="w-full px-2 py-1.5 text-sm border border-gray-100 bg-gray-50 rounded-lg text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Высота (м)</label>
              <input
                type="number"
                value={selected.height || 2.5}
                onChange={e => handleChange('height', e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1" max="10" step="0.1"
              />
            </div>
          </div>
        </>
      )}

      {/* Area elements */}
      {(selected.type === 'floor' || selected.type === 'roof' || selected.type === 'foundation') && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Ширина (м)</label>
            <input
              type="number"
              value={selected.width || 0}
              onChange={e => handleChange('width', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Глубина (м)</label>
            <input
              type="number"
              value={selected.depth || 0}
              onChange={e => handleChange('depth', e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.1"
            />
          </div>
          {selected.width && selected.depth && (
            <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">Площадь: </span>
              <span className="font-semibold text-gray-800">{(selected.width * selected.depth).toFixed(1)} м²</span>
            </div>
          )}
        </div>
      )}

      {/* Material selector */}
      {relatedCatalog.length > 0 && (
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 block mb-2">Материал</label>
          <div className="space-y-1.5">
            {relatedCatalog.slice(0, 5).map(item => (
              <button
                key={item.id}
                onClick={() => handleChange('catalogItemId', item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                  selected.catalogItemId === item.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium truncate">{item.name}</div>
                <div className="text-xs text-gray-500">{item.unitPrice.toLocaleString('ru-RU')} ₽/{item.unit === 'm2' ? 'м²' : item.unit === 'pcs' ? 'шт' : item.unit}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
