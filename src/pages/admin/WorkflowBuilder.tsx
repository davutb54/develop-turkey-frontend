import { useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from '../../components/workflow/TriggerNode';
import ConditionNode from '../../components/workflow/ConditionNode';
import ActionNode from '../../components/workflow/ActionNode';
import CSharpNode from '../../components/workflow/CSharpNode';
import WorkflowSidebar from '../../components/workflow/WorkflowSidebar';
import WorkflowDefinitionPanel from '../../components/workflow/WorkflowDefinitionPanel';
import WorkflowContextMenu from '../../components/workflow/WorkflowContextMenu';
import NodeContextMenu from '../../components/workflow/NodeContextMenu';
import WorkflowRulesList from '../../components/workflow/WorkflowRulesList';
import WorkflowLogs from '../../components/workflow/WorkflowLogs';
import { useWorkflowCanvas } from '../../components/workflow/useWorkflowCanvas';
import { useWorkflowCanvasStore } from '../../components/workflow/useWorkflowCanvasStore';
import { useWorkflowStore } from '../../components/workflow/useWorkflowStore';
import { useCapability } from '../../hooks/useCapability';

const nodeTypes: NodeTypes = {
  triggerNode: TriggerNode,
  conditionNode: ConditionNode,
  actionNode: ActionNode,
  csharpNode: CSharpNode,
};

// ─── İç bileşen (ReactFlowProvider içinde) ───────────────────────────────────
function WorkflowBuilderInner() {
  const canvas = useWorkflowCanvas();

  const {
    ruleName, currentRuleId, showDefPanel, view,
    canvasMenu, nodeMenu, clipboard,
    setRuleName, toggleDefPanel, setView, setCanvasMenu, setNodeMenu,
  } = useWorkflowCanvasStore();

  const syncStore = useWorkflowStore((s) => s.syncStore);
  useEffect(() => { void syncStore(); }, [syncStore]);

  const canCreateRule = useCapability('admin.rule_create');
  const canUpdateRule = useCapability('admin.rule_update');
  const canViewLogs   = useCapability('admin.workflow_log_read');
  const canManageRefs = useCapability('admin.workflow_reference_manage');
  const canSave       = currentRuleId == null ? canCreateRule : canUpdateRule;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Üst toolbar ── */}
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
            {(['builder', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ background: view === v ? '#2d2d3f' : 'transparent', border: 'none', borderRadius: 6, color: view === v ? '#e2e8f0' : '#64748b', padding: '5px 12px', fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: 'pointer' }}>
                {v === 'builder' ? '✏️ Editör' : '📋 Kurallar'}
              </button>
            ))}
            {canViewLogs && (
              <button onClick={() => setView('logs')} style={{ background: view === 'logs' ? '#2d2d3f' : 'transparent', border: 'none', borderRadius: 6, color: view === 'logs' ? '#e2e8f0' : '#64748b', padding: '5px 12px', fontSize: 12, fontWeight: view === 'logs' ? 600 : 400, cursor: 'pointer' }}>
                📊 Loglar
              </button>
            )}
          </div>

          {/* Editör butonları */}
          {view === 'builder' && (
            <>
              {canManageRefs && (
                <button onClick={toggleDefPanel} style={{ background: showDefPanel ? '#2d2d3f' : 'transparent', border: '1px solid #374151', borderRadius: 8, color: showDefPanel ? '#e2e8f0' : '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                  🗂️ Tanımlar
                </button>
              )}
              <button onClick={canvas.handleClearAll} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                🗑️ Temizle
              </button>
              {canSave && (
                <button
                  onClick={canvas.handleSave}
                  disabled={canvas.isSaveDisabled}
                  title={canvas.isSaveDisabled ? 'Tetikleyici bloğunda bir olay seçilmelidir' : undefined}
                  style={{
                    background: canvas.isSaveDisabled ? 'transparent' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    border: canvas.isSaveDisabled ? '1px solid #374151' : 'none',
                    borderRadius: 8,
                    color: canvas.isSaveDisabled ? '#4b5563' : '#fff',
                    padding: '7px 18px',
                    fontSize: 13, fontWeight: 600,
                    cursor: canvas.isSaveDisabled ? 'not-allowed' : 'pointer',
                    boxShadow: canvas.isSaveDisabled ? 'none' : '0 2px 8px rgba(79,70,229,0.4)',
                    opacity: canvas.isSaveDisabled ? 0.5 : 1,
                  }}
                >
                  💾 Kaydet
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Ana içerik ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {view === 'list' && (
          <WorkflowRulesList onEdit={canvas.handleEditRule} onNew={canvas.handleNewRule} />
        )}

        {view === 'logs' && canViewLogs && <WorkflowLogs />}

        {view === 'builder' && (
          <>
            <WorkflowSidebar />

            <div ref={canvas.reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
              <ReactFlow
                nodes={canvas.nodes} edges={canvas.edges}
                onNodesChange={canvas.onNodesChange} onEdgesChange={canvas.onEdgesChange}
                onConnect={canvas.onConnect} onDrop={canvas.onDrop} onDragOver={canvas.onDragOver}
                onPaneContextMenu={canvas.onPaneContextMenu}
                onNodeContextMenu={canvas.onNodeContextMenu}
                onPaneClick={canvas.onPaneClick}
                nodeTypes={nodeTypes} fitView
                style={{ background: '#0f0f1a' }} deleteKeyCode="Delete"
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2d2d3f" />
                <Controls style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8 }} />
                <MiniMap
                  style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8 }}
                  nodeColor={(node) => {
                    const colors: Record<string, string> = {
                      triggerNode: '#3b82f6', conditionNode: '#d97706',
                      actionNode: '#7c3aed', csharpNode: '#dc2626',
                    };
                    return (node.data as { accentColor?: string }).accentColor ?? colors[node.type ?? ''] ?? '#6b7280';
                  }}
                />
              </ReactFlow>

              {canvas.nodes.length === 0 && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', color: '#374151' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🧩</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Tahtanız boş</div>
                  <div style={{ fontSize: 13 }}>Sol panelden blokları sürükleyip buraya bırakın veya sağ tıklayın</div>
                </div>
              )}
            </div>

            {showDefPanel && canManageRefs && <WorkflowDefinitionPanel />}
          </>
        )}
      </div>

      {/* ── Context Menüler ── */}
      {canvasMenu && (
        <WorkflowContextMenu
          position={canvasMenu} onClose={() => setCanvasMenu(null)}
          onAddNode={canvas.handleAddNode} onSelectAll={canvas.handleSelectAll}
          onClearAll={canvas.handleClearAll}
          onFitView={() => canvas.fitView({ duration: 400 })}
          canPaste={!!clipboard} onPaste={canvas.handlePaste}
        />
      )}
      {nodeMenu && (
        <NodeContextMenu
          position={nodeMenu}
          node={canvas.nodes.find((n) => n.id === nodeMenu.nodeId)}
          onClose={() => setNodeMenu(null)}
          onDelete={canvas.handleDeleteNode} onDuplicate={canvas.handleDuplicateNode}
          onOpenDetail={canvas.handleOpenDetail} onDisconnect={canvas.handleDisconnect}
          onSetColor={canvas.handleSetColor}
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
