import React, { useCallback, useEffect, useState } from 'react';
import { workflowService } from '../../services/workflowService';
import type { WorkflowLog, WorkflowLogFilterDto } from '../../types';

// ── Yardımcı bileşenler ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  success: { label: 'Başarılı',   bg: 'rgba(16,185,129,0.15)', color: '#10b981', icon: '✅' },
  partial: { label: 'Kısmi',      bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', icon: '⚠️' },
  failed:  { label: 'Başarısız',  bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: '❌' },
  error:   { label: 'Hata',       bg: 'rgba(239,68,68,0.15)',  color: '#f87171', icon: '💥' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#1e1e2e', color: '#9ca3af', icon: '•' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.color,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

function formatMs(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Trace Paneli ─────────────────────────────────────────────────────────────

function TracePanel({ log, onClose }: { log: WorkflowLog; onClose: () => void }) {
  let trace: string[] = [];
  try {
    if (log.traceJson) trace = JSON.parse(log.traceJson) as string[];
  } catch { /* ignore */ }

  const statusCfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.error;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 12,
        width: 680, maxWidth: '95vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Başlık */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2d2d3f', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
              {log.ruleName}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status={log.status} />
              <span style={{ color: '#64748b', fontSize: 12 }}>{formatDate(log.executedAt)}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>⏱ {formatMs(log.durationMs)}</span>
              <span style={{ color: '#64748b', fontSize: 12 }}>
                {log.executedNodeCount}/{log.totalNodeCount} düğüm
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* İçerik */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* Hata mesajı */}
          {log.errorMessage && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              color: '#f87171', fontSize: 13, fontFamily: 'monospace',
            }}>
              <span style={{ fontWeight: 700 }}>Hata: </span>{log.errorMessage}
            </div>
          )}

          {/* Meta bilgiler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              ['Tetikleyici', log.triggerEvent],
              ['Durum', <StatusBadge key="s" status={log.status} />],
              ['Süre', formatMs(log.durationMs)],
              ['Düğüm İlerlemesi', `${log.executedNodeCount} / ${log.totalNodeCount}`],
              ['Kurum ID', String(log.institutionId)],
              ['Tetikleyen Kullanıcı ID', String(log.triggeredByUserId)],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ background: '#13131f', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Trace */}
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Yürütme İzi ({trace.length} adım)
            </div>
            {trace.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>Trace kaydı yok.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {trace.map((step, i) => {
                  const isError =
                    step.toLowerCase().includes('hata') ||
                    step.toLowerCase().includes('error') ||
                    step.toLowerCase().includes('başarısız');
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      background: isError ? 'rgba(239,68,68,0.06)' : 'rgba(99,102,241,0.04)',
                      border: `1px solid ${isError ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.1)'}`,
                      borderRadius: 6, padding: '6px 10px',
                    }}>
                      <span style={{
                        flexShrink: 0, width: 22, height: 22,
                        background: isError ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.15)',
                        color: isError ? '#f87171' : '#818cf8',
                        borderRadius: '50%', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: isError ? '#f87171' : '#cbd5e1', fontFamily: 'monospace', lineHeight: 1.6 }}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function WorkflowLogs() {
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkflowLog | null>(null);

  // Filtreler
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [triggerFilter, setTriggerFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const filter: WorkflowLogFilterDto = {
        page: p,
        pageSize: PAGE_SIZE,
        searchText: searchText || undefined,
        status: statusFilter || undefined,
        triggerEvent: triggerFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const [listRes, countRes] = await Promise.all([
        workflowService.getLogs(filter),
        workflowService.getLogCount(filter),
      ]);
      setLogs(listRes.data.data ?? []);
      setTotal(countRes.data.data ?? 0);
    } finally {
      setLoading(false);
    }
  }, [searchText, statusFilter, triggerFilter, startDate, endDate]);

  useEffect(() => {
    setPage(1);
    void fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (p: number) => {
    setPage(p);
    void fetchLogs(p);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const inputStyle: React.CSSProperties = {
    background: '#13131f', border: '1px solid #2d2d3f', borderRadius: 8,
    color: '#e2e8f0', padding: '7px 12px', fontSize: 13, outline: 'none',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#0f0f1a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Başlık */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Workflow Yürütme Logları</h2>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          Tetiklenen iş akışlarının çalışma geçmişini ve yürütme detaylarını görüntüleyin.
        </p>
      </div>

      {/* Filtre paneli */}
      <div style={{
        background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 10,
        padding: 16, marginBottom: 20,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, alignItems: 'end' }}>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}>Kural Ara</label>
            <input
              placeholder="Kural adı, mesaj..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}>Durum</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: '100%' }}>
              <option value="">Tümü</option>
              <option value="success">Başarılı</option>
              <option value="partial">Kısmi</option>
              <option value="failed">Başarısız</option>
              <option value="error">Hata</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}>Tetikleyici Olay</label>
            <input
              placeholder="problem_created vb."
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}>Başlangıç Tarihi</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 5 }}>Bitiş Tarihi</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              onClick={() => { setSearchText(''); setStatusFilter(''); setTriggerFilter(''); setStartDate(''); setEndDate(''); }}
              style={{ background: '#2d2d3f', border: 'none', borderRadius: 8, color: '#9ca3af', padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}
            >
              Temizle
            </button>
            <button
              onClick={() => void fetchLogs(page)}
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', border: 'none', borderRadius: 8, color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              🔄 Yenile
            </button>
          </div>
        </div>
      </div>

      {/* Özet istatistikler */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Toplam', value: total, color: '#6366f1' },
          { label: 'Başarılı', value: logs.filter(l => l.status === 'success').length, color: '#10b981' },
          { label: 'Kısmi/Hata', value: logs.filter(l => l.status !== 'success').length, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} style={{
            background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 8,
            padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: '#64748b', fontSize: 12, alignSelf: 'center' }}>
          Sayfa {page} / {totalPages}
        </span>
      </div>

      {/* Tablo */}
      <div style={{ background: '#1e1e2e', border: '1px solid #2d2d3f', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            Yükleniyor…
          </div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
            Kayıt bulunamadı.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#13131f', color: '#64748b', textAlign: 'left' }}>
                {['#', 'Kural', 'Tetikleyici', 'Durum', 'Düğümler', 'Süre', 'Tarih', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #2d2d3f' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  style={{ borderBottom: '1px solid #1a1a2e', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#13131f')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace' }}>
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.ruleName}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                      padding: '2px 8px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace',
                    }}>
                      {log.triggerEvent}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <StatusBadge status={log.status} />
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', textAlign: 'center' }}>
                    <span style={{ color: log.executedNodeCount < log.totalNodeCount ? '#f59e0b' : '#10b981' }}>
                      {log.executedNodeCount}
                    </span>
                    <span style={{ color: '#475569' }}> / {log.totalNodeCount}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    {formatMs(log.durationMs)}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {formatDate(log.executedAt)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => setSelectedLog(log)}
                      style={{
                        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 6, color: '#818cf8', padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🔍 Detay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            style={{
              background: page <= 1 ? '#1e1e2e' : '#2d2d3f',
              border: '1px solid #374151', borderRadius: 6, color: page <= 1 ? '#374151' : '#e2e8f0',
              padding: '5px 12px', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer',
            }}
          >
            ‹ Önceki
          </button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 7) {
              const start = Math.max(1, Math.min(page - 3, totalPages - 6));
              p = start + i;
            }
            return (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                style={{
                  background: p === page ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1e1e2e',
                  border: `1px solid ${p === page ? '#4f46e5' : '#374151'}`,
                  borderRadius: 6, color: p === page ? '#fff' : '#9ca3af',
                  padding: '5px 10px', fontSize: 12, cursor: 'pointer', minWidth: 34,
                }}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            style={{
              background: page >= totalPages ? '#1e1e2e' : '#2d2d3f',
              border: '1px solid #374151', borderRadius: 6, color: page >= totalPages ? '#374151' : '#e2e8f0',
              padding: '5px 12px', fontSize: 12, cursor: page >= totalPages ? 'default' : 'pointer',
            }}
          >
            Sonraki ›
          </button>
        </div>
      )}

      {/* Trace modal */}
      {selectedLog && (
        <TracePanel log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
