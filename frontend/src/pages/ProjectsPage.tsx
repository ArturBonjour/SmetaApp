import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import type { Project, ProjectTemplate } from '../types';
import toast from 'react-hot-toast';
import { Plus, Building2, Clock, Trash2, ChevronRight, Search, Copy, TrendingUp, FolderOpen, CheckCircle, Archive } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';

interface Props {
  onCommandPalette?: () => void;
}

interface Stats {
  total: number;
  totalAmount: number;
  byStatus: { draft: number; active: number; completed: number; archived: number };
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:     { label: 'Черновик',  bg: 'bg-slate-100 dark:bg-slate-800',  text: 'text-slate-600 dark:text-slate-300',  dot: 'bg-slate-400' },
  active:    { label: 'Активный',  bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
  completed: { label: 'Завершён',  bg: 'bg-green-50 dark:bg-green-950/40', text: 'text-green-700 dark:text-green-300',  dot: 'bg-green-500' },
  archived:  { label: 'Архив',     bg: 'bg-yellow-50 dark:bg-yellow-950/40', text: 'text-yellow-700 dark:text-yellow-300', dot: 'bg-yellow-500' },
};

const FILTER_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'draft', label: 'Черновики' },
  { id: 'active', label: 'Активные' },
  { id: 'completed', label: 'Завершённые' },
];

function SkeletonCard() {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 animate-pulse">
      <div className="h-4 bg-[var(--bg-input)] rounded w-3/4 mb-3" />
      <div className="h-3 bg-[var(--bg-input)] rounded w-1/2 mb-4" />
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-20 bg-[var(--bg-input)] rounded-full" />
      </div>
      <div className="h-3 bg-[var(--bg-input)] rounded w-1/3" />
    </div>
  );
}

