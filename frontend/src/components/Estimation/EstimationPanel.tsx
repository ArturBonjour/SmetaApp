import { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { Estimation } from '../../types';
import { FileSpreadsheet, FileText, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
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

  const downloadExcel = () => {
    const token = localStorage.getItem('smeta_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/estimation/${projectId}/export/excel`;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smeta.xlsx';
    // Add auth header via fetch
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url2 = URL.createObjectURL(blob);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = 'smeta.xlsx';
        a2.click();
        URL.revokeObjectURL(url2);
      });
  };

  const downloadPdf = () => {
    const token = localStorage.getItem('smeta_token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/estimation/${projectId}/export/pdf`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url2 = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url2;
        a.download = 'smeta.pdf';
        a.click();
        URL.revokeObjectURL(url2);
      });
  };

  if (loading) return <div className="p-4 text-gray-400 text-sm">Расчёт сметы...</div>;
  if (!estimation) return <div className="p-4 text-gray-400 text-sm">Нет данных</div>;

  const base = estimation.totalAmount;
  const markupAmt = base * (markup / 100);
  const discountAmt = base * (discount / 100);
  const final = base + markupAmt - discountAmt;

  // Group by category for chart
  const catTotals = estimation.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
    return acc;
  }, {});
  const chartData = Object.entries(catTotals).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat] || cat, value,
  }));

  // Group items by category
  const grouped = estimation.items.reduce<Record<string, typeof estimation.items>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Смета
          </h3>
          <div className="flex gap-1.5">
            <button onClick={downloadExcel} title="Скачать Excel" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </button>
            <button onClick={downloadPdf} title="Скачать PDF" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Total */}
        <div className="bg-blue-600 rounded-xl px-4 py-3 text-white">
          <div className="text-xs opacity-80 mb-0.5">Итого к оплате</div>
          <div className="text-2xl font-bold">{final.toLocaleString('ru-RU')} ₽</div>
          {base !== final && (
            <div className="text-xs opacity-70 mt-0.5">База: {base.toLocaleString('ru-RU')} ₽</div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Adjustments */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Наценка (%)</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={markup}
                  onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                  min="0" max="100"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Скидка (%)</label>
              <input
                type="number"
                value={discount}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0" max="100"
              />
            </div>
          </div>
          <button
            onClick={applyAdjustments}
            className="mt-2 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors font-medium"
          >
            Применить
          </button>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setShowChart(c => !c)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 mb-2"
            >
              <span>Структура затрат</span>
              {showChart ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showChart && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`${Number(v ?? 0).toLocaleString('ru-RU')} ₽`, '' as const]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Line items grouped by category */}
        {Object.keys(grouped).length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Добавьте элементы на план,<br />чтобы увидеть смету
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(grouped).map(([cat, items], catIdx) => {
              const catTotal = items.reduce((s, i) => s + i.totalPrice, 0);
              const isExpanded = expandedCats.has(cat);
              return (
                <div key={cat}>
                  <button
                    onClick={() => toggleCat(cat)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[catIdx % CATEGORY_COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-700">{CATEGORY_LABELS[cat] || cat}</span>
                      <span className="text-xs text-gray-400">×{items.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{catTotal.toLocaleString('ru-RU')} ₽</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="bg-gray-50 px-4 pb-2">
                      {items.map(item => (
                        <div key={item.id} className="py-2 border-b border-gray-100 last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">{item.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {item.quantity} {UNIT_LABELS[item.unit] || item.unit} × {item.unitPrice.toLocaleString('ru-RU')} ₽
                              </div>
                              {item.formula && (
                                <div className="text-xs text-blue-500 mt-0.5">{item.formula}</div>
                              )}
                            </div>
                            <div className="text-xs font-bold text-gray-800 whitespace-nowrap">
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
      </div>
    </div>
  );
}
