import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2, Check, X,
  Layers, Box, Package, ChevronDown,
} from 'lucide-react';
import api from '../lib/api';
import type { CatalogItem } from '../types';
import toast from 'react-hot-toast';
import Navbar from '../components/Layout/Navbar';

const CATEGORIES = [
  { id: 'all', label: 'Все', icon: Layers },
  { id: 'wall', label: 'Стены', color: '#334155' },
  { id: 'floor', label: 'Полы', color: '#3b82f6' },
  { id: 'roof', label: 'Кровля', color: '#f59e0b' },
  { id: 'window', label: 'Окна', color: '#0ea5e9' },
  { id: 'door', label: 'Двери', color: '#ef4444' },
  { id: 'foundation', label: 'Фундамент', color: '#10b981' },
  { id: 'engineering', label: 'Инженерия', color: '#8b5cf6' },
  { id: 'finishing', label: 'Отделка', color: '#f97316' },
  { id: 'other', label: 'Прочее', color: '#6b7280' },
];

const UNITS = [
  { id: 'm2', label: 'м²' },
  { id: 'ml', label: 'м.п.' },
  { id: 'm3', label: 'м³' },
  { id: 'pcs', label: 'шт' },
  { id: 'hour', label: 'ч' },
];

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label || id;
const unitLabel = (id: string) => UNITS.find((u) => u.id === id)?.label || id;
const catColor = (id: string) => (CATEGORIES.find((c) => c.id === id) as any)?.color || '#6b7280';

const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

interface FormState {
  name: string;
  category: string;
  unit: string;
  unitPrice: string;
  description: string;
}

const emptyForm: FormState = { name: '', category: 'wall', unit: 'm2', unitPrice: '', description: '' };

