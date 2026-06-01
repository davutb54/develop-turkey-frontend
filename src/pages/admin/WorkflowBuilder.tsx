import { useCallback, useEffect, useRef, useState } from 'react';
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
import WorkflowRunsTab from '../../components/workflow/WorkflowRunsTab';
import NodeInspectorPanel from '../../components/workflow/NodeInspectorPanel';
import { useWorkflowCanvas } from '../../components/workflow/useWorkflowCanvas';
import { useWorkflowCanvasStore } from '../../components/workflow/useWorkflowCanvasStore';
import { useWorkflowStore } from '../../components/workflow/useWorkflowStore';
import { useCapability } from '../../hooks/useCapability';
import { workflowService } from '../../services/workflowService';
import type { WorkflowTestRunResult } from '../../types';

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
  const loadWorkflowMeta = useWorkflowStore((s) => s.loadWorkflowMeta);
  useEffect(() => { void syncStore(); void loadWorkflowMeta(); }, [syncStore, loadWorkflowMeta]);

  // ── Canvas Arama ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<string[]>([]);
  const [searchCursor, setSearchCursor] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const applySearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchHits([]);
      canvas.setNodes(nds => nds.map(n => ({ ...n, selected: false })));
      return;
    }
    const q = query.toLowerCase();
    const hits = canvas.nodes
      .filter(n => {
        const d = n.data as Record<string, unknown>;
        return (
          (n.type ?? '').toLowerCase().includes(q) ||
          String(d.label ?? '').toLowerCase().includes(q) ||
          String(d.trigger ?? '').toLowerCase().includes(q) ||
          String(d.action ?? '').toLowerCase().includes(q)
        );
      })
      .map(n => n.id);
    setSearchHits(hits);
    setSearchCursor(0);
    canvas.setNodes(nds => nds.map(n => ({ ...n, selected: hits.includes(n.id) })));
    if (hits.length > 0) canvas.fitView({ nodes: [{ id: hits[0] }], duration: 300, padding: 0.8 });
  }, [canvas]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchHits([]);
    setSearchCursor(0);
    canvas.setNodes(nds => nds.map(n => ({ ...n, selected: false })));
  }, [canvas]);

  const navigateSearch = useCallback((dir: 1 | -1) => {
    if (searchHits.length === 0) return;
    const next = (searchCursor + dir + searchHits.length) % searchHits.length;
    setSearchCursor(next);
    canvas.fitView({ nodes: [{ id: searchHits[next] }], duration: 300, padding: 0.8 });
  }, [searchHits, searchCursor, canvas]);

  // Ctrl+Z → undo, Ctrl+Y / Ctrl+Shift+Z → redo, Ctrl+F → search, Escape → clear search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { clearSearch(); return; }
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); canvas.handleUndo(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); canvas.handleRedo(); }
      if (e.key === 'f' && view === 'builder') { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canvas, view, clearSearch]);

  const canCreateRule = useCapability('admin.rule_create');
  const canUpdateRule = useCapability('admin.rule_update');
  const canViewLogs   = useCapability('admin.workflow_log_read');
  const canManageRefs = useCapability('admin.workflow_reference_manage');
  const canTestRun    = useCapability('admin.rule_test_run');
  const canSave       = currentRuleId == null ? canCreateRule : canUpdateRule;

  const [testRunState, setTestRunState] = useState<'idle' | 'running' | 'ok' | 'error'>('idle');
  const [testRunResult, setTestRunResult] = useState<WorkflowTestRunResult | null>(null);
  const testRunTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTestRun = async () => {
    if (!currentRuleId || testRunState === 'running') return;
    if (testRunTimerRef.current) clearTimeout(testRunTimerRef.current);
    setTestRunState('running');
    setTestRunResult(null);
    try {
      const resp = await workflowService.testRun(currentRuleId, {});
      setTestRunResult(resp.data);
      setTestRunState(resp.data.success ? 'ok' : 'error');
    } catch {
      setTestRunResult({ success: false, message: 'Bağlantı hatası', isDryRun: true });
      setTestRunState('error');
    } finally {
      testRunTimerRef.current = setTimeout(() => setTestRunState('idle'), 8000);
    }
  };

  // ── Node Inspector ────────────────────────────────────────────────────────────
  const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null);
  const inspectorNode = inspectorNodeId ? canvas.nodes.find(n => n.id === inspectorNodeId) ?? null : null;

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
            {canViewLogs && currentRuleId != null && (
              <button onClick={() => setView('runs')} style={{ background: view === 'runs' ? '#2d2d3f' : 'transparent', border: 'none', borderRadius: 6, color: view === 'runs' ? '#e2e8f0' : '#64748b', padding: '5px 12px', fontSize: 12, fontWeight: view === 'runs' ? 600 : 400, cursor: 'pointer' }}>
                🔄 Çalışmalar
              </button>
            )}
          </div>

          {/* Editör butonları */}
          {view === 'builder' && (
            <>
              {/* Arama kutusu */}
              <div style={{ display: 'flex', alignItems: 'center', background: '#13131f', border: `1px solid ${searchQuery ? '#6366f1' : '#374151'}`, borderRadius: 8, padding: '0 8px', gap: 4 }}>
                <span style={{ color: '#64748b', fontSize: 13 }}>🔍</span>
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => applySearch(e.target.value)}
                  placeholder="Ara… (Ctrl+F)"
                  style={{ background: 'transparent', border: 'none', color: '#e2e8f0', fontSize: 12, outline: 'none', width: 130, padding: '6px 0' }}
                />
                {searchQuery && (
                  <>
                    <span style={{ color: searchHits.length > 0 ? '#6366f1' : '#ef4444', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {searchHits.length > 0 ? `${searchCursor + 1}/${searchHits.length}` : '0'}
                    </span>
                    <button onClick={() => navigateSearch(-1)} disabled={searchHits.length === 0} title="Önceki" style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: searchHits.length > 0 ? 'pointer' : 'not-allowed', padding: '0 2px' }}>▲</button>
                    <button onClick={() => navigateSearch(1)} disabled={searchHits.length === 0} title="Sonraki" style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: 12, cursor: searchHits.length > 0 ? 'pointer' : 'not-allowed', padding: '0 2px' }}>▼</button>
                    <button onClick={clearSearch} title="Temizle (Esc)" style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer', padding: '0 2px' }}>✕</button>
                  </>
                )}
              </div>
              {/* Undo / Redo */}
              <button
                onClick={canvas.handleUndo}
                disabled={!canvas.canUndo}
                title="Geri al (Ctrl+Z)"
                style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: canvas.canUndo ? '#9ca3af' : '#374151', padding: '7px 10px', fontSize: 13, cursor: canvas.canUndo ? 'pointer' : 'not-allowed' }}
              >↩</button>
              <button
                onClick={canvas.handleRedo}
                disabled={!canvas.canRedo}
                title="İleri al (Ctrl+Y)"
                style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: canvas.canRedo ? '#9ca3af' : '#374151', padding: '7px 10px', fontSize: 13, cursor: canvas.canRedo ? 'pointer' : 'not-allowed' }}
              >↪</button>
              {canManageRefs && (
                <button onClick={toggleDefPanel} style={{ background: showDefPanel ? '#2d2d3f' : 'transparent', border: '1px solid #374151', borderRadius: 8, color: showDefPanel ? '#e2e8f0' : '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                  🗂️ Tanımlar
                </button>
              )}
              <button onClick={canvas.handleClearAll} style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
                🗑️ Temizle
              </button>
              {canTestRun && currentRuleId != null && (
                <button
                  onClick={() => void handleTestRun()}
                  disabled={testRunState === 'running'}
                  title="Workflow'u kayıt etmeden simüle eder (dry-run)"
                  style={{
                    background: testRunState === 'ok' ? 'linear-gradient(135deg,#065f46,#047857)' : testRunState === 'error' ? 'linear-gradient(135deg,#7f1d1d,#991b1b)' : 'transparent',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    color: testRunState === 'idle' ? '#9ca3af' : '#fff',
                    padding: '7px 14px',
                    fontSize: 13,
                    cursor: testRunState === 'running' ? 'not-allowed' : 'pointer',
                    opacity: testRunState === 'running' ? 0.6 : 1,
                  }}
                >
                  {testRunState === 'running' ? '⏳ Çalışıyor…' : '🧪 Test-Run'}
                </button>
              )}
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

      {/* ── Test-Run sonuç banner'ı ── */}
      {testRunResult && testRunState !== 'idle' && (
        <div style={{
          padding: '8px 20px',
          background: testRunResult.success ? 'rgba(6,95,70,0.9)' : 'rgba(127,29,29,0.9)',
          borderBottom: `1px solid ${testRunResult.success ? '#065f46' : '#7f1d1d'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, flexShrink: 0,
        }}>
          <span>
            {testRunResult.success
              ? `✅ Dry-run başlatıldı — Run ID: ${testRunResult.runId?.slice(0, 8)}… (trigger: ${testRunResult.triggerEvent})`
              : `❌ Test-run başarısız: ${testRunResult.message}`}
          </span>
          {testRunResult.success && canViewLogs && (
            <button
              onClick={() => setView('logs')}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: '#fff', padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              Logları Gör
            </button>
          )}
        </div>
      )}

      {/* ── Ana içerik ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {view === 'list' && (
          <WorkflowRulesList onEdit={canvas.handleEditRule} onNew={canvas.handleNewRule} />
        )}

        {view === 'logs' && canViewLogs && <WorkflowLogs />}

        {view === 'runs' && canViewLogs && currentRuleId != null && (
          <WorkflowRunsTab definitionId={currentRuleId} />
        )}

        {view === 'builder' && (
          <>
            <WorkflowSidebar />

            <div ref={canvas.reactFlowWrapper} style={{ flex: 1, position: 'relative' }}>
              <ReactFlow
                nodes={canvas.nodes} edges={canvas.edges}
                onNodesChange={canvas.onNodesChange} onEdgesChange={canvas.onEdgesChange}
                onConnect={canvas.onConnect} onDrop={canvas.onDrop} onDragOver={canvas.onDragOver}
                onNodeDragStop={canvas.onNodeDragStop}
                onPaneContextMenu={canvas.onPaneContextMenu}
                onNodeContextMenu={canvas.onNodeContextMenu}
                onPaneClick={() => { canvas.onPaneClick(); setInspectorNodeId(null); }}
                onNodeDoubleClick={(_, node) => setInspectorNodeId(node.id)}
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

              {inspectorNode && (
                <NodeInspectorPanel
                  node={inspectorNode}
                  onClose={() => setInspectorNodeId(null)}
                />
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
