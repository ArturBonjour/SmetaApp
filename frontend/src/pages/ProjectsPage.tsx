import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import type { Project, ProjectTemplate } from '../types';
import toast from 'react-hot-toast';
import { Plus, Building2, Clock, Trash2, ChevronRight, Search } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Черновик', color: 'bg-gray-100 text-gray-600' },
  active: { label: 'Активный', color: 'bg-blue-100 text-blue-600' },
  completed: { label: 'Завершён', color: 'bg-green-100 text-green-600' },
  archived: { label: 'Архив', color: 'bg-yellow-100 text-yellow-600' },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');
  const [newForm, setNewForm] = useState({ name: '', description: '', templateId: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pRes, tRes] = await Promise.all([
        api.get('/projects'),
        api.get('/projects/templates/list'),
      ]);
      setProjects(pRes.data);
      setTemplates(tRes.data);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newForm.name.trim()) { toast.error('Введите название'); return; }
    try {
      const { data } = await api.post('/projects', newForm);
      setShowNew(false);
      setNewForm({ name: '', description: '', templateId: '' });
      navigate(`/projects/${data.id}`);
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Удалить проект?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(p => p.filter(pr => pr.id !== id));
      toast.success('Удалено');
    } catch {
      toast.error('Ошибка');
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
            <p className="text-gray-500 mt-1">{projects.length} проект{projects.length !== 1 ? 'ов' : ''}</p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Новый проект
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск проектов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* New Project Modal */}
        {showNew && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
              <h2 className="text-xl font-bold mb-6">Новый проект</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                  <input
                    autoFocus
                    type="text"
                    value={newForm.name}
                    onChange={e => setNewForm({ ...newForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Баня для Ивановых"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                  <textarea
                    value={newForm.description}
                    onChange={e => setNewForm({ ...newForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Краткое описание..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Шаблон (необязательно)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setNewForm({ ...newForm, templateId: '' })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${!newForm.templateId ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="text-lg mb-1">📐</div>
                      <div className="font-medium text-sm">Пустой</div>
                      <div className="text-xs text-gray-500">Начать с нуля</div>
                    </button>
                    {templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setNewForm({ ...newForm, templateId: t.id })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${newForm.templateId === t.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="text-lg mb-1">{t.preview}</div>
                        <div className="font-medium text-sm">{t.name}</div>
                        <div className="text-xs text-gray-500">{t.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Отмена</button>
                <button onClick={createProject} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium">Создать</button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">
              {search ? 'Проекты не найдены' : 'Нет проектов'}
            </h3>
            <p className="text-gray-400">
              {search ? 'Попробуйте другой поиск' : 'Создайте первый проект, нажав кнопку выше'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => {
              const status = STATUS_LABELS[project.status] || STATUS_LABELS.draft;
              return (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <button
                      onClick={e => deleteProject(project.id, e)}
                      className="ml-2 p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                      {status.label}
                    </span>
                    {project._count && (
                      <span className="text-xs text-gray-400">{project._count.versions} верс.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-3">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(project.updatedAt).toLocaleDateString('ru-RU')}</span>
                    <ChevronRight className="w-3 h-3 ml-auto text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
