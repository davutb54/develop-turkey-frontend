import { create } from 'zustand';
import type { Node } from '@xyflow/react';
import type { ContextMenuPosition } from './WorkflowContextMenu';
import type { NodeMenuPosition } from './NodeContextMenu';

export type CanvasView = 'builder' | 'list' | 'logs';

type CanvasStore = {
  ruleName: string;
  currentRuleId: number | null;
  showDefPanel: boolean;
  view: CanvasView;
  canvasMenu: ContextMenuPosition | null;
  nodeMenu: NodeMenuPosition | null;
  clipboard: Node | null;

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
};

// Modül-düzeyi sayaç — React render döngüsünün dışında tutulur.
let _nodeIdCounter = 10;
export const getNewNodeId = () => `node-${++_nodeIdCounter}`;

export const useWorkflowCanvasStore = create<CanvasStore>()((set) => ({
  ruleName: 'Yeni Kural',
  currentRuleId: null,
  showDefPanel: false,
  view: 'builder',
  canvasMenu: null,
  nodeMenu: null,
  clipboard: null,

  setRuleName:     (ruleName)     => set({ ruleName }),
  setCurrentRuleId:(currentRuleId)=> set({ currentRuleId }),
  toggleDefPanel:  ()             => set((s) => ({ showDefPanel: !s.showDefPanel })),
  setView:         (view)         => set({ view }),
  setCanvasMenu:   (canvasMenu)   => set({ canvasMenu }),
  setNodeMenu:     (nodeMenu)     => set({ nodeMenu }),
  setClipboard:    (clipboard)    => set({ clipboard }),
  closeMenus:      ()             => set({ canvasMenu: null, nodeMenu: null }),
  resetCanvas:     ()             => set({ ruleName: 'Yeni Kural', currentRuleId: null }),
}));
