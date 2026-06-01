import { useCallback, useEffect, useState } from 'react';
import { metricsService, type WorkflowRunSummaryItem, type WorkflowEventLogItem } from '../../services/metricsService';
import WorkflowRunDetailPanel from './WorkflowRunDetailPanel';
import { fmtDateTimeSec } from '../../utils/dateFormat';

// ── Sabitler ─────────────────────────────────────────────────────────────────

const RUN_STATUS: Record<number, { label: string; bg: string; color: string; icon: string }> = {
  1: { label: 'Bekliyor',    bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', icon: '⏳' },
  2: { label: 'Çalışıyor',   bg: 'rgba(96,165,250,0.1)',  color: '#60a5fa', icon: '🔄' },
  3: { label: 'Başarılı',    bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: '✅' },
  4: { label: 'Kısmi',       bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '⚠️' },
  5: { label: 'Başarısız',   bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: '❌' },
  6: { label: 'İptal',       bg: 'rgba(107,114,128,0.1)', color: '#6b7280', icon: '🚫' },
  7: { label: 'Zaman Aşımı', bg: 'rgba(249,115,22,0.15)', color: '#f97316', icon: '⌛' },
};

function StatusBadge({ status }: { status: number }) {
  const cfg = RUN_STATUS[status] ?? { label: String(status), bg: '#1e1e2e', color: '#9ca3af', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function formatMs(ms: number | null | undefined) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null | undefined) {
  return fmtDateTimeSec(iso) ?? '—';
}

const LOG_STATUS: Record<string, { color: string; icon: string }> = {
  success: { color: '#10b981', icon: '✅' },
  partial:  { color: '#f59e0b', icon: '⚠️' },
  failed:   { color: '#ef4444', icon: '❌' },
  error:    { color: '#ef4444', icon: '💥' },
  timeout:  { color: '#f97316', icon: '⌛' },
};

function LogStatusBadge({ status }: { status: string }) {
  const cfg = LOG_STATUS[status] ?? { color: '#94a3b8', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${cfg.color}22`, color: cfg.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
    }}>
      {cfg.icon} {status}
    </span>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
type ActiveTab = 'runs' | 'logs';

export default function WorkflowRunsTab({ definitionId }: { definitionId: number }) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('logs');

  // ── Test-run (Orchestrator path) ────────────────────────────────────────────
  const [runs, setRuns] = useState<WorkflowRunSummaryItem[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [runsPage, setRunsPage] = useState(1);
  const [runsHasMore, setRunsHasMore] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // ── Gerçek event logları (WorkflowLog) ──────────────────────────────────────
  const [logs, setLogs] = useState<WorkflowEventLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(true);

  const loadRuns = useCallback((p: number) => {
    setRunsLoading(true);
    metricsService.getWorkflowRuns(definitionId, p, PAGE_SIZE)
      .then(r => {
        if (!r.data.success) return;
        const data = r.data.data ?? [];
        setRuns(prev => p === 1 ? data : [...prev, ...data]);
        setRunsHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setRunsLoading(false));
  }, [definitionId]);

  const loadLogs = useCallback((p: number) => {
    setLogsLoading(true);
    metricsService.getWorkflowEventLogs(definitionId, p, PAGE_SIZE)
      .then(r => {
        if (!r.data.success) return;
        const data = r.data.data?.items ?? [];
        setLogs(prev => p === 1 ? data : [...prev, ...data]);
        setLogsHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, [definitionId]);

  const loading = runsLoading;
  const hasMore = runsHasMore;

  useEffect(() => {
    setRunsPage(1); setRuns([]); setRunsHasMore(true); loadRuns(1);
    setLogsPage(1); setLogs([]); setLogsHasMore(true); loadLogs(1);
  }, [loadRuns, loadLogs]);

  const loadMore = () => {
    const next = runsPage + 1;
    setRunsPage(next);
    loadRuns(next);
  };

  const loadMoreLogs = () => {
    const next = logsPage + 1;
    setLogsPage(next);
    loadLogs(next);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#0f0f1a' }}>
      {/* Başlık + Sekme */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>🔄 Çalışmalar</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Kural #{definitionId}</div>
        </div>
        <button
          onClick={() => {
            setRunsPage(1); setRuns([]); loadRuns(1);
            setLogsPage(1); setLogs([]); loadLogs(1);
          }}
          style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 8, color: '#9ca3af', padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}
        >
          🔃 Yenile
        </button>
      </div>

      {/* Sekme bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {([
          { key: 'logs', label: `📋 Gerçek Çalışmalar${logs.length > 0 ? ` (${logs.length}${logsHasMore ? '+' : ''})` : ''}` },
          { key: 'runs', label: `🧪 Test Çalışmaları${runs.length > 0 ? ` (${runs.length}${runsHasMore ? '+' : ''})` : ''}` },
        ] as { key: ActiveTab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: activeTab === t.key ? '2px solid #60a5fa' : '2px solid transparent',
            color: activeTab === t.key ? '#60a5fa' : '#64748b',
            padding: '6px 14px', fontSize: 13,
            fontWeight: activeTab === t.key ? 600 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── GERÇEK ÇALIŞMALAR (WorkflowLog) ──────────────────────────────────── */}
      {activeTab === 'logs' && (
        <>
          {logs.length === 0 && !logsLoading && (
            <div style={{ textAlign: 'center', color: '#374151', padding: '60px 0', fontSize: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              Bu kural henüz gerçek bir event ile tetiklenmedi.
            </div>
          )}
          {logsLoading && logs.length === 0 && (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>Yükleniyor…</div>
          )}
          {logs.length > 0 && (
            <div style={{ background: '#1e1e2e', borderRadius: 10, border: '1px solid #2d2d3f', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 60px 60px 80px 120px', gap: 12, padding: '10px 16px', background: '#13131f', borderBottom: '1px solid #2d2d3f', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                <div>Hata / Mesaj</div><div>Tetikleyici</div><div>Node</div><div>Süre</div><div>Durum</div><div>Tarih</div>
              </div>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 60px 60px 80px 120px', gap: 12, padding: '11px 16px', borderBottom: '1px solid #1a1a2a', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: log.errorMessage ? '#fca5a5' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.errorMessage ?? '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.triggerEvent}</div>
                  <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>{log.executedNodeCount}/{log.totalNodeCount}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>{formatMs(log.durationMs)}</div>
                  <div><LogStatusBadge status={log.status} /></div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatDate(log.executedAt)}</div>
                </div>
              ))}
            </div>
          )}
          {logsHasMore && logs.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={loadMoreLogs} disabled={logsLoading} style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8, color: '#9ca3af', padding: '8px 20px', fontSize: 13, cursor: logsLoading ? 'not-allowed' : 'pointer', opacity: logsLoading ? 0.6 : 1 }}>
                {logsLoading ? 'Yükleniyor…' : 'Daha Fazla'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── TEST ÇALIŞMALARI (WorkflowRun / Orchestrator) ─────────────────── */}
      {activeTab === 'runs' && (
        <>
      {/* Tablo */}
      {runs.length === 0 && !loading && (
        <div style={{ textAlign: 'center', color: '#374151', padding: '60px 0', fontSize: 14 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          Bu kural için henüz bir çalışma kaydı yok. Test-Run ile başlatabilirsiniz.
        </div>
      )}

      {runs.length > 0 && (
        <div style={{ background: '#1e1e2e', borderRadius: 10, border: '1px solid #2d2d3f', overflow: 'hidden' }}>
          {/* Tablo başlığı */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 80px 80px 100px 100px', gap: 12, padding: '10px 16px', background: '#13131f', borderBottom: '1px solid #2d2d3f', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            <div></div>
            <div>Run ID</div>
            <div>Tetikleyici</div>
            <div>Node</div>
            <div>Süre</div>
            <div>Durum</div>
            <div>Başlangıç</div>
          </div>

          {/* Satırlar */}
          {runs.map((run) => (
            <div
              key={run.runId}
              onClick={() => setSelectedRunId(run.runId)}
              style={{ display: 'grid', gridTemplateColumns: '40px 1fr 140px 80px 80px 100px 100px', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1a1a2a', alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#252535')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 14, textAlign: 'center' }}>
                {run.isDryRun ? <span title="Dry-run">🧪</span> : <span title="Gerçek çalışma">🚀</span>}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#818cf8' }}>
                {run.runId.slice(0, 8)}…
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {run.triggerEvent}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                {run.nodeRunCount}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>
                {formatMs(run.durationMs)}
              </div>
              <div>
                <StatusBadge status={run.status} />
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {formatDate(run.startedAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Daha fazla yükle */}
      {hasMore && runs.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8, color: '#9ca3af', padding: '8px 20px', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Yükleniyor…' : 'Daha Fazla'}
          </button>
        </div>
      )}

      {loading && runs.length === 0 && (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '60px 0' }}>Yükleniyor…</div>
      )}
        </>
      )}

      {/* Detay modal */}
      {selectedRunId && (
        <WorkflowRunDetailPanel
          runId={selectedRunId}
          onClose={() => setSelectedRunId(null)}
        />
      )}
    </div>
  );
}
