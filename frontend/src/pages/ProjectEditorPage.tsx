import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import type { Project } from '../types';
import { useEditorStore } from '../store/editor';
import Editor from '../components/Editor/Editor';
import Toolbar from '../components/Editor/Toolbar';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import EstimationPanel from '../components/Estimation/EstimationPanel';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, RefreshCw, Loader2, CheckCircle, PanelLeft, PanelRight } from 'lucide-react';

export default function ProjectEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimationKey, setEstimationKey] = useState(0);
  const [showProps, setShowProps] = useState(true);
  const [showEstimation, setShowEstimation] = useState(true);
  const { setGeometry, geometry, isDirty, markClean } = useEditorStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); useEditorStore.getState().undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); useEditorStore.getState().redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveGeometry(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!isDirty || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGeometry(true);
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [geometry, isDirty, id]);

  const loadProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      if (data.currentVersion?.geometryJson) {
        const g = JSON.parse(data.currentVersion.geometryJson);
        setGeometry(g);
      }
    } catch {
      toast.error('Ошибка загрузки проекта');
    } finally {
      setLoading(false);
    }
  };

  const saveGeometry = useCallback(async (silent = false) => {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/projects/${id}/geometry`, {
        geometryJson: JSON.stringify(geometry),
      });
      markClean();
      setEstimationKey(k => k + 1);
      if (!silent) toast.success('Сохранено');
    } catch {
      if (!silent) toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [id, geometry, markClean]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center px-3 gap-3 flex-shrink-0 z-30">
        <Link to="/" className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-800 truncate">{project?.name || 'Проект'}</h1>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {saving ? (
            <><RefreshCw className="w-3 h-3 animate-spin" />Сохранение...</>
          ) : isDirty ? (
            <><div className="w-2 h-2 rounded-full bg-orange-400" />Изменено</>
          ) : (
            <><CheckCircle className="w-3 h-3 text-green-500" />Сохранено</>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => saveGeometry(false)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Сохранить
        </button>

        {/* Panel toggles */}
        <button
          onClick={() => setShowProps(s => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showProps ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          title="Свойства"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowEstimation(s => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showEstimation ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          title="Смета"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <Toolbar />

        {/* Canvas */}
        <div className="flex-1 overflow-hidden">
          <Editor />
        </div>

        {/* Properties Panel */}
        {showProps && (
          <div className="w-60 flex-shrink-0 bg-white border-l border-gray-200 overflow-y-auto">
            <PropertiesPanel projectId={id!} />
          </div>
        )}

        {/* Estimation Panel */}
        {showEstimation && (
          <div className="w-72 flex-shrink-0 bg-white border-l border-gray-200">
            <EstimationPanel projectId={id!} refreshKey={estimationKey} />
          </div>
        )}
      </div>
    </div>
  );
}
