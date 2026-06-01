import { useEffect, useState } from 'react';
import { metricsService, type WorkflowRunDetailItem } from '../../services/metricsService';
import { fmtDateTimeSec } from '../../utils/dateFormat';

// ── Sabitler ─────────────────────────────────────────────────────────────────

const RUN_STATUS: Record<number, { label: string; color: string; icon: string }> = {
  1: { label: 'Bekliyor',   color: '#94a3b8', icon: '⏳' },
  2: { label: 'Çalışıyor',  color: '#60a5fa', icon: '🔄' },
  3: { label: 'Başarılı',   color: '#10b981', icon: '✅' },
  4: { label: 'Kısmi',      color: '#f59e0b', icon: '⚠️' },
  5: { label: 'Başarısız',  color: '#ef4444', icon: '❌' },
  6: { label: 'İptal',      color: '#6b7280', icon: '🚫' },
  7: { label: 'Zaman Aşımı',color: '#f97316', icon: '⌛' },
};

const NODE_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Bekliyor',  color: '#94a3b8' },
  2: { label: 'Çalışıyor', color: '#60a5fa' },
  3: { label: 'Başarılı',  color: '#10b981' },
  4: { label: 'Başarısız', color: '#ef4444' },
  5: { label: 'Atlandı',   color: '#6b7280' },
};

const ACTION_STATUS: Record<number, { label: string; color: string }> = {
  1: { label: 'Bekliyor',   color: '#94a3b8' },
  2: { label: 'Çalışıyor',  color: '#60a5fa' },
  3: { label: 'Başarılı',   color: '#10b981' },
  4: { label: 'Başarısız',  color: '#ef4444' },
  5: { label: 'Dead Letter',color: '#dc2626' },
  6: { label: 'Simüle',     color: '#8b5cf6' },
};

const NODE_TYPE_ICON: Record<string, string> = {
  triggerNode:   '⚡',
  conditionNode: '🔀',
  actionNode:    '⚙️',
  csharpNode:    '💻',
};

function formatMs(ms: number | null | undefined) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null | undefined) {
  return fmtDateTimeSec(iso) ?? '—';
}