export default function ProjectsPage({ onCommandPalette }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newForm, setNewForm] = useState({ name: '', description: '', templateId: '' });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Listen for "open new project" event from command palette
  useEffect(() => {
    const handler = () => setShowNew(true);
    window.addEventListener('open-new-project', handler);
    return () => window.removeEventListener('open-new-project', handler);
  }, []);

  const loadData = async () => {
    try {
      const [pRes, tRes, sRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/templates/list'),
        api.get('/projects/stats'),
      ]);
      setProjects(pRes.data);
      setTemplates(tRes.data);
      setStats(sRes.data);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newForm.name.trim()) { toast.error('Введите название'); return; }
    setCreating(true);
    try {
      const { data } = await api.post('/projects', newForm);
      setShowNew(false);
      setNewForm({ name: '', description: '', templateId: '' });
      navigate(`/projects/${data.id}`);
    } catch {
      toast.error('Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Удалить проект? Это действие необратимо.')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((pr) => pr.id !== id));
      setStats((s) => s ? { ...s, total: s.total - 1 } : s);
      toast.success('Проект удалён');
    } catch { toast.error('Ошибка'); }
  };

  const duplicateProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    try {
      const { data } = await api.post(`/projects/${id}/duplicate`);
      setProjects((p) => [data, ...p]);
      toast.success('Проект скопирован');
    } catch { toast.error('Ошибка копирования'); }
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statCards = stats ? [
    { label: 'Всего проектов', value: stats.total, icon: <FolderOpen className="w-5 h-5" />, color: 'text-blue-500' },
    { label: 'Активных', value: stats.byStatus.active, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-500' },
    { label: 'Завершённых', value: stats.byStatus.completed, icon: <CheckCircle className="w-5 h-5" />, color: 'text-purple-500' },
    {
      label: 'Общая сумма',
      value: stats.totalAmount > 0 ? `${(stats.totalAmount / 1_000_000).toFixed(1)} млн ₽` : '—',
      icon: <Archive className="w-5 h-5" />,
      color: 'text-orange-500',
    },
  ] : [];

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Navbar onCommandPalette={onCommandPalette} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Banner */}
        {!loading && stats && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] px-5 py-4"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className={`${card.color} mb-2`}>{card.icon}</div>
                <div className="text-2xl font-bold text-[var(--text-1)]">{card.value}</div>
                <div className="text-xs text-[var(--text-3)] mt-0.5">{card.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-1)]">Проекты</h1>
            <p className="text-[var(--text-3)] mt-0.5 text-sm">
              {filtered.length} из {projects.length}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Новый проект
          </motion.button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-1)] placeholder:text-[var(--text-3)] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-1">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* New Project Modal */}
        <AnimatePresence>
          {showNew && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                onClick={() => setShowNew(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={() => setShowNew(false)}
              >
                <div
                  className="bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-[var(--border)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="text-xl font-bold text-[var(--text-1)] mb-6">Новый проект</h2>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Название *</label>
                      <input
                        autoFocus
                        type="text"
                        value={newForm.name}
                        onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && createProject()}
                        className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Баня для Ивановых"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-2)] mb-1">Описание</label>
                      <textarea
                        value={newForm.description}
                        onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-1)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder="Краткое описание..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-2)] mb-2">Шаблон (необязательно)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setNewForm({ ...newForm, templateId: '' })}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            !newForm.templateId
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                              : 'border-[var(--border)] hover:border-[var(--text-3)]'
                          }`}
                        >
                          <div className="text-lg mb-1">📐</div>
                          <div className="font-medium text-sm text-[var(--text-1)]">Пустой</div>
                          <div className="text-xs text-[var(--text-3)]">Начать с нуля</div>
                        </button>
                        {templates.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setNewForm({ ...newForm, templateId: t.id })}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              newForm.templateId === t.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-[var(--border)] hover:border-[var(--text-3)]'
                            }`}
                          >
                            <div className="text-lg mb-1">{t.preview}</div>
                            <div className="font-medium text-sm text-[var(--text-1)]">{t.name}</div>
                            <div className="text-xs text-[var(--text-3)]">{t.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowNew(false)}
                      className="flex-1 py-2.5 border border-[var(--border)] text-[var(--text-2)] rounded-xl hover:bg-[var(--bg-input)] transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={createProject}
                      disabled={creating}
                      className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                    >
                      {creating ? 'Создание...' : 'Создать'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
            <Building2 className="w-14 h-14 text-[var(--text-3)] mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-medium text-[var(--text-2)] mb-2">
              {search || statusFilter !== 'all' ? 'Проекты не найдены' : 'Нет проектов'}
            </h3>
            <p className="text-[var(--text-3)] text-sm mb-6">
              {search || statusFilter !== 'all'
                ? 'Попробуйте изменить фильтры'
                : 'Создайте первый проект, нажав кнопку выше'}
            </p>
            {!search && statusFilter === 'all' && (
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" /> Создать проект
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filtered.map((project, i) => {
                const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
                const estimationTotal = (project as any).estimationTotal as number | undefined;
                return (
                  <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/projects/${project.id}`}
                      className="block bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 hover:border-blue-400 dark:hover:border-blue-600 group"
                      style={{
                        boxShadow: 'var(--shadow-card)',
                        transition: 'box-shadow 0.2s, border-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-[var(--text-1)] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {project.name}
                          </h3>
                          {project.description && (
                            <p className="text-sm text-[var(--text-3)] mt-0.5 line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => duplicateProject(project.id, e)}
                            className="p-1.5 text-[var(--text-3)] hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title="Дублировать"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => deleteProject(project.id, e)}
                            className="p-1.5 text-[var(--text-3)] hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Удалить"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                        {project._count && project._count.versions > 1 && (
                          <span className="text-xs text-[var(--text-3)]">v{project._count.versions}</span>
                        )}
                      </div>

                      {/* Estimation total */}
                      {estimationTotal != null && estimationTotal > 0 && (
                        <div className="mb-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {estimationTotal.toLocaleString('ru-RU')} ₽
                        </div>
                      )}

                      <div className="flex items-center gap-1 text-xs text-[var(--text-3)]">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(project.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        <ChevronRight className="w-3 h-3 ml-auto text-[var(--border)] group-hover:text-blue-400 transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
