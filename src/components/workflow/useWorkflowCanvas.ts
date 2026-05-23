import { useCallback, useRef } from 'react';
import {
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import toast from 'react-hot-toast';
import { useWorkflowStore } from './useWorkflowStore';
import { useWorkflowCanvasStore, getNewNodeId } from './useWorkflowCanvasStore';
import { workflowService } from '../../services/workflowService';
import type { DynamicRule, SaveWorkflowDto } from '../../types';
import type { ActionNodeData } from './ActionNode';

const INITIAL_NODES: Node[] = [
  {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 300, y: 80 },
    data: { label: 'Tetikleyici' },
  },
];

/**
 * ReactFlow bağımlı tüm canvas mantığını kapsayan hook.
 * ReactFlowProvider içindeki bir bileşen tarafından çağrılmalıdır.
 */
export function useWorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { fitView, getNodes, getEdges, screenToFlowPosition } = useReactFlow();

  // ── Canvas store (non-ReactFlow UI state) ──
  const {
    ruleName,
    currentRuleId,
    clipboard,
    setRuleName,
    setCurrentRuleId,
    setClipboard,
    setCanvasMenu,
    setNodeMenu,
    closeMenus,
    resetCanvas,
    setView,
  } = useWorkflowCanvasStore();

  // ── Definitions store ──
  const actions = useWorkflowStore((s) => s.actions);
  const setActiveTrigger = useWorkflowStore((s) => s.setActiveTrigger);

  // ─────────────────────────────────────────────────────────────────
  // Edge / Drop
  // ─────────────────────────────────────────────────────────────────

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setNodes((nds) => nds.concat({ id: getNewNodeId(), type, position, data: { label: type } }));
    },
    [screenToFlowPosition, setNodes]
  );

  // ─────────────────────────────────────────────────────────────────
  // Context menus
  // ─────────────────────────────────────────────────────────────────

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setNodeMenu(null);
      if (!reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const flowPos = screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setCanvasMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y });
    },
    [screenToFlowPosition, setCanvasMenu, setNodeMenu]
  );

  const onNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      event.preventDefault();
      setCanvasMenu(null);
      setNodeMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        nodeType: node.type ?? 'triggerNode',
      });
    },
    [setCanvasMenu, setNodeMenu]
  );

  const onPaneClick = useCallback(() => closeMenus(), [closeMenus]);

  // ─────────────────────────────────────────────────────────────────
  // Node operations
  // ─────────────────────────────────────────────────────────────────

  const handleAddNode = useCallback(
    (type: string, x: number, y: number) =>
      setNodes((nds) =>
        nds.concat({ id: getNewNodeId(), type, position: { x, y }, data: { label: type } })
      ),
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const node = getNodes().find((n) => n.id === id);
      if (!node) return;
      setClipboard(node);
      setNodes((nds) =>
        nds.concat({
          ...node,
          id: getNewNodeId(),
          position: { x: node.position.x + 40, y: node.position.y + 40 },
          selected: false,
        })
      );
    },
    [getNodes, setClipboard, setNodes]
  );

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    setNodes((nds) =>
      nds.concat({
        ...clipboard,
        id: getNewNodeId(),
        position: { x: clipboard.position.x + 60, y: clipboard.position.y + 60 },
        selected: false,
      })
    );
  }, [clipboard, setNodes]);

  const handleDisconnect = useCallback(
    (id: string) => setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id)),
    [setEdges]
  );

  const handleSetColor = useCallback(
    (id: string, color: string) =>
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, accentColor: color } } : n))
      ),
    [setNodes]
  );

  const handleOpenDetail = useCallback(
    (id: string) => {
      const node = getNodes().find((n) => n.id === id);
      if (node)
        alert(
          `Node ID: ${node.id}\nTip: ${node.type}\nKonum: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`
        );
    },
    [getNodes]
  );

  const handleSelectAll = useCallback(
    () => setNodes((nds) => nds.map((n) => ({ ...n, selected: true }))),
    [setNodes]
  );

  const handleClearAll = useCallback(() => {
    if (!window.confirm('Tüm blokları silmek istediğinize emin misiniz?')) return;
    setNodes([]);
    setEdges([]);
    setActiveTrigger('');
  }, [setNodes, setEdges, setActiveTrigger]);

  // ─────────────────────────────────────────────────────────────────
  // Rule load / new
  // ─────────────────────────────────────────────────────────────────

  const handleEditRule = useCallback(
    (rule: DynamicRule) => {
      try {
        const parsed = JSON.parse(rule.flowJson) as { nodes?: Node[]; edges?: Edge[] };
        setNodes(parsed.nodes ?? []);
        setEdges(parsed.edges ?? []);
        setRuleName(rule.name);
        setCurrentRuleId(rule.id);
        setView('builder');

        const triggerEvent =
          (parsed.nodes?.find((n) => n.type === 'triggerNode')?.data as { trigger?: string } | undefined)
            ?.trigger ?? '';
        setActiveTrigger(triggerEvent);

        setTimeout(() => fitView({ duration: 400 }), 120);
        toast.success(`"${rule.name}" editöre yüklendi.`);
      } catch {
        toast.error('Workflow yüklenemedi, JSON geçersiz.');
      }
    },
    [setNodes, setEdges, setRuleName, setCurrentRuleId, setView, setActiveTrigger, fitView]
  );

  const handleNewRule = useCallback(() => {
    setNodes(INITIAL_NODES);
    setEdges([]);
    resetCanvas();
    setView('builder');
    setActiveTrigger('');
  }, [setNodes, setEdges, resetCanvas, setView, setActiveTrigger]);

  // ─────────────────────────────────────────────────────────────────
  // Pre-save validation v1
  // ─────────────────────────────────────────────────────────────────

  const validateCanvas = useCallback((): boolean => {
    const current = getNodes();

    // 1) Tetikleyici bloğu zorunlu
    const triggerNode = current.find((n) => n.type === 'triggerNode');
    if (!triggerNode) {
      toast.error('En az bir Tetikleyici (Trigger) bloğu eklenmelidir.');
      return false;
    }

    // 2) Tetikleyicide olay seçili olmalı
    const triggerEvent = (triggerNode.data as { trigger?: string }).trigger;
    if (!triggerEvent) {
      toast.error('Tetikleyici bloğunda bir olay seçilmelidir.');
      return false;
    }

    // 3) Her aksiyon bloğunda aksiyon seçili ve zorunlu parametreler dolu olmalı
    for (const node of current.filter((n) => n.type === 'actionNode')) {
      const d = node.data as ActionNodeData;

      if (!d.action) {
        toast.error('Tüm Aksiyon bloklarında bir aksiyon seçilmelidir.');
        return false;
      }

      const def = actions.find((a) => a.value === d.action);
      if (def) {
        for (const p of def.parameters) {
          if (!p.required) continue;
          const val = d.params?.[p.key] ?? p.defaultValue ?? '';
          if (!val || String(val).trim() === '') {
            toast.error(`"${def.label}" aksiyonunda "${p.label}" alanı zorunludur.`);
            return false;
          }
        }
      }
    }

    return true;
  }, [getNodes, actions]);

  // ─────────────────────────────────────────────────────────────────
  // Save
  // ─────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validateCanvas()) return;

    const nodesSnapshot = getNodes();
    const edgesSnapshot = getEdges();
    const triggerEvent =
      (nodesSnapshot.find((n) => n.type === 'triggerNode')?.data as { trigger?: string })?.trigger ?? '';

    const payload: SaveWorkflowDto = {
      ...(currentRuleId != null ? { id: currentRuleId } : {}),
      name: ruleName,
      triggerEvent,
      flowJson: JSON.stringify({ nodes: nodesSnapshot, edges: edgesSnapshot }),
      priority: 100,
      description: '',
      isActive: true,
    };

    const response = await workflowService.saveWorkflow(payload);
    if (response.data.success) {
      toast.success(response.data.message || 'Workflow kaydedildi.');
      const savedId = response.data.data?.id;
      if (savedId != null && currentRuleId == null) setCurrentRuleId(savedId);
    }
  }, [validateCanvas, getNodes, getEdges, currentRuleId, ruleName, setCurrentRuleId]);

  // ─────────────────────────────────────────────────────────────────
  // Derived state — Kaydet butonu disabling
  // ─────────────────────────────────────────────────────────────────

  const hasTriggerNode = nodes.some((n) => n.type === 'triggerNode');
  const triggerHasEvent = nodes.some(
    (n) => n.type === 'triggerNode' && !!(n.data as { trigger?: string }).trigger
  );
  /** true → Kaydet butonu disabled + greyed-out */
  const isSaveDisabled = !hasTriggerNode || !triggerHasEvent;

  return {
    reactFlowWrapper,
    // ReactFlow state
    nodes, edges, onNodesChange, onEdgesChange,
    // Event handlers
    onConnect, onDragOver, onDrop,
    onPaneContextMenu, onNodeContextMenu, onPaneClick,
    // Node handlers
    handleAddNode, handleDeleteNode, handleDuplicateNode, handlePaste,
    handleDisconnect, handleSetColor, handleOpenDetail, handleSelectAll,
    // Canvas handlers
    handleClearAll, handleEditRule, handleNewRule, handleSave,
    // Derived
    isSaveDisabled,
    fitView,
  };
}
