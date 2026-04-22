import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, RotateCcw, Clock, Tag, ChevronRight } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Version {
  id: string;
  version: number;
  label?: string;
  createdAt: string;
}

interface Props {
  projectId: string;
  currentVersionId?: string;
  onRestored: () => void;
}

export default function VersionHistoryPanel({ projectId, currentVersionId, onRestored }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/versions`);
      setVersions(data);
    } catch {
      toast.error('Ошибка загрузки версий');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (versionId: string, versionNum: number) => {
    if (versionId === currentVersionId) return;
    setRestoring(versionId);
    try {
      await api.post(`/projects/${projectId}/versions/${versionId}/restore`);
      toast.success(`Восстановлена версия ${versionNum}`);
      onRestored();
    } catch {
      toast.error('Ошибка восстановления версии');
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center gap-2">
        <History className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-sm text-[var(--text-1)]">История версий</span>
        <span className="ml-auto text-xs text-[var(--text-3)]">{versions.length} версий</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-[var(--bg-input)] animate-pulse" />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--text-3)] text-sm">
            <History className="w-8 h-8 mb-2 opacity-30" />
            Нет версий
          </div>
        ) : (
          <div className="space-y-1">
            {versions.map((v, idx) => {
              const isCurrent = v.id === currentVersionId;
              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`group relative p-2.5 rounded-lg border transition-all cursor-default
                    ${isCurrent
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--bg-input)]'
                    }`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${isCurrent ? 'bg-blue-600 text-white' : 'bg-[var(--bg-input)] text-[var(--text-2)]'}`}>
                      {v.version}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {v.label && (
                          <span className="flex items-center gap-1 text-xs font-medium text-[var(--text-1)] truncate">
                            <Tag className="w-3 h-3" />
                            {v.label}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">
                            текущая
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-[11px] text-[var(--text-3)]">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDate(v.createdAt)}
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(v.id, v.version)}
                        disabled={restoring === v.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
                        title="Восстановить эту версию"
                      >
                        {restoring === v.id ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {isCurrent && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-[var(--border)] text-[11px] text-[var(--text-3)] text-center">
        Каждое сохранение создаёт новую точку восстановления
      </div>
    </div>
  );
}
