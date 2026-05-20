import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type ReactFlowInstance,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from '../../components/workflow/TriggerNode';
import ConditionNode from '../../components/workflow/ConditionNode';
import ActionNode from '../../components/workflow/ActionNode';
import CSharpNode from '../../components/workflow/CSharpNode';
import WorkflowSidebar from '../../components/workflow/WorkflowSidebar';
import WorkflowDefinitionPanel from '../../components/workflow/WorkflowDefinitionPanel';
import WorkflowContextMenu, { type ContextMenuPosition } from '../../components/workflow/WorkflowContextMenu';
import NodeContextMenu, { type NodeMenuPosition } from '../../components/workflow/NodeContextMenu';
import WorkflowRulesList from '../../components/workflow/WorkflowRulesList';
import WorkflowLogs from '../../components/workflow/WorkflowLogs';
import { useWorkflowStore } from '../../components/workflow/useWorkflowStore';
import { workflowService } from '../../services/workflowService';
import type { DynamicRule, SaveWorkflowDto } from '../../types';
import toast from 'react-hot-toast';

const nodeTypes: NodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  csharpNode: CSharpNode,
};

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 300, y: 80 },
    data: { label: 'Tetikleyici' },
  },
];

let nodeIdCounter = 10;
const getNewId = () => `node-${++nodeIdCounter}`;

