import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import type { Project } from '../types';
import { useEditorStore } from '../store/editor';
import Editor from '../components/Editor/Editor';
import Toolbar from '../components/Editor/Toolbar';
import PropertiesPanel from '../components/Editor/PropertiesPanel';
import EstimationPanel from '../components/Estimation/EstimationPanel';
import VersionHistoryPanel from '../components/Editor/VersionHistoryPanel';
import View3D from '../components/Editor/View3D';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, RefreshCw, Loader2, CheckCircle, PanelLeft, PanelRight, Command, History, Box, LayoutDashboard } from 'lucide-react';

interface Props {
  onCommandPalette?: () => void;
}

export default function ProjectEditorPage({ onCommandPalette }: Props) {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimationKey, setEstimationKey] = useState(0);
  const [showProps, setShowProps] = useState(true);
  const [showEstimation, setShowEstimation] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const { setGeometry, geometry, isDirty, markClean } = useEditorStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); useEditorStore.getState().undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); useEditorStore.getState().redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveGeometry(); }
      // Ctrl+Shift+S — save as new version
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') { e.preventDefault(); saveGeometry(false, true); }
      // Toggle 3D with Alt+3
      if (e.altKey && e.key === '3') { e.preventDefault(); setViewMode((m) => m === '2d' ? '3d' : '2d'); }
      // Tool shortcuts
      const toolMap: Record<string, string> = { v: 'select', w: 'wall', f: 'floor', r: 'roof', n: 'foundation', i: 'window', d: 'door' };
      if (!e.ctrlKey && !e.metaKey && !e.altKey && toolMap[e.key.toLowerCase()]) {
        useEditorStore.getState().setTool(toolMap[e.key.toLowerCase()] as any);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!isDirty || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveGeometry(true); }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [geometry, isDirty, id]);

  const loadProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      if (data.currentVersion?.geometryJson) {
        setGeometry(JSON.parse(data.currentVersion.geometryJson));
      }
    } catch {
      toast.error('Ошибка загрузки проекта');
    } finally {
      setLoading(false);
    }
  };

  const saveGeometry = useCallback(async (silent = false, newVersion = false) => {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/projects/${id}/geometry`, { geometryJson: JSON.stringify(geometry), createNewVersion: newVersion });
      markClean();
      setEstimationKey((k) => k + 1);
      if (!silent) toast.success(newVersion ? 'Создана новая версия' : 'Сохранено');
    } catch {
      if (!silent) toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [id, geometry, markClean]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)]">
      {/* Top bar */}
      <div className="h-12 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center px-3 gap-2 flex-shrink-0 z-30">
        <Link
          to="/"
          className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] rounded-lg transition-colors"
          title="Назад к проектам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="w-px h-5 bg-[var(--border)]" />

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[var(--text-1)] text-sm truncate">{project?.name || 'Проект'}</h1>
        </div>

        {/* 2D / 3D toggle */}
        <div className="flex items-center gap-1 bg-[var(--bg-input)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === '2d'
                ? 'bg-[var(--bg-card)] text-[var(--text-1)] shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
            title="2D план (Alt+3 для переключения)"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === '3d'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
            }`}
            title="3D вид (Alt+3 для переключения)"
          >
            <Box className="w-3.5 h-3.5" />
            3D
          </button>
        </div>

        {/* Save status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saving ? 'saving' : isDirty ? 'dirty' : 'saved'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1.5 text-xs text-[var(--text-3)]"
          >
            {saving ? (
              <><RefreshCw className="w-3 h-3 animate-spin" />Сохранение...</>
            ) : isDirty ? (
              <><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Изменено</>
            ) : (
              <><CheckCircle className="w-3 h-3 text-emerald-500" />Сохранено</>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Save button */}
        <button
          onClick={() => saveGeometry(false)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Сохранить
        </button>

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Panel toggles + command palette */}
        <button
          onClick={() => setShowProps((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors text-xs ${showProps ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="Свойства"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowEstimation((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showEstimation ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="Смета"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="История версий"
        >
          <History className="w-4 h-4" />
        </button>
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
            title="Командная палитра (⌘K)"
          >
            <Command className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar — only show in 2D mode */}
        {viewMode === '2d' && <Toolbar />}

        {/* Canvas / 3D view */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {viewMode === '2d' ? (
              <motion.div
                key="2d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                <Editor />
              </motion.div>
            ) : (
              <motion.div
                key="3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0"
              >
                <View3D
                  elements={geometry.elements}
                  buildingWidth={geometry.width}
                  buildingDepth={geometry.height}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Properties Panel */}
        <AnimatePresence>
          {showProps && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-y-auto overflow-x-hidden"
            >
              <PropertiesPanel projectId={id!} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-y-auto overflow-x-hidden"
            >
              <VersionHistoryPanel
                projectId={id!}
                currentVersionId={project?.currentVersionId}
                onRestored={() => { loadProject(); setEstimationKey((k) => k + 1); setShowHistory(false); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimation Panel */}
        <AnimatePresence>
          {showEstimation && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-hidden"
            >
              <EstimationPanel projectId={id!} refreshKey={estimationKey} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


interface Props {
  onCommandPalette?: () => void;
}

export default function ProjectEditorPage({ onCommandPalette }: Props) {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estimationKey, setEstimationKey] = useState(0);
  const [showProps, setShowProps] = useState(true);
  const [showEstimation, setShowEstimation] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const { setGeometry, geometry, isDirty, markClean } = useEditorStore();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (id) loadProject();
  }, [id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); useEditorStore.getState().undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); useEditorStore.getState().redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveGeometry(); }
      // Ctrl+Shift+S — save as new version
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') { e.preventDefault(); saveGeometry(false, true); }
      // Tool shortcuts
      const toolMap: Record<string, string> = { v: 'select', w: 'wall', f: 'floor', r: 'roof', n: 'foundation', i: 'window', d: 'door' };
      if (!e.ctrlKey && !e.metaKey && !e.altKey && toolMap[e.key.toLowerCase()]) {
        useEditorStore.getState().setTool(toolMap[e.key.toLowerCase()] as any);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!isDirty || !id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveGeometry(true); }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [geometry, isDirty, id]);

  const loadProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data);
      if (data.currentVersion?.geometryJson) {
        setGeometry(JSON.parse(data.currentVersion.geometryJson));
      }
    } catch {
      toast.error('Ошибка загрузки проекта');
    } finally {
      setLoading(false);
    }
  };

  const saveGeometry = useCallback(async (silent = false, newVersion = false) => {
    if (!id) return;
    setSaving(true);
    try {
      await api.put(`/projects/${id}/geometry`, { geometryJson: JSON.stringify(geometry), createNewVersion: newVersion });
      markClean();
      setEstimationKey((k) => k + 1);
      if (!silent) toast.success(newVersion ? 'Создана новая версия' : 'Сохранено');
    } catch {
      if (!silent) toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }, [id, geometry, markClean]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)]">
      {/* Top bar */}
      <div className="h-12 bg-[var(--bg-card)] border-b border-[var(--border)] flex items-center px-3 gap-2 flex-shrink-0 z-30">
        <Link
          to="/"
          className="p-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] rounded-lg transition-colors"
          title="Назад к проектам"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div className="w-px h-5 bg-[var(--border)]" />

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-[var(--text-1)] text-sm truncate">{project?.name || 'Проект'}</h1>
        </div>

        {/* Save status */}
        <AnimatePresence mode="wait">
          <motion.div
            key={saving ? 'saving' : isDirty ? 'dirty' : 'saved'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1.5 text-xs text-[var(--text-3)]"
          >
            {saving ? (
              <><RefreshCw className="w-3 h-3 animate-spin" />Сохранение...</>
            ) : isDirty ? (
              <><div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />Изменено</>
            ) : (
              <><CheckCircle className="w-3 h-3 text-emerald-500" />Сохранено</>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Save button */}
        <button
          onClick={() => saveGeometry(false)}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          Сохранить
        </button>

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Panel toggles + command palette */}
        <button
          onClick={() => setShowProps((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors text-xs ${showProps ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="Свойства"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowEstimation((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showEstimation ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="Смета"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600' : 'text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)]'}`}
          title="История версий"
        >
          <History className="w-4 h-4" />
        </button>
        {onCommandPalette && (
          <button
            onClick={onCommandPalette}
            className="p-1.5 rounded-lg text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--bg-input)] transition-colors"
            title="Командная палитра (⌘K)"
          >
            <Command className="w-4 h-4" />
          </button>
        )}
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
        <AnimatePresence>
          {showProps && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-y-auto overflow-x-hidden"
            >
              <PropertiesPanel projectId={id!} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version History Panel */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-y-auto overflow-x-hidden"
            >
              <VersionHistoryPanel
                projectId={id!}
                currentVersionId={project?.currentVersionId}
                onRestored={() => { loadProject(); setEstimationKey((k) => k + 1); setShowHistory(false); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Estimation Panel */}
        <AnimatePresence>
          {showEstimation && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 bg-[var(--bg-sidebar)] border-l border-[var(--border)] overflow-hidden"
            >
              <EstimationPanel projectId={id!} refreshKey={estimationKey} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