function StatusBadge({ status, map }: { status: number; map: Record<number, { label: string; color: string; icon?: string }> }) {
  const cfg = map[status] ?? { label: String(status), color: '#6b7280' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      color: cfg.color, fontSize: 12, fontWeight: 600,
    }}>
      {'icon' in cfg && cfg.icon && <span>{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function WorkflowRunDetailPanel({ runId, onClose }: { runId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<WorkflowRunDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    metricsService.getWorkflowRunDetail(runId)
      .then(r => { if (r.data.success) setDetail(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [runId]);

  const toggleNode = (nodeId: string) =>
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 12, width: 780, maxWidth: '95vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #2d2d3f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔄</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Run Detayı</div>
              <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{runId.slice(0, 20)}…</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>

        {/* İçerik */}
        <div style={{ overflowY: 'auto', flex: 1, padding: 20 }}>
          {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Yükleniyor…</div>}

          {!loading && !detail && <div style={{ color: '#ef4444', textAlign: 'center', padding: 40 }}>Run bulunamadı.</div>}

          {!loading && detail && (
            <>
              {/* Meta bilgiler */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Durum',     value: <StatusBadge status={detail.status} map={RUN_STATUS} /> },
                  { label: 'Tetikleyici', value: <span style={{ color: '#818cf8', fontSize: 12 }}>{detail.triggerEvent}</span> },
                  { label: 'Süre',      value: <span style={{ color: '#e2e8f0', fontSize: 12 }}>{formatMs(detail.durationMs)}</span> },
                  { label: 'Başlangıç', value: <span style={{ color: '#e2e8f0', fontSize: 12 }}>{formatDate(detail.startedAt)}</span> },
                  { label: 'Bitiş',     value: <span style={{ color: '#e2e8f0', fontSize: 12 }}>{formatDate(detail.endedAt)}</span> },
                  { label: 'Mod',       value: <span style={{ color: detail.isDryRun ? '#8b5cf6' : '#10b981', fontSize: 12, fontWeight: 600 }}>{detail.isDryRun ? '🧪 Dry-run' : '🚀 Gerçek'}</span> },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#13131f', borderRadius: 8, padding: '10px 14px', border: '1px solid #2d2d3f' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
                    <div>{value}</div>
                  </div>
                ))}
              </div>

              {detail.errorMessage && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#f87171' }}>
                  ❌ {detail.errorMessage}
                </div>
              )}

              {/* Node akışı */}
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Node Akışı — {detail.nodeRuns.length} node
              </div>

              {detail.nodeRuns.length === 0 && (
                <div style={{ color: '#374151', textAlign: 'center', padding: '24px 0', fontSize: 13 }}>Henüz node çalışmadı.</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {detail.nodeRuns.map((nr) => {
                  const isExpanded = expandedNodes.has(nr.id);
                  const nCfg = NODE_STATUS[nr.status] ?? { label: String(nr.status), color: '#6b7280' };
                  const typeIcon = NODE_TYPE_ICON[nr.nodeType] ?? '📦';
                  return (
                    <div key={nr.id} style={{ background: '#13131f', border: '1px solid #2d2d3f', borderRadius: 10, overflow: 'hidden' }}>
                      {/* Node satırı */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, cursor: nr.actionRuns.length > 0 ? 'pointer' : 'default' }}
                        onClick={() => nr.actionRuns.length > 0 && toggleNode(nr.id)}
                      >
                        <span style={{ fontSize: 16 }}>{typeIcon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{nr.nodeId}</span>
                            <span style={{ color: '#64748b', fontSize: 11 }}>{nr.nodeType}</span>
                          </div>
                          {nr.errorMessage && <div style={{ color: '#f87171', fontSize: 11, marginTop: 2 }}>{nr.errorMessage}</div>}
                        </div>
                        <span style={{ color: nCfg.color, fontSize: 12, fontWeight: 600 }}>{nCfg.label}</span>
                        <span style={{ color: '#64748b', fontSize: 11 }}>{formatMs(nr.endedAt && nr.startedAt ? new Date(nr.endedAt).getTime() - new Date(nr.startedAt).getTime() : null)}</span>
                        {nr.actionRuns.length > 0 && (
                          <span style={{ color: '#4b5563', fontSize: 11 }}>{isExpanded ? '▲' : '▼'} {nr.actionRuns.length}</span>
                        )}
                      </div>

                      {/* Action runs (genişletilince) */}
                      {isExpanded && nr.actionRuns.length > 0 && (
                        <div style={{ borderTop: '1px solid #1e1e2e', padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {nr.actionRuns.map((ar) => {
                            const aCfg = ACTION_STATUS[ar.status] ?? { label: String(ar.status), color: '#6b7280' };
                            return (
                              <div key={ar.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0f0f1a', borderRadius: 6, padding: '8px 12px' }}>
                                <span style={{ fontSize: 14 }}>⚙️</span>
                                <span style={{ color: '#818cf8', fontFamily: 'monospace', fontSize: 12, flex: 1 }}>{ar.actionCode}</span>
                                <span style={{ color: aCfg.color, fontSize: 12, fontWeight: 600 }}>{aCfg.label}</span>
                                {ar.retryCount > 0 && <span style={{ color: '#f59e0b', fontSize: 11 }}>🔁 {ar.retryCount}</span>}
                                <span style={{ color: '#64748b', fontSize: 11 }}>{formatMs(ar.endedAt && ar.startedAt ? new Date(ar.endedAt).getTime() - new Date(ar.startedAt).getTime() : null)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Alt çubuk */}
        <div style={{ borderTop: '1px solid #2d2d3f', padding: '10px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#2d2d3f', border: 'none', borderRadius: 8, color: '#e2e8f0', padding: '7px 20px', fontSize: 13, cursor: 'pointer' }}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
