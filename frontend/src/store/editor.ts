import { create } from 'zustand';
import type { GeometryElement, ProjectGeometry } from '../types';

interface HistoryEntry {
  elements: GeometryElement[];
}

interface EditorState {
  geometry: ProjectGeometry;
  selectedId: string | null;
  tool: 'select' | 'wall' | 'floor' | 'roof' | 'window' | 'door' | 'foundation';
  snapToGrid: boolean;
  gridSize: number; // pixels per meter
  scale: number;
  history: HistoryEntry[];
  historyIndex: number;
  isDirty: boolean;

  setGeometry: (g: ProjectGeometry) => void;
  setTool: (t: EditorState['tool']) => void;
  setSelectedId: (id: string | null) => void;
  addElement: (el: GeometryElement) => void;
  updateElement: (id: string, updates: Partial<GeometryElement>) => void;
  removeElement: (id: string) => void;
  updateDimensions: (width: number, height: number) => void;
  undo: () => void;
  redo: () => void;
  markClean: () => void;
  setScale: (s: number) => void;
  toggleSnap: () => void;
}

const MAX_HISTORY = 50;

function pushHistory(state: EditorState, elements: GeometryElement[]): Partial<EditorState> {
  const newHistory = [...state.history.slice(0, state.historyIndex + 1), { elements: JSON.parse(JSON.stringify(elements)) }];
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  return {
    history: newHistory,
    historyIndex: newHistory.length - 1,
    isDirty: true,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  geometry: { width: 10, height: 8, elements: [] },
  selectedId: null,
  tool: 'select',
  snapToGrid: true,
  gridSize: 60,
  scale: 60,
  history: [],
  historyIndex: -1,
  isDirty: false,

  setGeometry: (g) => set({ geometry: g, history: [{ elements: JSON.parse(JSON.stringify(g.elements)) }], historyIndex: 0, isDirty: false }),

  setTool: (tool) => set({ tool }),

  setSelectedId: (selectedId) => set({ selectedId }),

  addElement: (el) => {
    const state = get();
    const elements = [...state.geometry.elements, el];
    set({
      geometry: { ...state.geometry, elements },
      ...pushHistory(state, elements),
      selectedId: el.id,
    });
  },

  updateElement: (id, updates) => {
    const state = get();
    const elements = state.geometry.elements.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({
      geometry: { ...state.geometry, elements },
      ...pushHistory(state, elements),
    });
  },

  removeElement: (id) => {
    const state = get();
    const elements = state.geometry.elements.filter((e) => e.id !== id);
    set({
      geometry: { ...state.geometry, elements },
      ...pushHistory(state, elements),
      selectedId: state.selectedId === id ? null : state.selectedId,
    });
  },

  updateDimensions: (width, height) => {
    const state = get();
    set({ geometry: { ...state.geometry, width, height }, isDirty: true });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    const idx = state.historyIndex - 1;
    const elements = JSON.parse(JSON.stringify(state.history[idx].elements));
    set({ geometry: { ...state.geometry, elements }, historyIndex: idx, isDirty: true });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    const idx = state.historyIndex + 1;
    const elements = JSON.parse(JSON.stringify(state.history[idx].elements));
    set({ geometry: { ...state.geometry, elements }, historyIndex: idx, isDirty: true });
  },

  markClean: () => set({ isDirty: false }),
  setScale: (scale) => set({ scale }),
  toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
}));
