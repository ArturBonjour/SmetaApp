import { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { Estimation } from '../../types';
import { FileSpreadsheet, FileText, TrendingUp, ChevronDown, ChevronUp, MessageSquare, Check } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  projectId: string;
  refreshKey?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  wall: 'Стены', floor: 'Полы', roof: 'Кровля', window: 'Окна',
  door: 'Двери', foundation: 'Фундамент', engineering: 'Инженерия',
  finishing: 'Отделка', other: 'Прочее',
};

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899',
];

const UNIT_LABELS: Record<string, string> = { m2: 'м²', ml: 'м.п.', m3: 'м³', pcs: 'шт', hour: 'ч' };

export default function EstimationPanel({ projectId, refreshKey }: Props) {
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [discount, setDiscount] = useState(0);
  const [markup, setMarkup] = useState(0);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [showChart, setShowChart] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!projectId) return;
    loadEstimation();
  }, [projectId, refreshKey]);

  const loadEstimation = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/estimation/${projectId}`);
      setEstimation(data);
      setDiscount(data?.discount || 0);
      setMarkup(data?.markup || 0);
      setNotes(data?.notes || '');
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const applyAdjustments = async () => {
    try {
      const { data } = await api.put(`/estimation/${projectId}/adjust`, { discount, markup });
      setEstimation(data);
    } catch {}
  };

  const saveNotes = async () => {
    try {
      await api.put(`/estimation/${projectId}/adjust`, { notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {}
  };

  const downloadFile = async (type: 'excel' | 'pdf') => {
    const token = localStorage.getItem('smeta_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/estimation/${projectId}/export/${type}`;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await r.blob();
      const url2 = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url2;
      a.download = `smeta.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      URL.revokeObjectURL(url2);
    } catch {}
  };

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-6 bg-[var(--bg-input)] rounded w-1/2" />
        <div className="h-20 bg-[var(--bg-input)] rounded-xl" />
        <div className="h-4 bg-[var(--bg-input)] rounded w-3/4" />
        <div className="h-4 bg-[var(--bg-input)] rounded w-1/2" />
      </div>
    );
  }
  if (!estimation) {
    return (
      <div className="p-6 text-center text-[var(--text-3)] text-sm">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
        Нет данных о смете
      </div>
    );
  }

  const base = estimation.totalAmount;
  const markupAmt = base * (markup / 100);
  const discountAmt = base * (discount / 100);
  const final = base + markupAmt - discountAmt;

  const catTotals = estimation.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
    return acc;
  }, {});
  const chartData = Object.entries(catTotals).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat] || cat, value,
  }));

  const grouped = estimation.items.reduce<Record<string, typeof estimation.items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-sidebar)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--text-1)] flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Смета
          </h3>
          <div className="flex gap-1.5">
            <button
              onClick={() => downloadFile('excel')}
              title="Скачать Excel"
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button
              onClick={() => downloadFile('pdf')}
              title="Скачать PDF"
              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Total amount card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl px-4 py-3.5 text-white">
          <div className="text-xs opacity-75 mb-0.5">Итого к оплате</div>
          <div className="text-2xl font-bold tracking-tight">{final.toLocaleString('ru-RU')} ₽</div>
          {base !== final && (
            <div className="text-xs opacity-60 mt-1">База: {base.toLocaleString('ru-RU')} ₽</div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Adjustments */}
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-[var(--text-3)] block mb-1">Наценка (%)</label>
              <input
                type="number"
                value={markup}
                onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0" max="200"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-3)] block mb-1">Скидка (%)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0" max="100"
              />
            </div>
          </div>
          <button
            onClick={applyAdjustments}
            className="w-full py-1.5 bg-[var(--bg-input)] hover:bg-[var(--border)] text-[var(--text-2)] text-sm rounded-lg transition-colors font-medium"
          >
            Применить
          </button>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <button
              onClick={() => setShowChart((c) => !c)}
              className="flex items-center justify-between w-full text-sm font-medium text-[var(--text-2)] mb-2"
            >
              <span>Структура затрат</span>
              {showChart ? <ChevronUp className="w-4 h-4 text-[var(--text-3)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-3)]" />}
            </button>
            {showChart && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={42}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString('ru-RU')} ₽`, '' as const]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Line items */}
        {Object.keys(grouped).length === 0 ? (
          <div className="px-4 py-10 text-center text-[var(--text-3)] text-sm">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
            Добавьте элементы на план,<br />чтобы увидеть смету
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {Object.entries(grouped).map(([cat, items], catIdx) => {
              const catTotal = items.reduce((s, i) => s + i.totalPrice, 0);
              const isExpanded = expandedCats.has(cat);
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[var(--bg-input)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length] }} />
                      <span className="text-sm font-medium text-[var(--text-2)]">{CATEGORY_LABELS[cat] || cat}</span>
                      <span className="text-xs text-[var(--text-3)]">×{items.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-1)]">{catTotal.toLocaleString('ru-RU')} ₽</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-3)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)]" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="bg-[var(--bg-input)] px-4 pb-2">
                      {items.map((item) => (
                        <div key={item.id} className="py-2 border-b border-[var(--border)] last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-[var(--text-1)] truncate">{item.name}</div>
                              <div className="text-xs text-[var(--text-3)] mt-0.5">
                                {item.quantity} {UNIT_LABELS[item.unit] || item.unit} × {item.unitPrice.toLocaleString('ru-RU')} ₽
                              </div>
                              {item.formula && (
                                <div className="text-xs text-blue-500 mt-0.5 font-mono">{item.formula}</div>
                              )}
                            </div>
                            <div className="text-xs font-bold text-[var(--text-1)] whitespace-nowrap">
                              {item.totalPrice.toLocaleString('ru-RU')} ₽
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {/* Notes */}
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[var(--text-3)] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Примечания к смете
            </span>
            <button
              onClick={saveNotes}
              className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg transition-all ${
                notesSaved
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'text-[var(--text-3)] hover:bg-[var(--bg-input)]'
              }`}
            >
              {notesSaved ? <><Check className="w-3 h-3" />Сохранено</> : 'Сохранить'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Добавьте примечания, условия, специфику объекта..."
            rows={3}
            className="w-full px-2.5 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-[var(--text-3)]"
          />
        </div>
      </div>
    </div>
  );
}