// ─── İç bileşen (ReactFlowProvider içinde) ───────────────────────────────────
function WorkflowBuilderInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [ruleName, setRuleName] = useState('Yeni Kural');
  const [currentRuleId, setCurrentRuleId] = useState<number | null>(null);
  const [showDefPanel, setShowDefPanel] = useState(false);
  const [view, setView] = useState<'builder' | 'list' | 'logs'>('builder');
  const syncStore = useWorkflowStore((s) => s.syncStore);

  // Context menu state
  const [canvasMenu, setCanvasMenu] = useState<ContextMenuPosition | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuPosition | null>(null);

  // Kopyalama buffer
  const [clipboard, setClipboard] = useState<Node | null>(null);

  const { fitView, getNodes, getEdges } = useReactFlow();

  useEffect(() => {
    void syncStore();
  }, [syncStore]);

  // ── Kenar bağlantısı ──
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
          eds
        )
      ),
    [setEdges]
  );

  // ── Drag over ──
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // ── Drop ──
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !rfInstance || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setNodes((nds) => nds.concat({ id: getNewId(), type, position, data: { label: type } }));
    },
    [rfInstance, setNodes]
  );

  // ── Canvas sağ tık ──
  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setNodeMenu(null);
      if (!rfInstance || !reactFlowWrapper.current) return;
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const flowPos = rfInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      setCanvasMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y });
    },
    [rfInstance]
  );

  // ── Node sağ tık ──
  const onNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent, node: Node) => {
      event.preventDefault();
      setCanvasMenu(null);
      setNodeMenu({ x: event.clientX, y: event.clientY, nodeId: node.id, nodeType: node.type ?? 'triggerNode' });
    },
    []
  );

  // ── Canvas tıklama (menüleri kapat) ──
  const onPaneClick = useCallback(() => {
    setCanvasMenu(null);
    setNodeMenu(null);
  }, []);

  // ── Yeni node ekle (context menu'den) ──
  const handleAddNode = useCallback(
    (type: string, x: number, y: number) => {
      setNodes((nds) => nds.concat({ id: getNewId(), type, position: { x, y }, data: { label: type } }));
    },
    [setNodes]
  );

  // ── Node sil ──
  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setNodes, setEdges]
  );

  // ── Node kopyala ──
  const handleDuplicateNode = useCallback(
    (id: string) => {
      const node = getNodes().find((n) => n.id === id);
      if (!node) return;
      const newNode: Node = {
        ...node,
        id: getNewId(),
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: false,
      };
      setClipboard(node);
      setNodes((nds) => nds.concat(newNode));
    },
    [getNodes, setNodes]
  );

  // ── Yapıştır ──
  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const newNode: Node = {
      ...clipboard,
      id: getNewId(),
      position: { x: clipboard.position.x + 60, y: clipboard.position.y + 60 },
      selected: false,
    };
    setNodes((nds) => nds.concat(newNode));
  }, [clipboard, setNodes]);

  // ── Bağlantıları kes ──
  const handleDisconnect = useCallback(
    (id: string) => {
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    },
    [setEdges]
  );

  // ── Renk değiştir ──
  const handleSetColor = useCallback(
    (id: string, color: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, accentColor: color } } : n
        )
      );
    },
    [setNodes]
  );

  // ── Detay aç (şimdilik alert) ──
  const handleOpenDetail = useCallback((id: string) => {
    const node = getNodes().find((n) => n.id === id);
    if (node) alert(`Node ID: ${node.id}\nTip: ${node.type}\nKonum: (${Math.round(node.position.x)}, ${Math.round(node.position.y)})`);
  }, [getNodes]);

  // ── Tümünü seç ──
  const handleSelectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  // ── Temizle ──
  const handleClearAll = useCallback(() => {
    if (window.confirm('Tüm blokları silmek istediğinize emin misiniz?')) {
      setNodes([]);
      setEdges([]);
      useWorkflowStore.getState().setActiveTrigger('');
    }
  }, [setNodes, setEdges]);

  // ── Kaydedilmiş kuralı editöre yükle ──
  const handleEditRule = useCallback(
    (rule: DynamicRule) => {
      try {
        const parsed = JSON.parse(rule.flowJson) as { nodes?: Node[]; edges?: Edge[] };
        setNodes(parsed.nodes ?? []);
        setEdges(parsed.edges ?? []);
        setRuleName(rule.name);
        setCurrentRuleId(rule.id);
        setView('builder');

        const triggerNode = parsed.nodes?.find((n) => n.type === 'triggerNode');
        const triggerEvent = (triggerNode?.data as { trigger?: string } | undefined)?.trigger ?? '';
        useWorkflowStore.getState().setActiveTrigger(triggerEvent);

        setTimeout(() => fitView({ duration: 400 }), 120);
        toast.success(`"${rule.name}" editöre yüklendi.`);
      } catch {
        toast.error('Workflow yüklenemedi, JSON geçersiz.');
      }
    },
    [setNodes, setEdges, fitView]
  );

  // ── Yeni kural (canvas temizle) ──
  const handleNewRule = useCallback(() => {
    setNodes(initialNodes);
    setEdges([]);
    setRuleName('Yeni Kural');
    setCurrentRuleId(null);
    setView('builder');
    useWorkflowStore.getState().setActiveTrigger('');
  }, [setNodes, setEdges]);

  // ── Kaydet ──
  const handleSave = async () => {
    const nodesSnapshot = getNodes();
    const edgesSnapshot = getEdges();
    const flowJson = JSON.stringify({ nodes: nodesSnapshot, edges: edgesSnapshot });
    const triggerNode = nodesSnapshot.find((node) => node.type === 'triggerNode');
    const triggerEvent = (triggerNode?.data as { trigger?: string } | undefined)?.trigger ?? '';

    const payload: SaveWorkflowDto = {
      ...(currentRuleId != null ? { id: currentRuleId } : {}),
      name: ruleName,
      triggerEvent,
      flowJson,
      priority: 100,
      description: '',
      isActive: true,
    };

    const response = await workflowService.saveWorkflow(payload);
    if (response.data.success) {
      toast.success(response.data.message || 'Workflow kaydedildi.');
      // Kaydedilen kuralın yeni ID'sini tut (yeni kural ise)
      const savedRule = response.data.data;
      if (savedRule?.id && currentRuleId == null) {
        setCurrentRuleId(savedRule.id);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Üst toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#1e1e2e', borderBottom: '1px solid #2d2d3f', zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🔧</span>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', display: 'flex', gap: 8, alignItems: 'center' }}>
              Admin Panel › Kural Motoru
              {currentRuleId != null && (
                <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>
                  #{currentRuleId} düzenleniyor
                </span>
              )}
            </div>
            <input
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 18, fontWeight: 700, outline: 'none', padding: 0, cursor: 'text' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Görünüm sekmeleri */}
          <div style={{ display: 'flex', background: '#13131f', border: '1px solid #2d2d3f', borderRadius: 8, padding: 3, gap: 2 }}>
            <button
              onClick={() => setView('builder')}
              style={{
                background: view === 'builder' ? '#2d2d3f' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: view === 'builder' ? '#e2e8f0' : '#64748b',
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: view === 'builder' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              ✏️ Editör
            </button>
            <button
              onClick={() => setView('list')}
              style={{
                background: view === 'list' ? '#2d2d3f' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: view === 'list' ? '#e2e8f0' : '#64748b',
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: view === 'list' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              📋 Kurallar
            </button>
            <button
              onClick={() => setView('logs')}
              style={{
                background: view === 'logs' ? '#2d2d3f' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: view === 'logs' ? '#e2e8f0' : '#64748b',
                padding: '5px 12px',
                fontSize: 12,
                fontWeight: view === 'logs' ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              📊 Loglar
            </button>
          </div>

          {/* Editör butonları — sadece builder modunda göster */}
          {view === 'builder' && (
            <>
              <button
                onClick={() => setShowDefPanel((v) => !v)}
                style={{
                  background: showDefPanel ? '#2d2d3f' : 'transparent',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  color: showDefPanel ? '#e2e8f0' : '#9ca3af',
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🗂️ Tanımlar
              </button>
              <button
                onClick={handleClearAll}
                style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
              >
                🗑️ Temizle
              </button>
              <button
                onClick={handleSave}
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(79,70,229,0.4)' }}
              >
                💾 Kaydet
              </button>
            </>
          )}
        </div>
      </div>

      {/* Ana içerik */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Liste modu */}
        {view === 'list' && (
          <WorkflowRulesList
            onEdit={handleEditRule}
            onNew={handleNewRule}
          />
        )}

        {/* Log modu */}
        {view === 'logs' && <WorkflowLogs />}

        {/* Editör modu */}
        {view === 'builder' && (
          <>
            {/* Sol Sidebar */}
            <WorkflowSidebar />

            {/* Canvas */}
            <div ref={reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setRfInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onPaneContextMenu={onPaneContextMenu}
                onNodeContextMenu={onNodeContextMenu}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                style={{ background: '#0f0f1a' }}
                deleteKeyCode="Delete"
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d2d3f" />
                <Controls style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8 }} />
                <MiniMap
                  style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8 }}
                  nodeColor={(node) => {
                    const colors: Record<string, string> = {
                      triggerNode: '#3b82f6',
                      conditionNode: '#d97706',
                      actionNode: '#7c3aed',
                      csharpNode: '#dc2626',
                    };
                    return (node.data as { accentColor?: string }).accentColor ?? colors[node.type ?? ''] ?? '#6b7280';
                  }}
                />
              </ReactFlow>

              {/* Boş tahta ipucu */}
              {nodes.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', color: '#374151' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🧩</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Tahtanız boş</div>
                  <div style={{ fontSize: 13 }}>Sol panelden blokları sürükleyip buraya bırakın veya sağ tıklayın</div>
                </div>
              )}
            </div>

            {/* Sağ Tanım Paneli */}
            {showDefPanel && <WorkflowDefinitionPanel />}
          </>
        )}
      </div>

      {/* Canvas Context Menu */}
      {canvasMenu && (
        <WorkflowContextMenu
          position={canvasMenu}
          onClose={() => setCanvasMenu(null)}
          onAddNode={handleAddNode}
          onSelectAll={handleSelectAll}
          onClearAll={handleClearAll}
          onFitView={() => fitView({ duration: 400 })}
          canPaste={!!clipboard}
          onPaste={handlePaste}
        />
      )}

      {/* Node Context Menu */}
      {nodeMenu && (
        <NodeContextMenu
          position={nodeMenu}
          node={nodes.find((n) => n.id === nodeMenu.nodeId)}
          onClose={() => setNodeMenu(null)}
          onDelete={handleDeleteNode}
          onDuplicate={handleDuplicateNode}
          onOpenDetail={handleOpenDetail}
          onDisconnect={handleDisconnect}
          onSetColor={handleSetColor}
        />
      )}
    </div>
  );
}

// ─── Dışa aktarılan bileşen (Provider ile sarılmış) ──────────────────────────
export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