function ItemForm({
  initial,
  onSave,
  onCancel,
  title,
}: {
  initial: FormState;
  onSave: (f: FormState) => void;
  onCancel: () => void;
  title: string;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold text-[var(--text-1)]">{title}</h3>
      <div>
        <label className="block text-xs text-[var(--text-3)] mb-1">Наименование *</label>
        <input
          value={form.name}
          onChange={set('name')}
          placeholder="Название материала / работы"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-[var(--text-3)] mb-1">Раздел</label>
          <select
            value={form.category}
            onChange={set('category')}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
          >
            {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-3)] mb-1">Единица</label>
          <select
            value={form.unit}
            onChange={set('unit')}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition"
          >
            {UNITS.map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-3)] mb-1">Цена за единицу, ₽ *</label>
        <input
          type="number"
          min="0"
          value={form.unitPrice}
          onChange={set('unitPrice')}
          placeholder="0"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-3)] mb-1">Описание</label>
        <textarea
          value={form.description}
          onChange={set('description') as any}
          placeholder="Краткое описание (необязательно)"
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={!form.name || !form.unitPrice}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-40 transition"
        >
          <Check className="w-3.5 h-3.5" />
          Сохранить
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] rounded-lg transition"
        >
          <X className="w-3.5 h-3.5" />
          Отмена
        </button>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await api.get('/catalog');
      setItems(data);
    } catch {
      toast.error('Ошибка загрузки каталога');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleAdd = async (form: FormState) => {
    if (!form.name || !form.unitPrice) return;
    try {
      const { data } = await api.post('/catalog', {
        name: form.name,
        category: form.category,
        unit: form.unit,
        unitPrice: parseFloat(form.unitPrice),
        description: form.description || undefined,
      });
      setItems((p) => [...p, data]);
      setShowAddForm(false);
      toast.success('Позиция добавлена');
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const handleEdit = async (id: string, form: FormState) => {
    try {
      const { data } = await api.put(`/catalog/${id}`, {
        name: form.name,
        category: form.category,
        unit: form.unit,
        unitPrice: parseFloat(form.unitPrice),
        description: form.description || undefined,
      });
      setItems((p) => p.map((it) => (it.id === id ? data : it)));
      setEditingId(null);
      toast.success('Сохранено');
    } catch {
      toast.error('Ошибка сохранения');
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/catalog/${id}`);
      setItems((p) => p.filter((it) => it.id !== id));
      toast.success('Позиция удалена');
    } catch {
      toast.error('Нельзя удалить системную позицию');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = items.filter((it) => {
    const matchCat = activeCategory === 'all' || it.category === activeCategory;
    const matchSearch = !search || it.name.toLowerCase().includes(search.toLowerCase()) ||
      (it.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const systemCount = filtered.filter((it) => it.isSystem).length;
  const customCount = filtered.filter((it) => !it.isSystem).length;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <Navbar onCommandPalette={undefined} />

      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1">
        {/* Breadcrumb + header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Проекты
          </Link>
          <span className="text-[var(--border)]">/</span>
          <span className="text-sm font-semibold text-[var(--text-1)]">Каталог материалов</span>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">Каталог материалов</h1>
            <p className="text-sm text-[var(--text-3)] mt-0.5">
              Системные + пользовательские расценки для сметного расчёта
            </p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Добавить позицию
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Всего позиций', value: items.length, icon: Layers, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
            { label: 'Системных', value: systemCount + items.filter(i => i.isSystem).length - systemCount, icon: Box, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30', total: true },
            { label: 'Пользовательских', value: items.filter(i => !i.isSystem).length, icon: Package, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xl font-bold text-[var(--text-1)]">{s.total ? items.filter(i => i.isSystem).length : s.value}</div>
                <div className="text-xs text-[var(--text-3)]">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          {/* Sidebar categories */}
          <div className="w-44 flex-shrink-0">
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-1.5 space-y-0.5">
              {CATEGORIES.map((cat) => {
                const count = cat.id === 'all' ? items.length : items.filter((i) => i.category === cat.id).length;
                const Icon = (cat as any).icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors
                      ${activeCategory === cat.id
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-[var(--text-2)] hover:bg-[var(--bg-input)]'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {Icon ? (
                        <Icon className="w-3.5 h-3.5" />
                      ) : (
                        <div className="w-2 h-2 rounded-full" style={{ background: (cat as any).color }} />
                      )}
                      <span className="truncate">{cat.label}</span>
                    </div>
                    <span className={`text-xs ${activeCategory === cat.id ? 'text-blue-100' : 'text-[var(--text-3)]'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Search bar + add form */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по каталогу..."
                className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--text-1)]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Add Form */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="bg-[var(--bg-card)] rounded-xl border-2 border-blue-500/50 shadow-lg"
                >
                  <ItemForm
                    initial={{ ...emptyForm, category: activeCategory !== 'all' ? activeCategory : 'wall' }}
                    onSave={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                    title="Новая позиция каталога"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items count */}
            <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
              <span>{filtered.length} позиций{search ? ` по запросу "${search}"` : ''}</span>
              <span>{systemCount} системных · {customCount} пользовательских</span>
            </div>

            {/* Items list */}
            {loading ? (
              <div className="space-y-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 mx-auto mb-3 text-[var(--text-3)] opacity-30" />
                <p className="text-[var(--text-3)] text-sm">Ничего не найдено</p>
                <button
                  onClick={() => { setSearch(''); setShowAddForm(true); }}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Добавить позицию
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <AnimatePresence>
                  {filtered.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      {editingId === item.id ? (
                        <div className="bg-[var(--bg-card)] rounded-xl border-2 border-blue-500/50 shadow-lg">
                          <ItemForm
                            initial={{
                              name: item.name,
                              category: item.category,
                              unit: item.unit,
                              unitPrice: String(item.unitPrice),
                              description: item.description || '',
                            }}
                            onSave={(f) => handleEdit(item.id, f)}
                            onCancel={() => setEditingId(null)}
                            title="Редактирование позиции"
                          />
                        </div>
                      ) : (
                        <div className="group bg-[var(--bg-card)] rounded-xl border border-[var(--border)] px-3 py-2.5 flex items-center gap-3 hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                          {/* Color indicator */}
                          <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: catColor(item.category) }} />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--text-1)] truncate">{item.name}</span>
                              {item.isSystem && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-full font-medium flex-shrink-0">
                                  системная
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-[var(--text-3)] truncate mt-0.5">{item.description}</p>
                            )}
                          </div>

                          {/* Category badge */}
                          <span className="hidden sm:inline text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0"
                            style={{ background: catColor(item.category) + '20', color: catColor(item.category) }}>
                            {catLabel(item.category)}
                          </span>

                          {/* Unit + price */}
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-semibold text-[var(--text-1)]">{fmt(item.unitPrice)}</div>
                            <div className="text-xs text-[var(--text-3)]">за {unitLabel(item.unit)}</div>
                          </div>

                          {/* Actions */}
                          {!item.isSystem && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingId(item.id)}
                                className="p-1.5 text-[var(--text-3)] hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                disabled={deletingId === item.id}
                                className="p-1.5 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                                title="Удалить"
                              >
                                {deletingId === item.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                          {item.isSystem && (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)] opacity-0 group-hover:opacity-100 transition-opacity rotate-[-90deg]" />
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
