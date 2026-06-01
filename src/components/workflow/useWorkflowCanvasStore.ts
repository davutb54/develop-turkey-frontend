import { create } from 'zustand';
import type { Edge, Node } from '@xyflow/react';
import type { ContextMenuPosition } from './WorkflowContextMenu';
import type { NodeMenuPosition } from './NodeContextMenu';

export type CanvasView = 'builder' | 'list' | 'logs' | 'runs';

type HistoryEntry = { nodes: Node[]; edges: Edge[] };

const HISTORY_LIMIT = 50;

type CanvasStore = {
  ruleName: string;
  currentRuleId: number | null;
  showDefPanel: boolean;
  view: CanvasView;
  canvasMenu: ContextMenuPosition | null;
  nodeMenu: NodeMenuPosition | null;
  clipboard: Node | null;

  // ── History ──────────────────────────────────────────────────────
  history: HistoryEntry[];
  historyIndex: number;

  setRuleName: (name: string) => void;
  setCurrentRuleId: (id: number | null) => void;
  toggleDefPanel: () => void;
  setView: (view: CanvasView) => void;
  setCanvasMenu: (pos: ContextMenuPosition | null) => void;
  setNodeMenu: (pos: NodeMenuPosition | null) => void;
  setClipboard: (node: Node | null) => void;
  closeMenus: () => void;
  /** Kural adını ve ID'sini "Yeni Kural" / null'a sıfırlar. */
  resetCanvas: () => void;

  pushHistory: (nodes: Node[], edges: Edge[]) => void;
  resetHistory: () => void;
  /** Bir adım geri alır; geri dönülecek entry'yi döndürür (yoksa null). */
  undo: () => HistoryEntry | null;
  /** Bir adım ileri alır; geri dönülecek entry'yi döndürür (yoksa null). */
  redo: () => HistoryEntry | null;
};

// Modül-düzeyi sayaç — React render döngüsünün dışında tutulur.
let _nodeIdCounter = 10;
export const getNewNodeId = () => `node-${++_nodeIdCounter}`;

export const useWorkflowCanvasStore = create<CanvasStore>()((set, get) => ({
  ruleName: 'Yeni Kural',
  currentRuleId: null,
  showDefPanel: false,
  view: 'builder',
  canvasMenu: null,
  nodeMenu: null,
  clipboard: null,

  history: [],
  historyIndex: -1,

  setRuleName:     (ruleName)     => set({ ruleName }),
  setCurrentRuleId:(currentRuleId)=> set({ currentRuleId }),
  toggleDefPanel:  ()             => set((s) => ({ showDefPanel: !s.showDefPanel })),
  setView:         (view)         => set({ view }),
  setCanvasMenu:   (canvasMenu)   => set({ canvasMenu }),
  setNodeMenu:     (nodeMenu)     => set({ nodeMenu }),
  setClipboard:    (clipboard)    => set({ clipboard }),
  closeMenus:      ()             => set({ canvasMenu: null, nodeMenu: null }),
  resetCanvas:     ()             => set({ ruleName: 'Yeni Kural', currentRuleId: null }),

  pushHistory: (nodes, edges) =>
    set((s) => {
      // Forward history (redo stack) kesilir, yeni dal başlar
      const past = s.history.slice(0, s.historyIndex + 1);
      const next = [...past, { nodes, edges }].slice(-HISTORY_LIMIT);
      return { history: next, historyIndex: next.length - 1 };
    }),

  resetHistory: () => set({ history: [], historyIndex: -1 }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex] ?? null;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex] ?? null;
  },
}));
